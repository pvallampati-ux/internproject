import type { Contact } from "./contactTypes";
import { detectLifeStage } from "./lifeStages";
import { findSimilarProspects } from "./similarProspects";

// Proactive, synthesized insights over data already computed elsewhere in
// the app (life stage, similar prospects, commitments) — not a chatbot, no
// LLM call, nothing here waits to be asked. Deliberately does NOT duplicate
// what Home's other sections already show (overdue contacts, Why Now
// ranking, matched leads) — only patterns that need looking across the
// whole book to notice.
export interface CopilotInsight {
  id: string;
  icon: string;
  text: string;
  contactId?: string;
}

const STALLED_NO_NOTE_DAYS = 30;
const AGING_COMMITMENT_DAYS = 7;
const ACTIVE_PIPELINE_STAGES = ["Contacted", "Meeting", "Proposal"] as const;

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export function buildCopilotInsights(contacts: Contact[]): CopilotInsight[] {
  const insights: CopilotInsight[] = [];

  // Aging open commitments — things promised and not yet marked resolved.
  for (const contact of contacts) {
    for (const note of contact.noteLog) {
      if (!note.commitment || note.commitmentResolved || !note.id) continue;
      const age = daysSince(note.date);
      if (age < AGING_COMMITMENT_DAYS) continue;
      insights.push({
        id: `commitment_${note.id}`,
        icon: "⏳",
        text: `You promised ${contact.name} "${note.text}" ${age}d ago — still open.`,
        contactId: contact.id,
      });
    }
  }

  // Liquidity-stage contacts clustered by industry — a pattern only visible
  // looking across the whole book, not from any single contact's profile.
  const liquidityByIndustry = new Map<string, Contact[]>();
  for (const contact of contacts) {
    if (contact.stage === "Cold" || contact.stage === "Client") continue;
    if (detectLifeStage(contact) !== "Liquidity") continue;
    const industry = contact.industry?.trim();
    if (!industry) continue;
    const list = liquidityByIndustry.get(industry) ?? [];
    list.push(contact);
    liquidityByIndustry.set(industry, list);
  }
  for (const [industry, list] of liquidityByIndustry) {
    if (list.length < 2) continue;
    insights.push({
      id: `liquidity_${industry}`,
      icon: "💧",
      text: `${list.length} contacts in ${industry} are entering a Liquidity life stage: ${list
        .map((c) => c.name)
        .join(", ")}.`,
    });
  }

  // Resembles multiple existing clients — findSimilarProspects already
  // exists (tag/industry/life-stage/location/wealth-range overlap); this
  // just filters the candidate pool to Clients and surfaces it proactively
  // instead of waiting for someone to open the profile tab that shows it.
  const clients = contacts.filter((c) => c.stage === "Client");
  if (clients.length > 0) {
    for (const contact of contacts) {
      if (contact.stage === "Client" || contact.stage === "Cold") continue;
      const similarClients = findSimilarProspects(contact, clients, 10);
      if (similarClients.length >= 3) {
        insights.push({
          id: `similar_${contact.id}`,
          icon: "🔁",
          text: `${contact.name} resembles ${similarClients.length} of your existing clients.`,
          contactId: contact.id,
        });
      }
    }
  }

  // Stalled mid-pipeline — active stage, but no note logged in a while.
  for (const contact of contacts) {
    if (!(ACTIVE_PIPELINE_STAGES as readonly string[]).includes(contact.stage)) continue;
    const lastNote = [...contact.noteLog].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
    const daysSinceNote = lastNote ? daysSince(lastNote.date) : daysSince(contact.lastContactedAt);
    if (daysSinceNote < STALLED_NO_NOTE_DAYS) continue;
    insights.push({
      id: `stalled_${contact.id}`,
      icon: "🐌",
      text: `${contact.name} has been in ${contact.stage} for ${daysSinceNote}d with no new notes — worth a nudge or a status update.`,
      contactId: contact.id,
    });
  }

  return insights;
}

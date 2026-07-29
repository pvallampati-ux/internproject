import type { Contact } from "./contactTypes";
import type { CalendarEvent } from "./eventsStore";
import { detectLifeStage } from "./lifeStages";
import { assessRelationshipHealth } from "./relationshipHealth";
import { YOU_BANKER_ID, contactBankerId, bankerName } from "./bankers";

// Minimum substring length before two strings count as "the same
// organization" — short strings (e.g. "gala", "club") would otherwise match
// almost anything and produce noise.
const MIN_ORG_MATCH_LENGTH = 6;

function textMentions(haystack: string, needle: string): boolean {
  if (needle.trim().length < MIN_ORG_MATCH_LENGTH) return false;
  return haystack.toLowerCase().includes(needle.toLowerCase().trim());
}

// Common trailing event-type words/phrases — stripped off so what's left is
// just the organization/subject name, which is what a natural note is
// actually likely to mention ("she's a member of the Columbus Chamber of
// Commerce," not the full event title verbatim).
const EVENT_TYPE_SUFFIXES = [
  "networking night", "watch party", "open house", "tailgate", "gala",
  "summit", "conference", "fundraiser", "reception", "luncheon",
  "breakfast", "dinner", "mixer", "celebration", "ceremony", "meeting",
];

function stripEventTypeSuffix(text: string): string {
  const lower = text.toLowerCase();
  for (const suffix of EVENT_TYPE_SUFFIXES) {
    if (lower.endsWith(suffix)) {
      const stripped = text.slice(0, text.length - suffix.length).trim();
      if (stripped.length >= MIN_ORG_MATCH_LENGTH) return stripped;
    }
  }
  return text;
}

// Event titles in this app often follow a "Subject — Event Type" convention
// (e.g. "Columbus Chamber of Commerce — Networking Night"), same as most of
// the seeded sample events. Splitting on the dash gets the organization/
// subject name on its own, so it can be matched against a contact's notes
// even when the full title also contains generic event-type words. When
// there's no dash, strip a trailing event-type phrase directly instead
// (handles "Columbus Chamber of Commerce Networking Night" the same way),
// falling back to the whole title only if neither approach shortens it.
export function coreEventSubject(event: Pick<CalendarEvent, "title" | "description">): string {
  const beforeDash = event.title.split(/[-–—]/)[0]?.trim() ?? "";
  if (beforeDash.length >= MIN_ORG_MATCH_LENGTH && beforeDash !== event.title.trim()) {
    return beforeDash;
  }
  return stripEventTypeSuffix(event.title.trim());
}

export interface AttendeeMatch {
  contact: Contact;
  reasons: string[];
  // Set whenever the matched contact belongs to a colleague's book, not
  // yours — regardless of which banker's calendar you're currently
  // viewing, so a colleague's overlapping prospect is never hidden.
  bankerLabel?: string;
}

// Finds contacts who are plausibly connected to whatever's hosting this
// event — not a prediction of who will attend (nothing here knows a real
// attendee list), just a cross-reference: does the event's org/subject show
// up in a contact's board memberships, clubs, or their own note history?
// Keyword-matched, same honesty standard as the rest of the app's
// relationship matching — surfaced as "worth checking," not a fact.
// Deliberately searches every contact regardless of whose book it's in
// (the caller passes the full contact list, unscoped), so a colleague's
// prospect connected to the same event surfaces too.
export function findLikelyAttendees(
  event: Pick<CalendarEvent, "title" | "description">,
  contacts: Contact[],
  excludeIds: string[] = []
): AttendeeMatch[] {
  const subject = coreEventSubject(event);
  const eventText = `${event.title} ${event.description ?? ""}`;

  return contacts
    .filter((c) => !excludeIds.includes(c.id) && c.stage !== "Cold")
    .map((c) => {
      const reasons: string[] = [];

      for (const membership of c.boardMemberships ?? []) {
        if (textMentions(eventText, membership) || textMentions(membership, subject)) {
          reasons.push(`Board member: ${membership}`);
        }
      }
      for (const club of c.clubs ?? []) {
        if (textMentions(eventText, club) || textMentions(club, subject)) {
          reasons.push(`Club: ${club}`);
        }
      }
      for (const note of c.noteLog) {
        if (textMentions(note.text, subject)) {
          const snippet = note.text.length > 90 ? `${note.text.slice(0, 90)}...` : note.text;
          reasons.push(`Note mentions it: "${snippet}"`);
          break;
        }
      }

      const ownerBankerId = contactBankerId(c.bankerId);
      const bankerLabel = ownerBankerId !== YOU_BANKER_ID ? bankerName(c.bankerId) : undefined;

      return { contact: c, reasons, bankerLabel };
    })
    .filter((x) => x.reasons.length > 0);
}

export interface ColleagueCalendarOverlap {
  event: CalendarEvent;
  bankerLabel: string;
}

// Separate from findLikelyAttendees: this checks whether a *different*
// banker has their own, separately-added event for the same org/subject —
// e.g. two bankers both put a "Healthcare Leaders Summit" on their own
// calendars independently. Worth knowing before either of you shows up,
// since it means you're both circling the same room.
export function findColleagueCalendarOverlap(
  event: CalendarEvent,
  allEvents: CalendarEvent[]
): ColleagueCalendarOverlap[] {
  const subject = coreEventSubject(event);
  const ownerBankerId = contactBankerId(event.bankerId);

  return allEvents
    .filter((e) => e.id !== event.id && contactBankerId(e.bankerId) !== ownerBankerId)
    .filter((e) => {
      const otherSubject = coreEventSubject(e);
      return textMentions(subject, otherSubject) || textMentions(otherSubject, subject);
    })
    .map((e) => ({ event: e, bankerLabel: bankerName(e.bankerId) }));
}

// Rule-based invite suggestions for a calendar event — not an AI
// recommendation, a weighted score over industry/tag keyword matches on
// the event text, life stage, COI status, and relationship health. Every
// suggestion has a visible reason.
export interface InviteSuggestion {
  contact: Contact;
  reasons: string[];
}

export function suggestInvitees(
  event: Pick<CalendarEvent, "title" | "description">,
  contacts: Contact[],
  excludeIds: string[] = [],
  limit = 8
): InviteSuggestion[] {
  const text = `${event.title} ${event.description ?? ""}`.toLowerCase();

  return contacts
    .filter((c) => !excludeIds.includes(c.id) && c.stage !== "Cold")
    .map((c) => {
      let score = 0;
      const reasons: string[] = [];

      if (c.industry && text.includes(c.industry.toLowerCase())) {
        score += 5;
        reasons.push(`Industry match: ${c.industry}`);
      }

      for (const tag of c.tags) {
        if (text.includes(tag.toLowerCase())) {
          score += 3;
          reasons.push(`Tag match: ${tag}`);
        }
      }

      const stage = detectLifeStage(c);
      if (stage === "Liquidity" || stage === "Building Wealth") {
        score += 3;
        reasons.push(`${stage} life stage — good networking timing`);
      }

      if (c.isCOI) {
        score += 4;
        reasons.push("Center of Influence");
      }

      const health = assessRelationshipHealth(c);
      if (health.health === "Declining" || health.health === "At Risk") {
        score += 3;
        reasons.push(`Relationship ${health.health.toLowerCase()} — a low-key touchpoint could help`);
      }

      return { contact: c, score, reasons };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ contact, reasons }) => ({ contact, reasons }));
}

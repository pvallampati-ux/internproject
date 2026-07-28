import type { Contact } from "./contactTypes";

// Words too common to count as a meaningful recurring name — reuses the
// same crude proper-noun approach as warmIntros.ts, but scoped to a single
// contact's own note history over time instead of across contacts.
const STOPWORDS = new Set([
  "the", "this", "that", "these", "those", "sample", "demo", "contact",
  "edit", "replace", "real", "client", "also", "met", "she", "her", "his",
  "he", "they", "them", "existing", "referred", "sent", "follow-up",
  "followup", "follow", "meeting", "call", "email", "notes", "note",
  "discussed", "scheduled", "review", "reviewing", "ask", "about",
  "tagged", "prospecting", "event",
]);

// Auto-generated note text (see lib/eventsStore.ts's describeEventForNote)
// is synthetic boilerplate, not an organic mention — an event's own title
// words shouldn't be treated as a "recurring memory" just because a
// contact was tagged to a couple of events that both mention it.
const AUTO_NOTE_PREFIX = "Tagged to prospecting event:";

// Keyword -> normalized life-event label. A note containing one of these
// gets that label attached to every name mentioned in the same note.
const LIFE_EVENT_KEYWORDS: [string, string][] = [
  ["graduat", "graduation"],
  ["engage", "engagement"],
  ["wedding", "wedding"],
  ["married", "wedding"],
  ["marries", "wedding"],
  ["baby", "new baby"],
  ["born", "new baby"],
  ["pregnant", "new baby"],
  ["retire", "retirement"],
  ["promot", "promotion"],
  ["diagnos", "health"],
  ["surgery", "health"],
  ["passed away", "loss"],
  ["passing of", "loss"],
  ["accepted to", "milestone"],
  ["moving to", "move"],
  ["divorc", "divorce"],
];

function extractNames(text: string, exclude: Set<string>): string[] {
  const matches = text.match(/\b[A-Z][a-zA-Z'-]*(?:\s+[A-Z][a-zA-Z'-]*){0,2}\b/g) ?? [];
  return matches
    .map((m) => m.trim())
    .filter((m) => m.length > 2 && !STOPWORDS.has(m.toLowerCase()) && !exclude.has(m.toLowerCase()));
}

function detectEventLabels(text: string): string[] {
  const lower = text.toLowerCase();
  const labels = new Set<string>();
  for (const [kw, label] of LIFE_EVENT_KEYWORDS) {
    if (lower.includes(kw)) labels.add(label);
  }
  return [...labels];
}

export interface MemoryMention {
  date: string;
  eventLabels: string[];
  snippet: string;
}

export interface RelationshipMemory {
  name: string;
  mentions: MemoryMention[]; // sorted oldest -> newest
}

// Finds names that recur across a contact's note history (mentioned in 2+
// separate notes), so a name mentioned once in passing doesn't count. This
// is naive keyword/proper-noun matching, not real relationship
// understanding — it can't tell a daughter from a colleague, and it has no
// idea who "Emma" actually is. Treat every entry as a prompt to
// double-check before bringing it up, and use discretion with personal
// details (this reads years of private notes).
export function findRelationshipMemories(contact: Contact): RelationshipMemory[] {
  const exclude = new Set(
    (contact.name ? contact.name.split(/\s+/) : []).map((t) => t.toLowerCase())
  );
  exclude.add(contact.name.toLowerCase());

  const byName = new Map<string, MemoryMention[]>();

  for (const entry of contact.noteLog) {
    if (entry.text.startsWith(AUTO_NOTE_PREFIX)) continue;
    const names = new Set(extractNames(entry.text, exclude));
    const eventLabels = detectEventLabels(entry.text);
    for (const name of names) {
      const list = byName.get(name) ?? [];
      list.push({ date: entry.date, eventLabels, snippet: entry.text });
      byName.set(name, list);
    }
  }

  const memories: RelationshipMemory[] = [];
  for (const [name, mentions] of byName) {
    if (mentions.length < 2) continue; // only recurring names count as "memory"
    mentions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    memories.push({ name, mentions });
  }

  // Most recently mentioned first, so the freshest thread surfaces on top.
  memories.sort((a, b) => {
    const aLast = new Date(a.mentions[a.mentions.length - 1].date).getTime();
    const bLast = new Date(b.mentions[b.mentions.length - 1].date).getTime();
    return bLast - aLast;
  });

  return memories;
}

// A short prompt for the single most useful memory, if any — e.g. "Ask
// about Emma's engagement." Prefers a memory whose latest mention has a
// detected life-event label; falls back to a generic nudge otherwise.
export function suggestedMemoryPrompt(memories: RelationshipMemory[]): string | null {
  for (const memory of memories) {
    const latest = memory.mentions[memory.mentions.length - 1];
    if (latest.eventLabels.length > 0) {
      return `Ask about ${memory.name}'s ${latest.eventLabels[0]}.`;
    }
  }
  if (memories.length > 0) {
    return `You've mentioned ${memories[0].name} before — worth asking about them.`;
  }
  return null;
}

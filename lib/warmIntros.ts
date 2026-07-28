import { loadContacts, type Contact } from "./contacts";

// Words too common to count as a meaningful shared connection.
const STOPWORDS = new Set([
  "the", "this", "that", "these", "those", "sample", "demo", "contact",
  "edit", "replace", "real", "client", "also", "met", "she", "her", "his",
  "he", "they", "them", "existing", "referred", "sent", "follow-up",
  "followup", "follow", "meeting", "call", "email", "notes", "note",
  "discussed", "scheduled", "review", "reviewing",
]);

// Crude proper-noun extraction: sequences of capitalized words. No real NLP,
// just enough to catch things like "Ohio State University" or "Acme Corp"
// mentioned across two different contacts' notes.
function extractPhrases(text: string): string[] {
  const matches = text.match(/\b[A-Z][a-zA-Z&'.-]*(?:\s+[A-Z][a-zA-Z&'.-]*){0,3}\b/g) ?? [];
  return matches
    .map((m) => m.trim())
    .filter((m) => m.length > 2 && !STOPWORDS.has(m.toLowerCase()));
}

function keywordBag(contact: Contact): Set<string> {
  const bag = new Set<string>();
  for (const tag of contact.tags) bag.add(tag.toLowerCase());
  if (contact.company) bag.add(contact.company.toLowerCase());
  for (const entry of contact.noteLog) {
    for (const phrase of extractPhrases(entry.text)) bag.add(phrase.toLowerCase());
  }
  return bag;
}

export interface WarmIntroMatch {
  contactA: Contact;
  contactB: Contact;
  sharedTerms: string[];
}

// Naive keyword-overlap connection finder: flags two contacts as a possible
// warm intro if their tags/company/notes share a term. Expect false
// positives on generic terms — review before acting on a match.
export function findWarmIntros(): WarmIntroMatch[] {
  const contacts = loadContacts();
  const bags = contacts.map((c) => ({ contact: c, bag: keywordBag(c) }));
  const matches: WarmIntroMatch[] = [];

  for (let i = 0; i < bags.length; i++) {
    for (let j = i + 1; j < bags.length; j++) {
      const sharedTerms = [...bags[i].bag].filter((term) => bags[j].bag.has(term));
      if (sharedTerms.length > 0) {
        matches.push({ contactA: bags[i].contact, contactB: bags[j].contact, sharedTerms });
      }
    }
  }
  return matches;
}

import { loadContacts, type Contact } from "./contacts";
import type { SharedTerm, WarmIntroMatch } from "./warmIntroTypes";

export type { SharedTermSource, SharedTerm, WarmIntroMatch } from "./warmIntroTypes";
export { describeSharedTerms } from "./warmIntroTypes";

// Words too common to count as a meaningful shared connection — includes
// generic sentence-starters that get swept in only because they're
// capitalized at the start of a sentence, not because they're a real name.
const STOPWORDS = new Set([
  "the", "this", "that", "these", "those", "sample", "demo", "contact",
  "edit", "replace", "real", "client", "also", "met", "she", "her", "his",
  "he", "they", "them", "existing", "referred", "sent", "follow-up",
  "followup", "follow", "meeting", "call", "email", "notes", "note",
  "discussed", "scheduled", "review", "reviewing", "first", "second",
  "third", "fourth", "next", "then", "after", "before", "during",
  "additionally", "however", "meanwhile", "later", "recently", "today",
  "yesterday", "tomorrow", "overall", "currently", "its", "our", "your",
  "their", "we", "it", "if", "so", "but", "and", "or", "when", "while",
  "since", "because", "although", "though", "still", "just", "now",
  "here", "there", "very", "really", "has", "had", "will", "would",
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

// Keeps track of where each shared term came from (a tag, a company name,
// or note text) so the UI can describe the match in a way that actually
// makes sense — "both tagged retail" reads very differently from "both
// mention Ohio State University."
function collectTerms(contact: Contact): SharedTerm[] {
  const entries: SharedTerm[] = [];
  for (const tag of contact.tags) entries.push({ term: tag.toLowerCase(), source: "tag" });
  if (contact.company) entries.push({ term: contact.company.toLowerCase(), source: "company" });
  for (const entry of contact.noteLog) {
    for (const phrase of extractPhrases(entry.text)) {
      entries.push({ term: phrase.toLowerCase(), source: "note" });
    }
  }
  return entries;
}

// Naive keyword-overlap connection finder: flags two contacts as a possible
// warm intro if their tags/company/notes share a term. Expect false
// positives on generic terms — review before acting on a match.
export function findWarmIntros(): WarmIntroMatch[] {
  const contacts = loadContacts();
  const termLists = contacts.map((c) => ({ contact: c, terms: collectTerms(c) }));
  const matches: WarmIntroMatch[] = [];

  for (let i = 0; i < termLists.length; i++) {
    for (let j = i + 1; j < termLists.length; j++) {
      const termsB = termLists[j].terms;
      const seen = new Set<string>();
      const sharedTerms: SharedTerm[] = [];
      for (const a of termLists[i].terms) {
        if (seen.has(a.term)) continue;
        if (termsB.some((b) => b.term === a.term)) {
          seen.add(a.term);
          sharedTerms.push(a);
        }
      }
      if (sharedTerms.length > 0) {
        matches.push({ contactA: termLists[i].contact, contactB: termLists[j].contact, sharedTerms });
      }
    }
  }
  return matches;
}

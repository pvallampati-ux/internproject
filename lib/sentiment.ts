import type { NoteEntry } from "./contactTypes";

// Naive keyword-based sentiment, same pattern as everything else in this
// app — not real NLP/ML, just a fixed word list. Expect misses on sarcasm,
// negation ("not unhappy"), and anything outside the word list.
export type Sentiment = "Positive" | "Neutral" | "Negative";

const POSITIVE_WORDS = [
  "great", "excited", "interested", "positive", "happy", "pleased",
  "enthusiastic", "impressed", "eager", "optimistic", "thrilled",
  "delighted", "warm", "receptive", "engaged", "excellent", "glad",
];

const NEGATIVE_WORDS = [
  "concerned", "frustrated", "unhappy", "declined", "hesitant", "worried",
  "disappointed", "upset", "skeptical", "reluctant", "cold", "unresponsive",
  "annoyed", "cautious", "not interested", "went with a competitor",
];

export function assessNoteSentiment(text: string): Sentiment {
  const lower = text.toLowerCase();
  const posHits = POSITIVE_WORDS.filter((w) => lower.includes(w)).length;
  const negHits = NEGATIVE_WORDS.filter((w) => lower.includes(w)).length;
  if (posHits > negHits) return "Positive";
  if (negHits > posHits) return "Negative";
  return "Neutral";
}

// Majority sentiment over the most recent notes, so one old sour note
// doesn't permanently color an otherwise-warming relationship.
export function overallSentiment(notes: NoteEntry[]): Sentiment {
  const recent = notes.slice(-5);
  if (recent.length === 0) return "Neutral";
  let score = 0;
  for (const n of recent) {
    const s = assessNoteSentiment(n.text);
    if (s === "Positive") score += 1;
    if (s === "Negative") score -= 1;
  }
  if (score > 0) return "Positive";
  if (score < 0) return "Negative";
  return "Neutral";
}

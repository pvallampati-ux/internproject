import type { Contact } from "./contactTypes";
import type { Lead } from "./store";

export interface MeetingPrep {
  executiveSummary: string;
  likelyNeeds: string[];
  suggestedQuestions: {
    openEnded: string[];
    relationshipBuilding: string[];
    technical: string[];
  };
  risks: string[];
  citations: string[];
}

const SYSTEM_PROMPT = `You are helping a private bank relationship manager prepare for a client/prospect meeting.

Ground rules — follow these exactly:
- Base your answer ONLY on the internal notes provided and genuinely public information you can find via search about the named person/company. Never invent facts.
- If you don't have enough information for a section, say so plainly (e.g. "Not enough information available") instead of guessing specifics.
- Any financial figure (net worth, deal size, etc.) must be phrased as a rough, clearly-hedged range with explicit uncertainty language (e.g. "publicly estimated in the $X-$Y range, unverified"), never a single confident number.
- Under "risks", only include something if there is clear, specific public information supporting it. Do not speculate or infer controversy from silence, ambiguity, or the mere existence of competitors.
- Respond with ONLY valid JSON, no markdown fences, no commentary, matching exactly this shape:
{
  "executiveSummary": "string, 3-5 sentences",
  "likelyNeeds": ["string", ...],
  "suggestedQuestions": {
    "openEnded": ["string", ...],
    "relationshipBuilding": ["string", ...],
    "technical": ["string", ...]
  },
  "risks": ["string", ...]
}`;

function buildUserPrompt(contact: Contact, relevantLeads: Lead[]): string {
  const noteText = contact.noteLog.length
    ? contact.noteLog.map((n) => `- ${n.date.slice(0, 10)}: ${n.text}`).join("\n")
    : "(no notes logged yet)";

  const leadText = relevantLeads.length
    ? relevantLeads.map((l) => `- ${l.title} (${l.source}, ${l.publishedAt.slice(0, 10)})`).join("\n")
    : "(no matching recent news in this app)";

  return `Contact: ${contact.name}${contact.company ? ` — ${contact.company}` : ""}
Pipeline stage: ${contact.stage}
Tags: ${contact.tags.join(", ") || "(none)"}

Internal notes on file:
${noteText}

Recent news this app has already matched to them (last 90 days):
${leadText}

Prepare a meeting-prep brief for the relationship manager per the JSON schema in your instructions.`;
}

function stripJsonFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

export async function generateMeetingPrep(contact: Contact, relevantLeads: Lead[]): Promise<MeetingPrep> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "PERPLEXITY_API_KEY is not set. Copy .env.example to .env.local and add your key."
    );
  }
  const model = process.env.PERPLEXITY_MODEL || "sonar";

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(contact, relevantLeads) },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Perplexity API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";
  const citations: string[] = Array.isArray(data.citations) ? data.citations : [];

  let parsed: Omit<MeetingPrep, "citations">;
  try {
    parsed = JSON.parse(stripJsonFences(content));
  } catch {
    throw new Error(`Could not parse AI response as JSON. Raw response: ${content.slice(0, 500)}`);
  }

  return { ...parsed, citations };
}

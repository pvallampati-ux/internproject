import type { Contact } from "./contactTypes";
import type { Lead } from "./store";

export interface EmailTemplate {
  subject: string;
  body: string;
}

const SYSTEM_PROMPT = `You are helping a private bank relationship manager draft a short outreach email to a client or prospect.

Ground rules — follow these exactly:
- Base the email ONLY on the internal notes provided and the recent news items provided. Never invent facts, meetings, or shared history that isn't in the notes.
- Keep it short (under 150 words), warm, professional, and specific — reference something genuine from the notes or news if one exists, rather than generic filler.
- If there is a specific piece of relevant recent news, it's fine to use it as a natural conversation opener (e.g. "saw the news about..."), but do not state or imply anything about the recipient's finances, net worth, or personal life that isn't explicitly in the provided notes.
- End with a simple, low-pressure call to action (e.g. suggesting a call or coffee), not a hard sales pitch.
- Sign off as "[Your name]" — a placeholder, since you don't know the sender's actual name.
- Respond with ONLY valid JSON, no markdown fences, no commentary, matching exactly this shape:
{
  "subject": "string",
  "body": "string, plain text with \\n for line breaks"
}`;

function buildUserPrompt(contact: Contact, relevantLeads: Lead[]): string {
  const noteText = contact.noteLog.length
    ? contact.noteLog.map((n) => `- ${n.date.slice(0, 10)}: ${n.text}`).join("\n")
    : "(no notes logged yet)";

  const leadText = relevantLeads.length
    ? relevantLeads.map((l) => `- ${l.title} (${l.source}, ${l.publishedAt.slice(0, 10)})`).join("\n")
    : "(no matching recent news)";

  const daysSinceContact = Math.floor(
    (Date.now() - new Date(contact.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return `Recipient: ${contact.name}${contact.company ? ` — ${contact.company}` : ""}
Days since last contact: ${daysSinceContact}

Internal notes on file:
${noteText}

Relevant recent news:
${leadText}

Draft a short outreach email per the JSON schema in your instructions.`;
}

function stripJsonFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

export async function generateEmailTemplate(
  contact: Contact,
  relevantLeads: Lead[]
): Promise<EmailTemplate> {
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

  try {
    return JSON.parse(stripJsonFences(content));
  } catch {
    throw new Error(`Could not parse AI response as JSON. Raw response: ${content.slice(0, 500)}`);
  }
}

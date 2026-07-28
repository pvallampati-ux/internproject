import type { Contact } from "./contactTypes";

// Fixed-template intro-request draft — no LLM call, unlike the AI email
// generator in lib/emailTemplate.ts. Fills in names and the shared terms
// already surfaced by the warm-intro matcher; nothing invented.
export function buildIntroRequestMessage(
  connector: Contact,
  prospect: Contact,
  sharedTermsDescription: string
): { subject: string; body: string } {
  const connectorFirstName = connector.name.split(" ")[0];
  const subject = `Quick intro to ${prospect.name}?`;
  const body = `Hi ${connectorFirstName},

Hope you're well. I noticed you and ${prospect.name} ${sharedTermsDescription} — would you be open to making an introduction? Happy to share more context on why I'd like to connect, and no worries at all if it's not a good fit to ask.

Thanks!
[Your name]`;
  return { subject, body };
}

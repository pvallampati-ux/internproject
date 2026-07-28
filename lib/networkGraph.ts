import { loadContacts, type Contact } from "./contacts";
import { findWarmIntros } from "./warmIntros";

export interface NetworkEdge {
  fromId: string;
  toId: string;
  type: "referral" | "warm-intro";
  label?: string;
}

export interface NetworkGraphData {
  contacts: Contact[];
  edges: NetworkEdge[];
}

// Builds the graph shown on the COI / Network tab: referral edges (drawn
// when a contact's free-text `referredBy` matches another contact's name)
// plus warm-intro edges (the same keyword-overlap matches used elsewhere),
// deduped so a pair already linked by a referral doesn't also draw a
// separate warm-intro line.
export function buildNetworkGraph(): NetworkGraphData {
  const contacts = loadContacts();
  const edges: NetworkEdge[] = [];

  for (const contact of contacts) {
    if (!contact.referredBy) continue;
    const referrer = contacts.find(
      (c) => c.id !== contact.id && c.name.toLowerCase() === contact.referredBy!.toLowerCase()
    );
    if (referrer) {
      edges.push({ fromId: referrer.id, toId: contact.id, type: "referral" });
    }
  }

  for (const match of findWarmIntros()) {
    const alreadyLinked = edges.some(
      (e) =>
        (e.fromId === match.contactA.id && e.toId === match.contactB.id) ||
        (e.fromId === match.contactB.id && e.toId === match.contactA.id)
    );
    if (!alreadyLinked) {
      edges.push({
        fromId: match.contactA.id,
        toId: match.contactB.id,
        type: "warm-intro",
        label: match.sharedTerms[0],
      });
    }
  }

  return { contacts, edges };
}

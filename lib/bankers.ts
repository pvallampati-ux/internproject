// Pure types/constants only — no filesystem imports — so client components
// can import this without pulling Node's `fs` into the browser bundle.

export interface Banker {
  id: string;
  name: string;
}

// This app has no real login/accounts — "current banker" is just a local
// view-scope switcher (lib/userPrefs.ts), not authentication. A contact
// with no bankerId is treated as belonging to YOU_BANKER_ID, so existing
// data needs no migration. The roster below is a simulated team for
// demoing multi-banker views (self view vs. a colleague's book) and
// cross-book overlap detection — not real accounts.
export const YOU_BANKER_ID = "you";

// Pseudo-scope for viewing every banker's book combined — not a real
// banker, never assigned to a contact's bankerId.
export const ALL_BANKERS_ID = "all";

export const BANKERS: Banker[] = [
  { id: YOU_BANKER_ID, name: "You" },
  { id: "banker_jon_kokinchak", name: "Jon Kokinchak" },
  { id: "banker_renee_milyiori", name: "Renee Milyiori" },
  { id: "banker_patrick_hesketh", name: "Patrick Hesketh" },
];

export function contactBankerId(bankerId: string | undefined): string {
  return bankerId ?? YOU_BANKER_ID;
}

export function bankerName(bankerId: string | undefined): string {
  const id = contactBankerId(bankerId);
  return BANKERS.find((b) => b.id === id)?.name ?? "Unknown";
}

// Single-user, client-only preferences — no auth/server backing, just a
// display name and role label the user can set on the Settings page, and a
// running list of recently viewed contacts for the sidebar shortcuts. Not a
// permissions system; there's nothing here to secure, only to personalize.
const NAME_KEY = "userDisplayName";
const ROLE_KEY = "userRole";
const RECENT_KEY = "recentContactIds";
const RECENT_LIMIT = 5;

export function getDisplayName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NAME_KEY) ?? "";
}

export function setDisplayName(name: string): void {
  localStorage.setItem(NAME_KEY, name);
}

export function getRole(): string {
  if (typeof window === "undefined") return "Private Banker";
  return localStorage.getItem(ROLE_KEY) ?? "Private Banker";
}

export function setRole(role: string): void {
  localStorage.setItem(ROLE_KEY, role);
}

export function getRecentContactIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function pushRecentContactId(id: string): void {
  const existing = getRecentContactIds().filter((x) => x !== id);
  const next = [id, ...existing].slice(0, RECENT_LIMIT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

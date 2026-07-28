// Pure types/constants only — no filesystem imports — so client components
// can import this without pulling Node's `fs` into the browser bundle.

export type IntroStatus = "Suggested" | "Requested" | "Accepted" | "Completed";
export const INTRO_STATUSES: IntroStatus[] = ["Suggested", "Requested", "Accepted", "Completed"];

export interface IntroRequest {
  id: string;
  prospectId: string;
  connectorId: string;
  status: IntroStatus;
  updatedAt: string; // ISO
}

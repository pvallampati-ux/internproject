import { loadContacts } from "./contacts";
import { PIPELINE_STAGES, type PipelineStage } from "./contactTypes";

export interface AnalyticsSummary {
  totalContacts: number;
  countsByStage: Record<PipelineStage, number>;
  pipelineValueByStage: Record<PipelineStage, number>;
  totalEstimatedWealth: number;
  totalCapturedWalletShare: number;
  totalWealthGap: number;
  meetingsThisMonth: number;
  callsThisMonth: number;
  emailsThisMonth: number;
  needsOutreach: number;
  coolingRelationships: number;
  referredContacts: number;
  warmReferrals: number; // referredByContactId set — a reliable, structured referral link
  conversionRate: number | null; // Client / (Client + Cold); null if there's no data either way yet
  referralConversionRate: number | null; // of referred contacts, how many are now Client
  industryBreakdown: { industry: string; count: number }[];
  locationBreakdown: { location: string; count: number }[];
}

// All computed from data already on file — no historical snapshots, so
// this reflects current state only (e.g. "meetings this month" counts
// meeting-type notes logged this month, not a true scheduled-meeting log).
export function computeAnalytics(): AnalyticsSummary {
  const contacts = loadContacts();
  const now = new Date();

  const countsByStage = Object.fromEntries(
    PIPELINE_STAGES.map((s) => [s, contacts.filter((c) => c.stage === s).length])
  ) as Record<PipelineStage, number>;

  const pipelineValueByStage = Object.fromEntries(
    PIPELINE_STAGES.map((s) => [
      s,
      contacts.filter((c) => c.stage === s).reduce((sum, c) => sum + (c.estimatedValue ?? 0), 0),
    ])
  ) as Record<PipelineStage, number>;

  const totalEstimatedWealth = contacts.reduce((sum, c) => sum + (c.estimatedValue ?? 0), 0);
  const totalCapturedWalletShare = contacts.reduce((sum, c) => sum + (c.currentWalletShare ?? 0), 0);
  const totalWealthGap = contacts.reduce((sum, c) => {
    if (c.estimatedValue === undefined) return sum;
    return sum + Math.max(0, c.estimatedValue - (c.currentWalletShare ?? 0));
  }, 0);

  function notesThisMonthOfType(type: "meeting" | "call" | "email"): number {
    return contacts.reduce((count, c) => {
      return (
        count +
        c.noteLog.filter((n) => {
          if (n.type !== type) return false;
          const d = new Date(n.date);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }).length
      );
    }, 0);
  }
  const meetingsThisMonth = notesThisMonthOfType("meeting");
  const callsThisMonth = notesThisMonthOfType("call");
  const emailsThisMonth = notesThisMonthOfType("email");

  // Same "overdue for outreach" rule as the Home page / Daily Brief —
  // Cold contacts are off the active journey and don't count. Cooling
  // relationships (45+ days overdue) is the same longer-threshold split
  // used on the Engage page.
  const daysOverdueByContact = contacts
    .filter((c) => c.stage !== "Cold")
    .map((c) => {
      const daysSinceContact = Math.floor(
        (now.getTime() - new Date(c.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceContact - c.cadenceDays;
    });
  const needsOutreach = daysOverdueByContact.filter((d) => d >= 0).length;
  const coolingRelationships = daysOverdueByContact.filter((d) => d >= 45).length;

  const referredContacts = contacts.filter((c) => c.referredBy).length;
  const warmReferrals = contacts.filter((c) => c.referredByContactId).length;
  const referredContactsList = contacts.filter((c) => c.referredBy);
  const referralConversionRate =
    referredContactsList.length > 0
      ? referredContactsList.filter((c) => c.stage === "Client").length / referredContactsList.length
      : null;

  const clientCount = countsByStage.Client ?? 0;
  const coldCount = countsByStage.Cold ?? 0;
  const conversionRate = clientCount + coldCount > 0 ? clientCount / (clientCount + coldCount) : null;

  const industryCounts = new Map<string, number>();
  for (const c of contacts) {
    if (!c.industry) continue;
    industryCounts.set(c.industry, (industryCounts.get(c.industry) ?? 0) + 1);
  }
  const industryBreakdown = [...industryCounts.entries()]
    .map(([industry, count]) => ({ industry, count }))
    .sort((a, b) => b.count - a.count);

  const locationCounts = new Map<string, number>();
  for (const c of contacts) {
    if (!c.location) continue;
    locationCounts.set(c.location, (locationCounts.get(c.location) ?? 0) + 1);
  }
  const locationBreakdown = [...locationCounts.entries()]
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalContacts: contacts.length,
    countsByStage,
    pipelineValueByStage,
    totalEstimatedWealth,
    totalCapturedWalletShare,
    totalWealthGap,
    meetingsThisMonth,
    callsThisMonth,
    emailsThisMonth,
    needsOutreach,
    coolingRelationships,
    referredContacts,
    warmReferrals,
    conversionRate,
    referralConversionRate,
    industryBreakdown,
    locationBreakdown,
  };
}

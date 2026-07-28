import { loadContacts } from "./contacts";
import { loadTasks } from "./tasksStore";
import { PIPELINE_STAGES, type PipelineStage } from "./contactTypes";

export interface AnalyticsSummary {
  totalContacts: number;
  countsByStage: Record<PipelineStage, number>;
  pipelineValueByStage: Record<PipelineStage, number>;
  totalEstimatedWealth: number;
  totalCapturedWalletShare: number;
  totalWealthGap: number;
  meetingsThisMonth: number;
  openTasks: number;
  overdueTasks: number;
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
  const tasks = loadTasks();
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

  const meetingsThisMonth = contacts.reduce((count, c) => {
    return (
      count +
      c.noteLog.filter((n) => {
        if (n.type !== "meeting") return false;
        const d = new Date(n.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }).length
    );
  }, 0);

  const openTasks = tasks.filter((t) => !t.done).length;
  const overdueTasks = tasks.filter((t) => !t.done && t.dueDate && new Date(t.dueDate) < now).length;

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
    openTasks,
    overdueTasks,
    referredContacts,
    warmReferrals,
    conversionRate,
    referralConversionRate,
    industryBreakdown,
    locationBreakdown,
  };
}

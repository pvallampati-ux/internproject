import { loadContacts, type Contact } from "./contacts";
import { loadLeads, type Lead } from "./store";
import { findWarmIntros, type WarmIntroMatch } from "./warmIntros";
import { matchLeadsToContact } from "./relevantLeads";
import { COOLING_THRESHOLD_DAYS } from "./config";

const MARKET_EVENT_LOOKBACK_DAYS = 14;
const WARM_INTRO_TEASER_LIMIT = 3;

export interface OverdueContact {
  contact: Contact;
  daysOverdue: number;
}

export interface MarketEventMatch {
  lead: Lead;
  affectedContacts: Contact[];
}

export interface DailyBrief {
  meetingsToday: Contact[];
  overdueContacts: OverdueContact[];
  followUps: Lead[];
  coolingLeads: Lead[];
  marketEvents: MarketEventMatch[];
  warmIntros: WarmIntroMatch[];
}

function isToday(isoDate: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return isoDate.slice(0, 10) === today;
}

export function computeDailyBrief(): DailyBrief {
  const contacts = loadContacts();
  const leads = loadLeads();
  const now = Date.now();

  const meetingsToday = contacts.filter((c) => c.nextMeetingDate && isToday(c.nextMeetingDate));

  // Cold contacts are deliberately off the active journey — don't nag to
  // reach out to someone who's gone quiet or isn't converting.
  const overdueContacts: OverdueContact[] = contacts
    .filter((c) => c.stage !== "Cold")
    .map((contact) => {
      const daysSinceContact = Math.floor(
        (now - new Date(contact.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      return { contact, daysOverdue: daysSinceContact - contact.cadenceDays };
    })
    .filter((x) => x.daysOverdue >= 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  // No note yet at all — needs a first touch.
  const followUps = leads.filter((l) => l.saved && !l.note);

  // Has a note, but it's gone stale — needs a follow-up touch.
  const coolingCutoff = now - COOLING_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  const coolingLeads = leads.filter(
    (l) => l.saved && l.note && l.noteUpdatedAt && new Date(l.noteUpdatedAt).getTime() < coolingCutoff
  );

  const cutoff = now - MARKET_EVENT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const recentLeads = leads.filter((l) => new Date(l.publishedAt).getTime() >= cutoff);
  const marketEvents: MarketEventMatch[] = recentLeads
    .map((lead) => ({
      lead,
      affectedContacts: contacts.filter((c) => matchLeadsToContact(c, [lead]).length > 0),
    }))
    .filter((match) => match.affectedContacts.length > 0);

  const warmIntros = findWarmIntros().slice(0, WARM_INTRO_TEASER_LIMIT);

  return { meetingsToday, overdueContacts, followUps, coolingLeads, marketEvents, warmIntros };
}

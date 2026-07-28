import { loadContacts, type Contact } from "./contacts";
import { loadLeads, type Lead } from "./store";
import { findWarmIntros, type WarmIntroMatch } from "./warmIntros";
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
  overdueContacts: OverdueContact[];
  followUps: Lead[];
  coolingLeads: Lead[];
  marketEvents: MarketEventMatch[];
  warmIntros: WarmIntroMatch[];
}

export function computeDailyBrief(): DailyBrief {
  const contacts = loadContacts();
  const leads = loadLeads();
  const now = Date.now();

  const overdueContacts: OverdueContact[] = contacts
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
  const marketEvents: MarketEventMatch[] = leads
    .filter((l) => new Date(l.publishedAt).getTime() >= cutoff)
    .map((lead) => {
      const haystack = `${lead.title} ${lead.snippet}`.toLowerCase();
      const affectedContacts = contacts.filter((c) =>
        c.tags.some((tag) => haystack.includes(tag.toLowerCase()))
      );
      return { lead, affectedContacts };
    })
    .filter((match) => match.affectedContacts.length > 0);

  const warmIntros = findWarmIntros().slice(0, WARM_INTRO_TEASER_LIMIT);

  return { overdueContacts, followUps, coolingLeads, marketEvents, warmIntros };
}

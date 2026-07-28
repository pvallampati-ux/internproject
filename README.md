# Private Client Prospecting Hub

A Columbus / Central Ohio prospecting platform organized into six modules,
navigable via the top nav bar:

| Tab | Route | What it does |
|---|---|---|
| Prospect Discovery | `/` | News-based lead sourcing, filtering, and scoring |
| Intelligence | `/intelligence` | Wealth/liquidity events, warm-intro relationship mapping, regional map |
| Engagement | `/engagement` | Meeting prep (+ optional AI Meeting Prep), outreach queue, follow-ups/cooling leads |
| Pipeline | `/pipeline` | Prospect → Client Kanban/funnel, deal value, referral source |
| Market Insights | `/market-insights` | **Not built yet** — stub page, see below |
| Analytics | `/analytics` | **Not built yet** — stub page, see below |

This is a personal prototype built on free, public data sources. It is not
connected to any JPMorgan internal system, licensed data feed, or CRM —
treat any real prospect data you load into it according to your firm's
data-handling and compliance policies before using it beyond a personal demo.
It's also worth being direct about scope: nothing here is AI/ML-driven —
"sourcing, filtering, and ranking" is keyword/rule-based, and "relationship
mapping" is regex-based proper-noun overlap, not a real graph or NLP model.
See "Known limitations" below for the full list of what's simulated vs. real.

## How it works

1. `lib/sources.ts` builds a handful of Google News RSS queries (free, no API
   key) scoped to the region and each event theme.
2. `lib/refresh.ts` fetches those feeds, runs each headline through a
   keyword classifier (`lib/classify.ts`), drops anything that doesn't match
   the region or a category, and stores the rest in `data/leads.json`
   (`lib/store.ts`), de-duplicated by link. For each new lead it also runs a
   follow-up Google News search on the headline and attaches up to 3 related
   articles ("More coverage" on the lead card) so you can cross-reference
   before acting — capped at 20 lookups per refresh so one run doesn't turn
   into dozens of extra requests; anything past the cap backfills next run.
3. The dashboard (`app/page.tsx`) reads leads via `/api/leads` and lets you
   filter by category, date range, saved-only, and free-text search. The
   "Refresh feeds" button calls `/api/refresh` to pull new stories on demand.
4. Each lead can be starred (saved) and given a short freeform note, stored
   directly on the lead in `data/leads.json` (`PATCH /api/leads/[id]`).
5. `data/contacts.json` holds the contacts/prospects you're tracking, each
   with a pipeline stage (Prospect → Contacted → Meeting → Proposal → Client),
   a contact cadence (e.g. "every 30 days"), keyword tags used to match them
   against incoming leads, and a timestamped note log.
6. The **Pipeline** page (`/pipeline`) is the client hub: a connected funnel
   + Kanban board by stage, add/edit contacts (including estimated deal
   value and referral source), log notes, mark contacted, and see possible
   warm intros. A separate **Cold** section holds contacts who've gone quiet.
7. The **Intelligence** page (`/intelligence`) surfaces liquidity-event
   leads, the warm-intro finder, and a static regional map plotting leads by
   matched town — no live/interactive map, no map API, no cost.
8. The **Engagement** page (`/engagement`) has a meeting-prep panel (pick a
   contact, see their full note history plus any leads matching their tags),
   an outreach queue of overdue contacts, and follow-ups/cooling leads.
9. `lib/dailyBrief.ts` combines everything into a "Today's Brief": contacts
   overdue for outreach, saved leads with no note yet ("follow up on"),
   saved leads with a stale note ("cooling"), recent leads matching a
   contact's tags ("market events affecting your clients"), and possible
   warm intros. It pops up once per day (tracked via `localStorage`, so it's
   per-browser) and can be reopened anytime with the "Today's Brief" button.

No sample/demo data ships in this repo — `data/leads.json` and
`data/contacts.json` both start empty and are git-ignored (local-only).
Every tab and the daily brief show nothing until you run a real refresh
(`npm run refresh` or the "Refresh feeds" button) and add real contacts on
the Pipeline page.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Click **Refresh feeds** to pull live news, or
seed data with:

```bash
npm run refresh
```

> **Note:** live fetching requires outbound network access to
> `news.google.com`. If you're running this inside a sandboxed Claude Code
> environment with a restrictive network policy, refresh will fail there —
> run it locally or in a deployment environment (e.g. Vercel) with normal
> internet access instead.

`data/leads.json` is git-ignored — your fetched leads live only on your own
machine and are never pushed to GitHub. That also means a fresh clone (or
switching machines) starts with zero leads until you run a refresh there too.

## Scheduling automatic updates

`npm run refresh` runs the fetch pipeline standalone (no dev server needed),
so you can put it on a cron job or a GitHub Actions scheduled workflow, e.g.:

```cron
0 7,13,18 * * * cd /path/to/repo && npm run refresh
```

Since leads are stored in `data/leads.json`, a scheduled job on your own
machine (or CI) will keep that file updated; the dashboard just reads
whatever is currently in the file.

## Tuning what counts as a lead

Edit `lib/config.ts`:

- `REGION_TERMS` — city/suburb names used to decide whether a story is "in
  region." Widen this to cover more of Ohio, or narrow it to just Columbus
  proper.
- `CATEGORY_KEYWORDS` — the keyword lists that drive classification into the
  four buckets. Add terms as you notice false negatives/positives.

## Managing contacts / the client pipeline

Use the **Pipeline** page (`/pipeline`) to add contacts, change their stage,
mark them contacted, and log notes — no manual JSON editing needed day to
day. Under the hood it's still a flat file, `data/contacts.json`:

```json
{
  "id": "contact_5",
  "name": "Real Client Name",
  "company": "Their Company",
  "tags": ["their company name", "an alias it might be called in the news"],
  "lastContactedAt": "2026-07-01T00:00:00.000Z",
  "cadenceDays": 30,
  "stage": "Prospect",
  "noteLog": [{ "date": "2026-07-01T00:00:00.000Z", "text": "Met at a Chamber event." }]
}
```

`tags` are matched as case-insensitive substrings against each lead's title +
snippet for the daily brief's "market events" section — keep them specific
enough to avoid false matches (e.g. a tag like "logistics" alone will match
every logistics story, not just ones about that client).

**`data/contacts.json` is git-ignored on purpose** — it holds real names
and meeting notes once you start using this for real. `data/contacts.sample.json`
is tracked and ships in the repo, but it's an empty array (`[]`) on purpose —
no placeholder people. It exists only as the seed template `data/contacts.json`
is created from on first run (still empty), so there's nowhere for fake data
to sneak back in.

### Adding a lead straight into the pipeline

Every lead card on the main dashboard has a **+ Add as contact** link that
creates a new `Prospect`-stage contact seeded with a note pointing back to
the source article — the "prospect → client" loop in one click.

### Pipeline stages

The Pipeline page shows the forward journey — `Prospect → Contacted →
Meeting → Proposal → Client` — as a connected funnel (counts + % of active
pipeline) above a Kanban board. A separate **Cold / Not Converting** stage
exists outside that journey for contacts who've gone quiet or aren't going
to convert; it's rendered in its own muted section below the board rather
than as a further step, so it doesn't read as "progress." Move a contact
back to an active stage anytime via the same dropdown if things change.

### Warm intro finder

`lib/warmIntros.ts` scans every pair of contacts' tags/company/note text for
shared terms (crude proper-noun extraction — sequences of capitalized
words, filtered against a small stopword list) and flags a possible
connection when two contacts mention the same thing (e.g. both notes
mention "Ohio State University"). This is naive keyword overlap, not real
NLP — expect false positives on generic terms, and treat every match as a
prompt to double-check, not a confirmed connection. Results show up on the
Pipeline page and as a short teaser in the daily brief.

### Cooling leads

A saved lead whose note hasn't been touched in `COOLING_THRESHOLD_DAYS`
(`lib/config.ts`, default 14 days) shows up in the daily brief as
"cooling — gone quiet," distinct from "follow up on" (which means no note
has ever been added).

## AI Meeting Prep (Engagement tab)

This is the one feature in the app that actually calls an LLM — everything
else is rule-based/keyword matching. Click **Generate** under "AI Meeting
Prep" for a selected contact and it produces an Executive Summary, Likely
Needs, Suggested Questions (open-ended / relationship-building / technical),
and Risks, generated by Perplexity's API (`lib/meetingPrep.ts`,
`app/api/meeting-prep/route.ts`).

**Setup (required, and this one costs money):**

```bash
cp .env.example .env.local
```

Then add your own key:

```
PERPLEXITY_API_KEY=your-key-here
```

Get a key at https://www.perplexity.ai/settings/api. Unlike the rest of this
app, this is a paid API — each "Generate" click is a real charge against
your account. `.env.local` is git-ignored and never committed.

**How it's grounded, and why that matters here:** the prompt instructs the
model to work only from (a) your notes on that contact and (b) leads this
app already matched to them — plus genuinely public search results
Perplexity's `sonar` model finds for the named person/company. It's
explicitly told to never invent facts, to hedge any financial figure as an
unverified range rather than a confident number, and to only list a "risk"
if there's clear public support for it — not to speculate from silence. The
UI still shows every result behind a visible "AI-generated inference, not
verified" warning. Treat this as a research starting point for prepping a
meeting you're already having, not a source of truth — verify anything
material (especially wealth estimates) before repeating it to a client or
writing it into a file.

## Extending data sources

`lib/sources.ts` returns an array of `{ id, label, url, kind }` sources fed
into `rss-parser`. To add another RSS source (a local business journal, PR
Newswire, a specific company's press page, etc.), add another entry there —
no other code needs to change. SEC EDGAR's full-text search API
(`https://www.sec.gov/edgar/search/`) is a reasonable next source to add for
catching Form D private placements and 8-K/13D filings, but it returns JSON
in a different shape than RSS, so it needs its own fetch/parse function
rather than reusing the RSS path.

## The regional map (Intelligence tab)

`/intelligence` plots leads from the last 90 days using approximate
town-center coordinates for each suburb in `REGION_TERMS` (`lib/geo.ts`).
It's a static SVG scatter plot, not a real interactive/tile-based map — no
external map provider, no API key, no cost, works fully offline. Leads that
only matched a generic term ("Central Ohio," a county name) can't be
pinpointed to a town and are called out as unmapped rather than guessed at.

## Deal value and referral source (Pipeline tab)

Contacts optionally carry `estimatedValue` (a number, e.g. estimated
investable assets) and `referredBy` (free text). Set them when adding a
contact or editing one; the Pipeline funnel header rolls them up into a
per-stage total and an "Active pipeline value" figure. These two fields are
also what a future Analytics module would report on — see below.

## Market Insights and Analytics (not built)

`/market-insights` and `/analytics` are intentionally stub pages, not fake
dashboards. Market Insights would need an industry/sector dimension added
to leads and contacts (nothing currently classifies by industry, only by
event type). Analytics would need historical snapshots — everything today
reflects only current state, nothing tracks change over time — plus real
usage data to be meaningful. Both are flagged honestly in-app rather than
populated with placeholder numbers.

## Known limitations (prototype scope)

- Classification is keyword-based, not NLP — expect some false positives
  (e.g. a story that merely mentions "CEO" without an actual change) and
  false negatives for oddly-worded headlines.
- No authentication — don't deploy this publicly without adding some, since
  in this project's default config it's just reading public news anyway, but
  you may add proprietary sources later.
- Storage is a flat JSON file, fine for personal/small-team use; move to a
  real database if this grows beyond a few thousand leads or gets concurrent
  writers.
- The daily brief's "market events affecting your clients" match is also
  simple substring matching on `data/contacts.json` tags — same
  false-positive/negative caveats as the lead classifier.
- The "shown once per day" behavior for the brief pop-up is tracked in
  browser `localStorage`, so it resets if you clear browser data or open the
  dashboard in a different browser/device.
- The warm intro finder and map are both intentionally low-tech (regex/
  substring based, static coordinates) rather than real NLP or a mapping
  API — keeps the project free and self-contained, at the cost of precision.
  Treat both as a starting point to investigate, not a verified result.
- AI Meeting Prep depends on an LLM's search and reasoning, which can still
  miss context, misattribute information, or occasionally fail to return
  valid JSON (the API surfaces a clear error rather than showing garbage in
  that case). It's the one feature in this app that isn't free and isn't
  deterministic — everything else you can trace back to an exact keyword
  match; this one you can't.

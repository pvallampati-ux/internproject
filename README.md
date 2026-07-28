# Private Client Prospecting Hub

A Columbus / Central Ohio prospecting dashboard that tracks public news for
four signal types: **liquidity events**, **executive changes**,
**M&A / buyouts**, and **new firm / expansion** announcements.

This is a personal prototype built on free, public data sources. It is not
connected to any JPMorgan internal system, licensed data feed, or CRM —
treat any real prospect data you load into it according to your firm's
data-handling and compliance policies before using it beyond a personal demo.

## How it works

1. `lib/sources.ts` builds a handful of Google News RSS queries (free, no API
   key) scoped to the region and each event theme.
2. `lib/refresh.ts` fetches those feeds, runs each headline through a
   keyword classifier (`lib/classify.ts`), drops anything that doesn't match
   the region or a category, and stores the rest in `data/leads.json`
   (`lib/store.ts`), de-duplicated by link.
3. The dashboard (`app/page.tsx`) reads leads via `/api/leads` and lets you
   filter by category, date range, saved-only, and free-text search. The
   "Refresh feeds" button calls `/api/refresh` to pull new stories on demand.
4. Each lead can be starred (saved) and given a short freeform note, stored
   directly on the lead in `data/leads.json` (`PATCH /api/leads/[id]`).
5. `data/contacts.json` holds a small list of contacts you're tracking, each
   with a contact cadence (e.g. "every 30 days") and a list of keyword tags
   used to match them against incoming leads.
6. `lib/dailyBrief.ts` combines all of the above into a "Today's Brief":
   contacts overdue for outreach, saved leads with no note yet ("follow up
   on"), and recent leads that match a contact's tags ("market events
   affecting your clients"). It pops up once per day (tracked via
   `localStorage`, so it's per-browser) and can be reopened anytime with the
   "Today's Brief" button in the header.

`data/leads.json` ships with a handful of sample leads, and `data/contacts.json`
with a handful of sample contacts, so the dashboard and daily brief have
something to show before you run a real refresh or add real contacts.

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

## Managing contacts for the daily brief

Edit `data/contacts.json` directly (it's a flat array, no UI for this yet).
Each contact looks like:

```json
{
  "id": "contact_5",
  "name": "Real Client Name",
  "company": "Their Company",
  "tags": ["their company name", "an alias it might be called in the news"],
  "lastContactedAt": "2026-07-01T00:00:00.000Z",
  "cadenceDays": 30,
  "notes": "optional freeform notes"
}
```

`tags` are matched as case-insensitive substrings against each lead's title +
snippet — keep them specific enough to avoid false matches (e.g. a tag like
"logistics" alone will match every logistics story, not just ones about that
client). The sample contacts in this file are placeholders; replace them with
real names locally. **Don't commit real client names/details to a shared
GitHub repo** — treat `data/contacts.json` as local-only once you put real
people in it (add it to `.gitignore` if this repo is ever shared).

## Extending data sources

`lib/sources.ts` returns an array of `{ id, label, url, kind }` sources fed
into `rss-parser`. To add another RSS source (a local business journal, PR
Newswire, a specific company's press page, etc.), add another entry there —
no other code needs to change. SEC EDGAR's full-text search API
(`https://www.sec.gov/edgar/search/`) is a reasonable next source to add for
catching Form D private placements and 8-K/13D filings, but it returns JSON
in a different shape than RSS, so it needs its own fetch/parse function
rather than reusing the RSS path.

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

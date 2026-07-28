# Private Client Prospecting Hub

A Columbus / Central Ohio prospecting platform organized into eight modules,
navigable via the top nav bar:

| Tab | Route | What it does |
|---|---|---|
| Home | `/` | Dashboard: today's meetings (AI Meeting Prep as a popup), and a persistent list of clients/prospects needing contact |
| Prospect Discovery | `/discovery` | News-based lead sourcing, filtering, and scoring |
| Intelligence | `/intelligence` | Wealth/liquidity events, warm-intro relationship mapping, regional map, and an industry-focus filter (Healthcare / Business Owners / anything you add) for Market Insights |
| Engagement | `/engagement` | Meeting prep (+ optional AI Meeting Prep), outreach queue, follow-ups/cooling leads |
| Pipeline | `/pipeline` | Prospect → Client Kanban/funnel (drag-and-drop or dropdown), deal value, referral source |
| COI / Network | `/coi` | Centers of Influence and a visual graph of referral/warm-intro connections |
| Calendar | `/calendar` | Prospecting events (tailgates, networking nights) — list or monthly grid view, search, CSV schedule upload, tag prospects |
| Analytics | `/analytics` | **Not built yet** — stub page, see below |

Every contact also has a profile page at `/contacts/[id]` — click any name in
Pipeline or the daily brief to open it. That's the CRM-360 view: editable
details, cadence/touchpoints, email actions, conversation log, and AI
Meeting Prep in one place.

The nav bar itself has a **contact search** (`components/GlobalSearch.tsx`)
on every page — type a name, company, or tag and jump straight to that
person's profile. This is separate from the headline search on Discovery
and the event search on Calendar, which search leads/events rather than
contacts.

### Home page (`/`)

The landing page is a dashboard, not the news feed (that moved to
`/discovery`). Two always-visible sections, both sourced from
`/api/daily-brief`:

- **Meetings today** — anyone with a `nextMeetingDate` of today. "Open AI
  Meeting Prep" opens the prep panel as a popup right on this page, instead
  of navigating to their profile first.
- **Clients & prospects needing contact** — everyone overdue relative to
  their own cadence, with quick Mark Contacted / email actions. This is
  permanent, not a once-a-day dismissable notice — it stays visible every
  time you load the page.

The "Today's Brief" popup (`components/DailyBrief.tsx`) still auto-opens
once per day here (tracked via `localStorage`, same as before), but now
only for the softer, easier-to-miss nudges — market events affecting your
clients, saved leads to follow up on or that have gone cooling, and
possible warm intros. Meetings and overdue outreach moved to permanent
sections above so they're not something you can dismiss and lose track of.

Market Insights started as its own tab but got folded into Intelligence as a
"Focus" filter instead — same underlying data/routes, one less nav item.

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
3. The news feed (`app/discovery/page.tsx`) reads leads via `/api/leads` and
   lets you filter by category, date range, saved-only, and free-text
   search. The "Refresh feeds" button calls `/api/refresh` to pull new
   stories on demand.
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
   Each card shows just name, company, and a ⚑ flag if a touchpoint is due
   by default — hover a card to reveal everything else (stage, tags, deal
   value, relationship health, notes) as an overlay, so a full board of
   contacts doesn't turn into a wall of scrolling. See "Pipeline board: hover
   for detail" below.
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
   warm intros. The Home page (`/`) shows meetings-today and overdue-outreach
   permanently and surfaces the rest of this as a once-a-day popup (tracked
   via `localStorage`, so it's per-browser) — see "Home page" above.

## Pipeline board: hover for detail

`components/ContactCard.tsx` shows a compact default (name, company, and a
⚑ touchpoint-needed flag if the contact is overdue relative to their own
cadence) so a full board of contacts is scannable without scrolling through
every field on every card. Hovering a card reveals everything else —
relationship health, life stage, pipeline stage dropdown, tags, deal value
and wealth gap, referral source, last-contact info, Mark Contacted, and the
note log — as an overlay positioned below the card. It's a CSS overlay
(`position: absolute`), not a layout push, so hovering doesn't shift
neighboring cards around; it disappears the moment your cursor leaves.

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

Open http://localhost:3000 — that's the Home dashboard. Go to
http://localhost:3000/discovery and click **Refresh feeds** to pull live
news, or seed data from the command line with:

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
- `CATEGORY_KEYWORDS` — the keyword lists that drive classification into
  each category. Add terms as you notice false negatives/positives.
- `CATEGORY_GROUPS` — which of Business / Personal / Corporate / Market
  Signal each category belongs to (drives badge color and the grouped
  filter chips).

## Wealth Event Detection

The classifier (`lib/classify.ts`) runs continuously as part of every
refresh, scanning each headline/snippet for 17 categories grouped into:

- **Business** — IPO, M&A, PE Investment, Founder Exit, Executive Hiring,
  Stock Sale
- **Personal** — Foundation Created, Divorce, Estate Filing, Real Estate
  Purchase, Charitable Donation
- **Corporate** — Earnings, Funding, Debt Issuance, Spin-off, Executive
  Compensation Change
- **Market Signal** — New Firm / Expansion (a company-level signal, not an
  individual wealth trigger, kept separate from the three groups above)

Each category has its own Google News RSS query (`lib/sources.ts`), scoped
to the region, so this is still free/keyword-based — no new API cost. A
lead can match multiple categories (e.g. a founder sells a stake AND a new
CEO is named in the same story). The Intelligence page's "Wealth Events"
section shows anything matching Business, Personal, or Corporate; the
FilterBar groups all 17 categories under their group heading. As with the
warm-intro finder, this is naive keyword matching, not NLP — false
positives happen, and the Personal group in particular (divorce, estate
filings) should be treated as a research prompt to verify, handled with
discretion, not a confirmed fact to act on directly.

## Managing contacts / the client pipeline

Use the **Pipeline** page (`/pipeline`) to add contacts, change their stage,
mark them contacted, and log notes — no manual JSON editing needed day to
day. Under the hood it's still a flat file, `data/contacts.json`:

```json
{
  "id": "contact_5",
  "name": "Real Client Name",
  "company": "Their Company",
  "email": "optional@example.com",
  "tags": ["their company name", "an alias it might be called in the news"],
  "lastContactedAt": "2026-07-01T00:00:00.000Z",
  "cadenceDays": 10,
  "stage": "Prospect",
  "noteLog": [{ "date": "2026-07-01T00:00:00.000Z", "text": "Met at a Chamber event." }],
  "estimatedValue": 2500000,
  "referredBy": "Columbus Chamber"
}
```

New contacts default to a 10-day cadence (prospects need more frequent
early touches than established clients) — change `cadenceDays` per contact
anytime on the Pipeline page or their profile page.

`tags` are matched as case-insensitive substrings against each lead's title +
snippet for the daily brief's "market events" section — keep them specific
enough to avoid false matches (e.g. a tag like "logistics" alone will match
every logistics story, not just ones about that client).

**`data/contacts.json` is git-ignored on purpose** — it holds real names
and meeting notes once you start using this for real. `data/contacts.sample.json`
is tracked and ships in the repo as the seed template `data/contacts.json`
is created from on first run.

It currently ships with **9 demo contacts** spanning every pipeline stage —
so the funnel, touchpoints, deal value, network graph, and daily-brief
"people to call" logic all have something to show before you've added
anyone real. Most are clearly fake: names like "Jane Whitfield," emails on
`@example.com`, and every note explicitly says "Demo contact." One
(`contact_demo_9`) is deliberately **your own real name and email** (from
this session's context) with a meeting scheduled today — that one's meant
for you to actually click "Generate email" / "Open in email client to
send" and "AI Meeting Prep" against without emailing a stranger while
testing. There are no fake **news articles** anywhere (`data/leads.json`
and `data/market-insights.json` still start empty and only ever hold real
fetched results) — only the contacts/pipeline/calendar side has placeholder
data, and only because it was explicitly asked for to see things working
end to end. Delete or edit `data/contacts.json` (or reset it to `[]`,
delete it, and it reseeds from the sample) once you're ready to replace the
demo contacts with real ones.

### Adding a lead straight into the pipeline

Every lead card on the main dashboard has a **+ Add as contact** link. It
prompts you for the actual person's name (a news headline isn't a name —
this used to just dump the headline into the `name` field, which was a
bug) before creating a new `Prospect`-stage contact seeded with a note
pointing back to the source article — the "prospect → client" loop in one
click.

### Contact profile page (CRM-360 view)

Click any contact's name (on the Pipeline page, in the daily brief, or
anywhere else they show up) to open `/contacts/[id]` — a single page with
everything about that person: editable details (tags, cadence, deal value,
referred by), cadence/touchpoint status, email actions, the full
conversation/note log, relevant recent news, and AI Meeting Prep. Fields
save on blur — no separate "edit mode" toggle.

### Touchpoints

"Touchpoints" is just the number of notes logged for a contact
(`touchpointCount()` in `lib/contactTypes.ts`) — shown on contact cards, the
profile page, and the daily brief's outreach queue. It's derived, not a
separate counter, so it can't drift out of sync with the note log.

### Next meeting date → shows up in the daily brief

Set a "Next meeting date" on a contact's profile page and it surfaces as a
**Meetings today** section at the top of the daily brief on that date, with
an "Open AI Meeting Prep →" link straight to their profile so you're not
hunting for who you're meeting.

### Email actions (Send Email / Generate email template)

Both the contact profile page and the daily brief have an **✉ Email**
button (`components/EmailAction.tsx`). If the contact has no email on file
yet, it asks for one first. "Generate email" calls the same Perplexity API
as AI Meeting Prep (same `PERPLEXITY_API_KEY` setup, same per-use cost, same
grounding rules — only from that contact's notes and matched recent news,
never inventing facts) to draft a short, specific outreach email — subject
and body both land in **editable fields**, so you can tweak the AI draft
before doing anything with it, on a case-by-case basis. **This app never
sends email itself** — "Open in email client to send" is a `mailto:` link
that pre-fills your (possibly-edited) subject/body in your actual email
client (Outlook, Gmail, whatever's set as default); you always hit send
yourself, from your real firm email system, not from this tool.

### Pipeline stages

The Pipeline page shows the forward journey — `Prospect → Contacted →
Meeting → Proposal → Client` — as a connected funnel (counts + % of active
pipeline) above a Kanban board. A separate **Cold / Not Converting** stage
exists outside that journey for contacts who've gone quiet or aren't going
to convert; it's rendered in its own muted section below the board rather
than as a further step, so it doesn't read as "progress." Cold contacts are
also excluded from the daily brief's "people to call" — the whole point of
that bucket is that you're not actively chasing them.

Move a contact to a different stage either by **dragging its card** to
another column (or to the Cold section) or via the dropdown on the card —
both call the same update, so use whichever's easier. Drag-and-drop uses
plain HTML5 drag events (`ContactCard.tsx`, `app/pipeline/page.tsx`), no
extra library.

### Warm intro finder

`lib/warmIntros.ts` scans every pair of contacts' tags/company/note text for
shared terms (crude proper-noun extraction — sequences of capitalized
words, filtered against a small stopword list) and flags a possible
connection when two contacts share something. Each shared term keeps track
of where it came from — a tag, a company name, or note text
(`lib/warmIntroTypes.ts`) — so the description reads correctly regardless
of source: "both tagged retail" for a shared tag, "both connected to Acme
Corp" for a shared company, "both mention Ohio State University" for a
shared note phrase. Earlier versions flattened all three into a single
"both mention X" line, which read strangely for a shared tag like "both
mention retail" — that's fixed. This is still naive keyword overlap, not
real NLP — expect some false positives on generic terms even with the
stopword list, and treat every match as a prompt to double-check, not a
confirmed connection. Results show up on the Pipeline page and as a short
teaser in the daily brief.

## COI / Network tab

`/coi` is for Centers of Influence — attorneys, CPAs, and other referral
sources — separate from where someone sits in the Prospect → Client
pipeline (a COI can also be a client, or not be in the pipeline at all).
Toggle a contact as a COI from their profile page or the quick checklist at
the bottom of the COI tab.

The **Network** graph (`components/NetworkGraph.tsx`) is a self-contained
SVG visualization, not a real graph library — plain circular layout, no
physics simulation. It draws two kinds of edges (`lib/networkGraph.ts`):

- **Referral** (solid gold) — drawn from a contact's structured
  `referredByContactId` link when set (reliable, no string matching
  involved). For older contacts that only have a free-text `referredBy`
  value, it falls back to matching that text against another contact's name
  exactly (case-insensitive).
- **Possible warm intro** (dashed gray) — the same naive keyword-overlap
  matches from the warm intro finder, deduped against referral edges so a
  pair already linked one way doesn't also get a second line.

Node color follows pipeline stage, so you can tell clients from prospects
from a cold contact at a glance: green fill/ring for **Client**, blue for
anyone still in the pipeline (Prospect/Contacted/Meeting/Proposal), gray
for **Cold**. The gold COI ring (and larger node size) is layered on top of
that and is orthogonal to stage — a COI can be a client, a prospect, or
neither. Hover any node to highlight just its connections (and see its
stage/COI status called out below the diagram), click to open that
contact's profile.

### Cooling leads

A saved lead whose note hasn't been touched in `COOLING_THRESHOLD_DAYS`
(`lib/config.ts`, default 14 days) shows up in the daily brief as
"cooling — gone quiet," distinct from "follow up on" (which means no note
has ever been added).

## AI Meeting Prep (Engagement tab, and the contact profile page)

This — and email template generation, see above — are the only features in
the app that actually call an LLM; everything else is rule-based/keyword
matching. Click **Generate** under "AI Meeting Prep" for a selected contact
and it produces an Executive Summary, Likely Needs, Suggested Questions
(open-ended / relationship-building / technical), and Risks, generated by
Perplexity's API (`lib/meetingPrep.ts`, `app/api/meeting-prep/route.ts`).
Both this and email generation (`lib/emailTemplate.ts`) share the same API
key and setup below.

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
investable assets) and a referral source. Set them when adding a contact or
editing one; the Pipeline funnel header rolls them up into a per-stage
total and an "Active pipeline value" figure. These two fields are also what
a future Analytics module would report on — see below.

### Referral source: linked contacts, not just flat text

The "Referred by" field (`components/ContactPicker.tsx`, used on the
contact profile page and the "add contact" form) is a searchable picker,
not a plain text box: start typing and it autocompletes against your
existing contacts. Pick a match and the referral becomes a real structured
link (`referredByContactId`) — rendered everywhere as a clickable link to
that person's profile (contact cards, the Pipeline board) and used to draw
a reliable edge on the COI/Network graph. If the referrer isn't a tracked
contact yet (an organization like "Columbus Chamber of Commerce," or
someone you haven't added), just leave it as typed free text — it still
displays, just without a link. Contact names shown elsewhere in the app
(warm-intro matches in the daily brief, Pipeline, and Intelligence pages;
"Affects: ..." on market events in the daily brief) are also clickable
links to that contact's profile, not inert text.

## Contact intelligence: Wealth Gap, Life Stage, Relationship Health, Relationship Memory

Four rule-based panels on the contact profile page (`/contacts/[id]`), all
derived from data you already have on file — no new data source, no LLM
call, no cost.

### Wealth Gap Estimator

Contacts optionally carry `currentWalletShare` alongside `estimatedValue`
(now read as "estimated total wealth," not just "opportunity size").
`estimateWealthGap()` (`lib/contactTypes.ts`) is simply
`estimatedValue - currentWalletShare` — the untapped portion of a
contact's wealth not yet captured at the firm. Shown on the contact
profile (editable field + computed gap) and, when positive, as a small
"(gap)" annotation on Pipeline contact cards.

### Client Life Stage Engine

`lib/lifeStages.ts` classifies each contact into one of four stages by
keyword match against their tags, company, and note text — same naive
approach as lead classification, so review before trusting a label:

- **Building Wealth** — founder, executive, growing/scaling business
- **Liquidity** — preparing for exit, IPO, acquisition, merger
- **Preserving Wealth** — estate planning, family office, trust
- **Legacy** — philanthropy, succession, foundation, next generation

A contact with no keyword match gets no stage badge rather than a guess.
The detected stage shows as a badge on the profile header and Pipeline
cards, plus a short list of rule-based (not AI-generated) talking points
for that stage on the profile page.

### Relationship Health

`lib/relationshipHealth.ts` derives two numbers from data already on
file — no new field needed: tenure (days since the earliest logged note,
i.e. "how long you've known this person") and a health status
(Strong/Steady/Declining/At Risk) based on how overdue the last contact is
relative to that contact's own cadence. A long-tenured relationship with a
stale last conversation reads as "Declining," matching the idea that
outreach expectations scale with how well you know someone. Shown as a
colored badge next to "Cadence & Outreach" on the profile page and a small
dot on Pipeline contact cards.

### Relationship Memory

`lib/relationshipMemory.ts` scans a single contact's own note history over
time for names that recur across two or more separate notes — reusing the
same crude proper-noun extraction as the warm intro finder
(`lib/warmIntros.ts`), just scoped to one person's notes instead of
cross-contact. Notes are also scanned for a small set of life-event
keywords (graduation, engagement, wedding, new baby, retirement,
promotion, and a few others); when a recurring name's most recent mention
carries one, the profile page surfaces a prompt like "Ask about Emma's
engagement," and the same prompt appears under that contact's entry in the
daily brief if you have a meeting with them today.

This is naive keyword matching, not real relationship understanding — it
can't tell a daughter from a colleague, doesn't know who "Emma" actually
is, and can produce false positives (any capitalized phrase that happens
to recur). Since it's reading years of private notes for personal details,
treat every result as a prompt to verify before bringing it up, and use
discretion — this is the most sensitive naive-matching feature in the app,
alongside the Personal group in Wealth Event Detection above.

## Market Insights (Healthcare / Business Owners) — the Intelligence "Focus" filter

Unlike the rest of the app, Market Insights is industry-scoped rather than
region-scoped, sourced separately (`lib/industries.ts`,
`lib/marketInsightsRefresh.ts`, `data/market-insights.json` — its own
git-ignored store, same no-fake-data rule as leads/contacts) and refreshed
with its own "Refresh feeds" button. It lives inside the **Intelligence**
tab (`app/intelligence/page.tsx`) as a "Focus" filter — "All" shows the
default region-scoped view (relationship mapping, map, wealth events);
picking "Healthcare" or "Business Owners" swaps the bottom section for that
vertical's topics instead. The underlying API routes
(`/api/market-insights`, `/api/market-insights/refresh`) are unchanged from
when this was its own tab, so nothing else needed to move.

Two verticals ship today, each with its own sub-topics:

- **Healthcare**: DSO Acquisitions, Hospital Mergers, Physician Practice
  Sales (all Ohio-scoped), plus CMS Reimbursement and FDA Approvals
  (national).
- **Business Owners**: SBA Changes, Capital Gains Tax, PE Dry Powder,
  Industry Valuations (all national).

Deal-type topics require an Ohio/Columbus mention because those are real
regional transactions. Policy/regulatory topics are deliberately left
national — almost no article about a federal reimbursement rule or a tax
law change will mention "Columbus," and region-restricting those would
just make the section permanently empty even though the news still matters
to your clients.

### Adding your own industry vertical

Click **+ Add industry** next to the Focus filter to add a new vertical
without touching code — give it a name, and one or more topics (a topic
name, comma-separated keywords, and whether it should be Ohio-scoped).
Behind the scenes this builds a simple OR'd-keyword Google News query per
topic (`lib/industries.ts`'s `buildQueryFromKeywords`) and saves it to
`data/custom-industries.json` (git-ignored — personal configuration, not a
shipped default, same pattern as contacts/leads). Custom industries show up
as their own Focus tab immediately and get picked up by "Refresh feeds"
alongside the two built-ins.

Custom topics use a simpler single-list-of-keywords query than the
built-in Healthcare/Business Owners topics, which hand-tune a two-part
AND query (e.g. "(DSO-related terms) AND (acquisition-related terms)") for
more precision — if you want that level of control for a new vertical,
add it directly to `INDUSTRIES`/`INDUSTRY_TOPICS` in `lib/industries.ts`
instead of through the UI.

## Calendar (prospecting events)

`/calendar` tracks social/sporting events used for prospecting — tailgates,
fundraisers, networking nights — separate from `data/leads.json`. Add an
event manually, search by title/location/description, and tag any number
of contacts to it (shown as chips on the event, and on the contact if you
look them up). Stored in `data/events.json` (git-ignored, your real
schedule) seeded from `data/events.sample.json` (tracked — ships with three
demo events, including an Ohio State football tailgate, as an example of
the pattern rather than confidential data).

Two views, toggled with the List/Month buttons at the top — **Month** is
the default. **List** is the original flat, chronological list. **Month**
is a grid for the current month (prev/next/Today navigation) with up to 2
event titles per day cell and a "+N more" overflow indicator; clicking any
day shows that day's full event details (same cards as list view) below
the grid. Both views read from the same `/api/events` fetch and respect
the search box — search narrows what shows up in either view.

**Tagging a contact to an event automatically logs a note on their
profile** — "Tagged to prospecting event: `<title>` — `<date>` at
`<location>`" — so the connection is traceable later. Opening a contact's
profile after tagging them to something answers "why is this person
connected to this event" without having to guess; before this, a tag was
just a chip with no record of the reasoning. This only fires for newly
added tags (untagging or editing other event fields doesn't touch anyone's
notes), and it's a real `PATCH`/`POST`-time side effect
(`lib/eventsStore.ts`'s `describeEventForNote`, wired into both
`app/api/events/route.ts` and `app/api/events/[id]/route.ts`), not
something simulated only in the demo data.

**Upload schedule (CSV)** parses a simple CSV
(`title,date,location,description` header, last two optional) and
bulk-creates events — `lib/csvUtils.ts` is a minimal parser (basic quoted-
field support, not full RFC 4180) good enough for a personal schedule
export; reformat oddly-escaped rows by hand if a row gets skipped.

## Analytics (not built)

`/analytics` is intentionally a stub page, not a fake dashboard. It would
need historical snapshots — everything today reflects only current state,
nothing tracks change over time — plus real usage data (and now that Market
Insights and Pipeline deal-value tracking exist, more of the raw material
it would report on) before it could show anything real. Flagged honestly
in-app rather than populated with placeholder numbers.

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
- AI Meeting Prep and email generation depend on an LLM's search and
  reasoning, which can still miss context, misattribute information, or
  occasionally fail to return valid JSON (the API surfaces a clear error
  rather than showing garbage in that case). These are the only features in
  this app that aren't free and aren't deterministic — everything else you
  can trace back to an exact keyword match; these you can't.
- The Network graph's referral edges are reliable when a contact was linked
  via the "Referred by" picker (`referredByContactId`). Only contacts with
  just an old free-text `referredBy` value fall back to exact
  (case-insensitive) name matching against another contact's `name` — a
  typo, a nickname, or "Dr. Chen" vs. "Robert Chen" won't link in that
  fallback case. The graph is also a plain circular layout, not a
  force-directed graph, so it won't automatically cluster related people
  together as the network grows.
- Wealth Event Detection is still keyword-based, not NLP, and the Personal
  category group (Divorce, Estate Filing) is inherently sensitive — treat
  every match as an unverified public-news mention to confirm, not a fact,
  and use discretion in how (and whether) you act on it.
- Life Stage, Relationship Health, and Relationship Memory are all
  keyword/date-math derivations, not AI/ML, despite Relationship Memory in
  particular reading like something smarter than it is — it has no idea who
  the people in your notes actually are, only that the same capitalized
  phrase showed up more than once. Wealth Gap is only as accurate as the two
  numbers you type in; nothing here is pulled from any real account data.
- The CSV schedule upload is a minimal parser, not a full CSV spec
  implementation — stick to simple values (no embedded newlines) in each
  cell for reliable results.

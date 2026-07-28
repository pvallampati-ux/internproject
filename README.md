# Connect Intelligence Hub

A Columbus / Central Ohio prospecting platform organized into nine modules,
navigable via the left sidebar:

| Tab | Route | What it does |
|---|---|---|
| Home | `/` | Dashboard: today's meetings (AI Meeting Prep as a popup), tasks due this week, and a persistent list of clients/prospects needing contact |
| Prospect Discovery | `/discovery` | News-based lead sourcing, filtering, and scoring |
| Intelligence | `/intelligence` | Wealth/liquidity events, warm-intro relationship mapping, regional map, and an industry-focus filter (Healthcare / Business Owners / anything you add) for Market Insights |
| Engagement | `/engagement` | Meeting prep (+ optional AI Meeting Prep), outreach queue, follow-ups/cooling leads |
| Pipeline | `/pipeline` | Prospect → Client Kanban/funnel (drag-and-drop or dropdown), deal value, referral source, filterable by industry/location/wealth/life stage |
| Tasks | `/tasks` | Action items — optionally tied to a contact, with due dates |
| COI / Network | `/coi` | Centers of Influence and a visual graph of referral/warm-intro connections, color-coded by stage |
| Calendar | `/calendar` | Prospecting events (tailgates, networking nights) — list or monthly grid view, search, CSV schedule upload, tag prospects |
| Analytics | `/analytics` | Real KPIs computed live from current data — see below |

Every contact also has a profile page at `/contacts/[id]` — click any name in
Pipeline or the daily brief to open it. That's the Client 360 view: full
identity/firmographic detail, cadence/touchpoints, wealth gap, prospect
score, life stage, relationship memory, similar prospects, tasks, a unified
timeline, email actions, a typed conversation log, an audit trail, and AI
Meeting Prep — all in one place. See "Client 360 and beyond" below for the
full rundown.

The header itself has a **contact search** (`components/GlobalSearch.tsx`,
⌘K to focus) on every page — type a name, company, or tag and jump straight to that
person's profile. This is separate from the headline search on Discovery
and the event search on Calendar, which search leads/events rather than
contacts.

### Home page (`/`)

The landing page is a dashboard, not the news feed (that moved to
`/discovery`). Three always-visible sections:

- **Meetings today** (from `/api/daily-brief`) — anyone with a
  `nextMeetingDate` of today. "Open AI Meeting Prep" opens the prep panel as
  a popup right on this page, instead of navigating to their profile first.
- **Tasks due this week** (from `/api/tasks`) — open tasks with no due date
  or due within 7 days, checkable right from the dashboard. Links to the
  full `/tasks` page for everything else.
- **Clients & prospects needing contact** (from `/api/daily-brief`) —
  everyone overdue relative to their own cadence, with a stage badge, quick
  Mark Contacted, and email actions. This is permanent, not a once-a-day
  dismissable notice — it stays visible every time you load the page.

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
relationship health, life stage, **Prospect Score**, pipeline stage
dropdown, tags, deal value ("Est. wealth: $X · $Y not yet captured" — both
numbers labeled, not just bare figures) and referral source, last-contact
info, Mark Contacted, and the note log — as an overlay positioned below the
card. It's a CSS overlay (`position: absolute`), not a layout push, so
hovering doesn't shift neighboring cards around; it disappears the moment
your cursor leaves.

Above the board, `components/ContactFilterBar.tsx` narrows what's shown by
industry, location, minimum wealth, life stage, keyword, COI-only, and "no
existing relationship" — see "Client 360 and beyond" below for detail.

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

## Client 360 and beyond

This section covers everything added to round the contact profile out into
a full "Client 360" record, plus the productivity/intelligence features
layered on top. All of it is free and rule-based (no new LLM calls) except
where noted.

### Client 360 fields

`Contact` (`lib/contactTypes.ts`) now carries, beyond the original
name/company/email/tags: **Title**, **Location**, **Industry**, **Business
ownership**, **Existing firm relationships** (what they already have, if
anything — distinct from `currentWalletShare`'s dollar figure), **Family**
(structured `{ name, relationship }` list, editable from the profile),
**Board memberships**, **Schools**, and **Clubs** (comma-separated on the
profile page). All optional — nothing forces you to fill these in, but
Prospect Score, Similar Prospects, Filters, and Search all get better with
them populated.

### Search and filters

**Contact search** (header, every page) now matches name, title, company,
industry, location, business ownership, existing relationships, tags,
board memberships, schools, clubs, family member names/relationships, and
**note text** — a match found only in notes is labeled "(matched in
notes)" so you know why a result showed up.

**Contact filters** (`components/ContactFilterBar.tsx`, on the Pipeline
page) let you narrow the board by industry, location, minimum estimated
wealth, life stage, a keyword (matched against tags and notes — covers
things like "founder," "PE-backed," "succession"), COI-only, and "no
existing relationship." The Pipeline funnel and stage counts update to
reflect the active filter.

### Note types and Timeline

Notes (`NoteEntry` in `lib/contactTypes.ts`) now carry an optional `type`:
**meeting**, **call**, **email**, or **note** (the default), selectable
from a dropdown when you log one, shown as a small colored badge on each
entry. A note can also carry a `fileUrl` — a link to an external doc
(Drive/SharePoint/etc), since this app doesn't host file uploads itself.

The **Timeline** section on the profile page (`lib/timeline.ts`) merges
notes, relevant news, and tasks into one chronological feed — "every
interaction," as close as a notes-based system gets without a real email/
calendar integration.

### Tasks

A real task entity (`lib/taskTypes.ts`, `lib/tasksStore.ts`,
`/api/tasks`), independent of the single `nextMeetingDate` field that
existed before: title, optional due date, optional linked contact,
done/not-done. Manage them from a dedicated `/tasks` page (grouped into
Overdue / Open / Completed), from a contact's profile (scoped to that
contact), or from the Home page's "Tasks due this week" widget.

### Audit trail

Every field change and note addition is logged (`lib/auditLog.ts`,
`data/auditLog.json`, `/api/audit`) with a human-readable diff (e.g.
`industry: Technology → Enterprise Software`) and a timestamp, visible in
a "Recent changes" panel at the bottom of each contact's profile. Honest
caveat: this is a single-user app with no login, so the "actor" field is
always "You" — this tracks *what* changed and *when*, not *who*, because
there's only ever one who. A real multi-user audit trail would need actual
authentication, which this app doesn't have (see "Known limitations").

### Follow-up summary

A compact card at the top of each profile combining relationship health,
tenure, open-task count, the last logged note, and the Relationship Memory
prompt (if any) into one "catch me up" glance before a call — rule-based,
assembled from data already computed elsewhere on the page, no new query.

### AI Prospect Score (rule-based, not ML)

`lib/prospectScore.ts` computes a 0–100 score from a fixed set of weighted
rules — estimated wealth, wealth-gap size, life stage (Liquidity scores
highest), relationship health, referral warmth (a tracked
`referredByContactId` scores higher than free-text `referredBy`), and
whether there's an existing firm relationship on file. Every point traces
back to a specific, visible reason (hover the badge) — this is not a
machine-learning model and doesn't pretend to be one. Shown as a badge on
the contact profile and on Pipeline cards (in the hover panel).

### Similar Prospects (rule-based, not ML)

`lib/similarProspects.ts` ranks other contacts by shared tags, matching
industry, matching life stage, matching location, and estimated-wealth
proximity (within 2x–0.5x of the target). No embeddings, no LLM call — a
weighted overlap score with visible reasons, shown on the profile page.

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

## Round 3: agenda, watchlist, DNA, geography, influence, and invite suggestions

A second pass against a broader "enterprise AI platform" wishlist. Same
rule as everywhere else in this app: free/rule-based features got built;
anything needing a new paid LLM call (semantic search, AI meeting-note
summarization with automatic CRM writes, a meeting simulator, an audio
briefing) was intentionally held back rather than silently adding more
recurring cost — ask if you want any of those built. A few items were also
skipped outright because they'd need external data this app has no honest
way to get (a real prospect-discovery/coverage-gap engine, competitor
monitoring, market penetration) or don't apply to a single-user app
(firmwide search, a referral marketplace, team dashboards).

### Why Now Score (Home page + contact profile)

`lib/whyNowScore.ts` is a weighted point system — not an AI/ML model — over
signals already on file: a matched wealth-event news lead, a shared
board/club with an existing client, time since last banker interaction,
life stage, and referral warmth. It returns a 0–100 score, a recommended
action band, and a bulleted `reasoning` list where every point traces to a
specific signal — e.g. "No banker interaction in 18 months" or "Existing
client Jane Whitfield shares board membership: United Way of Central
Ohio." Deliberately **not** included: third-party conference/speaking
schedules (no data source for that here). Home's "Prioritized agenda"
section runs this across every non-Cold contact, merges it with standalone
tasks into one priority-sorted list, and shows the top few; the profile
page shows the score/action/reasoning in full inside the Follow-up Summary
card. This replaces the earlier fixed-priority "Next Best Action" system.

### Wealth Creation Watchlist (Intelligence tab)

Answers "can you predict who's about to get wealthy from news?" — partially,
and only for people already newsworthy enough to appear in a wealth-event
headline. `lib/prospectDiscovery.ts` extracts candidate names from
Business-group wealth-event leads (Founder Exit, IPO/Stock Sale, PE
Investment, M&A, Executive Hiring) who aren't already a tracked contact,
and buckets them under a label matching that category. **This is not a
predictive model** — no wealth forecast, no confidence score, and no way
to catch the harder signals (equity quietly vesting pre-liquidity,
emerging fund managers, employees at fast-growing private companies) since
none of that exists in free public news; a real version would need
licensed data (Crunchbase/PitchBook) or SEC Form 4 filings, neither of
which this app has. Name extraction is the same crude proper-noun regex
used elsewhere, with no cross-validation (unlike the warm intro finder,
which requires a match across two contacts) — expect real noise from place
names and product names. Every entry is exactly one fact: this name showed
up in a wealth-event headline.

### Relationship DNA (contact profile)

`lib/relationshipDNA.ts` reorganizes Client 360 fields already on the page
into three columns — Professional (title, industry, ownership, boards,
tags), Personal (family, schools, clubs), Philanthropic (notes matching a
small charitable-keyword list). Not new information, just grouped for a
faster pre-call read.

### Hidden relationship detection

The warm intro finder and Similar Prospects now also match on the
structured Board/School/Club fields, not just tags/company/free-text notes
— e.g. "both serve on the board of Columbus Chamber of Commerce" reads as
a reliable structured match, distinct from the naive note-text matching
next to it.

### Contact Heat Map and White Space Analysis (Intelligence tab)

A second static-SVG scatter plot (`components/ContactHeatMap.tsx`, same
approach as the Regional Map) plots contacts by their Location field
instead of leads by matched news region — where your book of business
actually is. White Space Analysis (`lib/whiteSpace.ts`) lists contacts
with a real wealth gap on file, ranked by size, with their
`existingRelationships` status — the biggest untapped-opportunity view,
one click from every contact's profile.

### Note sentiment and Executive Influence Score

`lib/sentiment.ts` is naive keyword sentiment (a fixed positive/negative
word list) over a contact's most recent notes — not real NLP, shown as a
badge on the profile header. `lib/influenceScore.ts` is a second
rule-based 0–100 score, separate from Prospect Score, weighing COI status,
how many tracked contacts someone has referred, board/club count, and a
senior-title check — "how connected is this person," not "how much
opportunity does this person represent."

### Event invitation optimizer (Calendar tab)

`lib/eventOptimizer.ts` ranks untagged contacts for a given event by
industry/tag keyword match against the event's title/description, life
stage, COI status, and declining relationship health (a good excuse for a
low-key touchpoint) — surfaced as one-click "+ Name" suggestion chips above
the manual "Tag prospects" list on each event card.

### Analytics: geography and referral conversion

Two more KPIs: a geography breakdown (same pattern as the industry
breakdown, using the Location field) and referral conversion — of contacts
with a referral source on file, what percentage are now a Client.

## Round 4: Why Now scoring, unified agenda, lead name extraction, and a warm-intro bug fix

### Scored Why Now Engine

Replaced the old fixed-priority "Next Best Action" (`lib/nextBestAction.ts`,
now deleted) with `lib/whyNowScore.ts` — see above. Wired into both the
Home page agenda and the contact profile's Follow-up Summary card, in a
Score/Recommended Action/Reasoning format.

### Unified "Prioritized agenda" (Home page)

The Home page had two overlapping sections — "Prioritized agenda" and
"Tasks due this week" — that both amounted to "what should I do." They're
now one merged, priority-sorted list mixing scored contacts (Why Now
Score) and standalone tasks (not linked to a contact), so there's a single
place to look instead of two.

### "Mentioned:" on lead cards (Discovery tab)

Each lead card now runs the same crude proper-noun extraction used by the
Wealth Creation Watchlist over its own headline/snippet and shows
"Mentioned: [name]," or "No name identified in this headline/snippet" when
extraction finds nothing — so a lead with no identifiable person is
visibly less actionable at a glance, instead of requiring a click-through
to find out. Also pre-fills the "+ Add as contact" name field with the
first extracted name. The Discovery empty-state copy was also corrected —
it previously read ambiguously; it now states plainly that this list stays
empty until a real feed fetch succeeds and contains no sample/fake data.

### Bug fix: bogus warm-intro matches from auto-note boilerplate

The event-tagging auto-note feature (`describeEventForNote` in
`lib/eventsStore.ts`, added in Round 2) writes identical boilerplate text
— e.g. `Tagged to prospecting event: "Ohio State vs. Michigan — Tailgate"
— Nov 28, 2026 at Ohio Stadium, Columbus.` — to every contact tagged to
the same event. The warm-intro finder and Relationship Memory detector
were both scanning note text for shared proper nouns, so two contacts
tagged to the same event were showing up as a "warm intro" match on the
event's own title/date/location words ("both mention tagged, ohio state,
michigan, tailgate..."), not a real shared connection. Fixed in
`lib/warmIntros.ts` and `lib/relationshipMemory.ts` by excluding any note
starting with the `Tagged to prospecting event:` prefix from proper-noun
extraction entirely, since it's synthetic boilerplate duplicated across
attendees rather than organic note content.

## Round 5: contact profile tabs, and de-duplicating warm intros

### Contact profile page: tabs

`app/contacts/[id]/page.tsx` had grown to ~12 stacked sections (Follow-up
Summary, Details, Cadence & Outreach, Client 360, Relationship DNA, Life
Stage, Tasks, Timeline, Conversations, Relationship Memory, Similar
Prospects, Relevant News, AI Meeting Prep, Audit Trail) requiring a lot of
scrolling. It's now organized into six tabs: **Overview** (Follow-up
Summary/Why Now, Details, Cadence & Outreach), **Profile** (Client 360,
Relationship DNA, Life Stage), **Activity** (Timeline, Conversations,
Relationship Memory), **Tasks**, **Insights** (Similar Prospects, Relevant
News, AI Meeting Prep), and **History** (Audit Trail). The identity header
(name, badges, stage selector, COI toggle) stays visible above the tabs.

### De-duplicated warm intros

The same warm-intro match list (`findWarmIntros()` in `lib/warmIntros.ts`)
was rendered in full, with its own explanatory blurb, in three separate
places: the Pipeline page ("Possible warm intros"), the Intelligence page
("Relationship Mapping"), and the once-a-day Daily Brief popup. That's the
same data three times under two different names — confusing and wordy.
Now there's one canonical full list, on the Intelligence page (renamed
"Warm Intros" for consistency). The Pipeline page no longer renders the
list at all — just a short link over to Intelligence. The Daily Brief
popup shows a one-line teaser ("3 possible matches found, e.g. X & Y")
with a link, instead of re-rendering the whole list. Several other
explanatory captions on the Intelligence page (Wealth Events, Wealth
Creation Watchlist, White Space Analysis, Regional Map, Contact Heat Map)
were also trimmed from multi-sentence paragraphs down to one short line
each, keeping the material honesty disclosures (e.g. "not a predictive
model") but cutting the rest.

## Round 6: split the contact map into Prospect / Client, with a side-by-side and overlay view

The old "Contact Heat Map" (`components/ContactHeatMap.tsx`, deleted)
plotted every contact by Location regardless of pipeline stage. It's
replaced by `components/RelationshipMap.tsx`, which buckets contacts by
stage — Prospects (everything short of Client, excluding Cold) in sky
blue, Clients in green, matching the color convention already used on the
Network diagram — and gives you two ways to look at it: **side by side**
(two separate maps, the default) or **overlay** (one map, both layers
plotted on the same coordinates, so a town with both prospects and
clients shows overlapping circles). Same static-SVG-scatter approach and
click-to-see-names interaction as the other maps in this app — not a
live/interactive map provider.

## Round 7: rename to Connect Intelligence Hub, sidebar shell, and a landscape Home redesign

Renamed the app (was "Private Client Prospecting Hub") and rebuilt the
navigation and Home page for a wide/landscape monitor instead of a
narrow centered column with dead space on both sides.

- **New shell**: the old top nav bar (`components/NavBar.tsx`, deleted)
  is replaced by a persistent left sidebar (`components/Sidebar.tsx`) and
  a top header bar (`components/AppHeader.tsx`), wired into
  `app/layout.tsx` so it applies to every page. The sidebar has the same
  nine links as before (now with small hand-rolled SVG icons —
  `components/icons.tsx` — instead of adding an icon-library dependency
  for ten glyphs) plus a "Shortcuts" list of your 5 most recently viewed
  contacts (tracked client-side via `lib/userPrefs.ts`, no new
  server-side data). The header has the contact search (now with a ⌘K
  focus shortcut), a notification bell, and a profile menu.
- **New Settings and Help pages**: `/settings` lets you set a display
  name/role (stored in `localStorage` — there's no login, so this is
  personalization, not accounts) used in the header greeting.
  `/help` is a static reference page summarizing each tab and repeating
  the app's core honesty disclosure (everything's rule-based except AI
  Meeting Prep and email drafting).
- **What's real vs. what's not, on the header**: the notification bell's
  badge count is the real overdue-contact count from the existing Daily
  Brief computation (`/api/daily-brief`) — not a decorative fixed number.
  The avatar is initials-based, since there's no photo upload.
- **Home page rebuilt as a dashboard grid**: "Today's Focus" (top 5 Why
  Now items), "Needs a Touch" (overdue contacts), "New Opportunities"
  (matched news, with a High/Medium Impact split based on whether the
  category is a wealth-event category — not a fabricated score),
  "Today's Work" (today's meetings, with actual times), "Relationship
  Opportunity" (the top warm-intro match — shown with its actual shared
  terms and a "keyword-matched, not a confidence score" note, since there
  is no real model producing a percentage), and "Pipeline Snapshot"
  (active pipeline value, active opportunity count, high-priority count —
  no fabricated trend arrow, since there's no historical pipeline-value
  time series to compute one honestly from).
- **Widened every other page**: bumped each page's container from a
  narrow centered `max-w-4xl`/`max-w-6xl` to `max-w-[1600px]` (or
  `max-w-5xl`/`max-w-6xl` for the more form-heavy Tasks and contact
  profile pages) so pages use the sidebar-adjusted width instead of
  leaving blank margins on a landscape monitor. This pass widened
  containers everywhere; it did not restructure every page's internals
  into new multi-column grids (Home and the Prospect/Client map got that
  treatment — the rest are candidates for a follow-up if wanted).

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

## Analytics

`/analytics` is a real dashboard now (`lib/analytics.ts`, `/api/analytics`),
computed live from current data on every load:

- Prospects & clients (total count), pipeline by stage (count + $ value bar
  chart), industry breakdown
- Meetings this month (counted from notes logged with `type: "meeting"`)
- Pipeline value, wealth gap (untapped opportunity), captured wallet share
- Open/overdue tasks
- Referral count and how many are warm (linked via `referredByContactId`
  vs. free text)
- Client conversion rate (Client ÷ (Client + Cold), as a proxy "win rate")

What's honestly still not here: anything **trend-over-time** (this app
takes no historical snapshots — every number is current-state only, so
there's no "conversion rate this quarter vs. last") and anything **by
banker or by office** (this is a single-user, single-office app — there's
only one of each).

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
- Prospect Score and Similar Prospects are both fixed weighted-rule systems
  (see "Client 360 and beyond"), not trained models — the weights are
  hand-picked, not learned from outcomes, so treat the score as a
  structured way to organize attention, not a validated prediction.
- The audit trail records what changed and when, not who, because there's
  no login — every entry says "You." It's also an unbounded-growth-capped
  rolling log (`lib/auditLog.ts`, most recent 2000 entries), not a
  permanent compliance-grade record; a real one needs retention policy and
  a real database, not a flat JSON file.
- **Permissions and everything in Administration (Roles, Teams, Regions,
  API management, Feature flags, Logging/Monitoring) are deliberately not
  built.** This app has no authentication and no concept of a second user —
  building a permissions *UI* on top of that would only look like access
  control without actually restricting anyone from seeing anything, which
  is worse than not having it (it would look secure while being fake).
  Real permissions require real auth and a real backend; that's a
  different, larger project than this one, not a checkbox to fake.
- Note sentiment is a fixed positive/negative word list over the last 5
  notes — no negation handling ("not unhappy" reads negative), no sarcasm
  detection. The Wealth Creation Watchlist's name extraction has no
  cross-validation at all (unlike the warm intro finder, which needs a
  match across two contacts), so expect the highest noise rate of any
  naive-matching feature in this app — place names and product names will
  show up. Executive Influence Score is a separate fixed-weight system
  from Prospect Score (same "hand-picked weights, not learned" caveat).
- The event invitation optimizer only ranks contacts *not yet* tagged to
  an event, and only against that event's title/description text plus
  each contact's own signals — it has no concept of how many people
  should be invited or venue capacity, just a relevance ranking.

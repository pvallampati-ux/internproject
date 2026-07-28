// Central place to tune what this prospecting hub looks for.
// Edit REGION_TERMS to widen/narrow geography, and CATEGORY_KEYWORDS to
// tune what counts as a lead in each bucket.
//
// Wealth Event Detection: every category below (except "New Firm /
// Expansion", a company-level market signal rather than a personal wealth
// trigger) is a wealth event a private banker would want to know about,
// grouped into Business / Personal / Corporate per CATEGORY_GROUPS. This
// runs continuously via the same free Google News RSS refresh as everything
// else — no new cost, just a wider net of keyword-classified public news.
// Detection is naive keyword matching, same caveat as elsewhere in this
// app: review before acting, especially the Personal group (divorce,
// estate filings) — handle with discretion.

export type Category =
  | "IPO"
  | "M&A"
  | "PE Investment"
  | "Founder Exit"
  | "Executive Hiring"
  | "Stock Sale"
  | "Foundation Created"
  | "Divorce"
  | "Estate Filing"
  | "Real Estate Purchase"
  | "Charitable Donation"
  | "Earnings"
  | "Funding"
  | "Debt Issuance"
  | "Spin-off"
  | "Executive Compensation Change"
  | "New Firm / Expansion";

export type CategoryGroup = "Business" | "Personal" | "Corporate" | "Market Signal";

export const CATEGORY_GROUPS: Record<Category, CategoryGroup> = {
  IPO: "Business",
  "M&A": "Business",
  "PE Investment": "Business",
  "Founder Exit": "Business",
  "Executive Hiring": "Business",
  "Stock Sale": "Business",
  "Foundation Created": "Personal",
  Divorce: "Personal",
  "Estate Filing": "Personal",
  "Real Estate Purchase": "Personal",
  "Charitable Donation": "Personal",
  Earnings: "Corporate",
  Funding: "Corporate",
  "Debt Issuance": "Corporate",
  "Spin-off": "Corporate",
  "Executive Compensation Change": "Corporate",
  "New Firm / Expansion": "Market Signal",
};

export const CATEGORY_GROUP_ORDER: CategoryGroup[] = ["Business", "Personal", "Corporate", "Market Signal"];

export const CATEGORIES: Category[] = [
  "IPO",
  "M&A",
  "PE Investment",
  "Founder Exit",
  "Executive Hiring",
  "Stock Sale",
  "Foundation Created",
  "Divorce",
  "Estate Filing",
  "Real Estate Purchase",
  "Charitable Donation",
  "Earnings",
  "Funding",
  "Debt Issuance",
  "Spin-off",
  "Executive Compensation Change",
  "New Firm / Expansion",
];

// "Wealth events" = anything that isn't just a company-level market signal.
export const WEALTH_EVENT_CATEGORIES: Category[] = CATEGORIES.filter(
  (c) => CATEGORY_GROUPS[c] !== "Market Signal"
);

// Places treated as "in region" for scoring/filtering. Keep lowercase.
export const REGION_TERMS: string[] = [
  "columbus",
  "central ohio",
  "dublin, ohio",
  "dublin, oh",
  "westerville",
  "new albany, ohio",
  "new albany, oh",
  "worthington, ohio",
  "worthington, oh",
  "gahanna",
  "hilliard",
  "upper arlington",
  "grandview heights",
  "bexley",
  "powell, ohio",
  "franklin county, ohio",
  "delaware county, ohio",
];

// Keyword sets used for naive classification. A story can match more than
// one category (e.g. an owner sells a company AND names a new CEO).
export const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  IPO: [
    "ipo",
    "initial public offering",
    "spac",
    "special purpose acquisition",
    "goes public",
    "going public",
    "files for ipo",
    "ipo filing",
  ],
  "M&A": [
    "acquires",
    "acquired by",
    "acquisition of",
    "to acquire",
    "merger",
    "merges with",
    "to be acquired",
    "definitive agreement",
    "purchase of",
    "acquires majority",
    "majority stake",
    "divests",
    "divestiture",
  ],
  "PE Investment": [
    "private equity",
    "growth equity",
    "buyout",
    "leveraged buyout",
    "backed by private equity",
    "pe firm",
    "recapitalization",
    "recapitalize",
    "minority investment",
    "growth investment",
  ],
  "Founder Exit": [
    "steps down",
    "stepping down",
    "resigns",
    "resignation",
    "retires as",
    "retiring as",
    "sold his stake",
    "sold her stake",
    "sells stake",
    "cashes out",
    "cash out",
    "exits company",
    "founder departs",
    "steps back",
  ],
  "Executive Hiring": [
    "names ceo",
    "named ceo",
    "appoints ceo",
    "appointed ceo",
    "appoints president",
    "names president",
    "joins as ceo",
    "joins as president",
    "new ceo",
    "new president",
    "succeeds",
    "named chairman",
    "promoted to",
  ],
  "Stock Sale": [
    "secondary sale",
    "secondary offering",
    "tender offer",
    "insider sale",
    "sells shares",
    "share sale",
    "sold shares",
    "stock sale",
    "special dividend",
  ],
  "Foundation Created": [
    "establishes foundation",
    "launches foundation",
    "creates foundation",
    "family foundation",
    "private foundation",
    "starts foundation",
    "new foundation",
  ],
  Divorce: ["files for divorce", "divorce settlement", "divorcing", "finalizes divorce", "divorce filing"],
  "Estate Filing": [
    "estate filing",
    "files estate",
    "probate filing",
    "estate plan filed",
    "trust filing",
    "estate planning filed",
  ],
  "Real Estate Purchase": [
    "buys mansion",
    "purchases estate",
    "buys home for",
    "acquires property",
    "real estate purchase",
    "buys house for",
    "purchases mansion",
    "buys luxury home",
  ],
  "Charitable Donation": [
    "charitable gift",
    "philanthropic gift",
    "million gift",
    "million donation",
    "charitable donation",
    "donates to",
    "pledges donation",
  ],
  Earnings: [
    "quarterly earnings",
    "reports earnings",
    "earnings beat",
    "posts profit",
    "posts loss",
    "earnings report",
    "fourth quarter results",
    "third quarter results",
    "second quarter results",
    "first quarter results",
  ],
  Funding: [
    "funding round",
    "raises funding",
    "series a",
    "series b",
    "series c",
    "venture capital",
    "secures funding",
    "closes funding round",
    "seed funding",
  ],
  "Debt Issuance": [
    "bond offering",
    "debt offering",
    "notes offering",
    "issues bonds",
    "senior notes",
    "debt issuance",
    "private placement",
  ],
  "Spin-off": ["spins off", "spinoff", "spin-off", "to spin off", "completes spinoff"],
  "Executive Compensation Change": [
    "compensation package",
    "pay package",
    "executive pay",
    "compensation plan",
    "bonus package",
    "executive compensation",
  ],
  "New Firm / Expansion": [
    "opens office",
    "opening office",
    "new headquarters",
    "relocating",
    "relocates",
    "relocation",
    "expands",
    "expansion",
    "opens columbus",
    "opens ohio",
    "moving to columbus",
    "moving headquarters",
    "breaks ground",
    "new facility",
    "hiring spree",
    "to add jobs",
    "creating jobs",
  ],
};

export const FEED_REFRESH_LOOKBACK_DAYS = 30;

// A saved lead whose note hasn't been touched in this many days shows up
// as "cooling" in the daily brief.
export const COOLING_THRESHOLD_DAYS = 14;

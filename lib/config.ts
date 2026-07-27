// Central place to tune what this prospecting hub looks for.
// Edit REGION_TERMS to widen/narrow geography, and CATEGORY_KEYWORDS to
// tune what counts as a lead in each bucket.

export type Category =
  | "Liquidity Event"
  | "Executive Change"
  | "M&A / Buyout"
  | "New Firm / Expansion";

export const CATEGORIES: Category[] = [
  "Liquidity Event",
  "Executive Change",
  "M&A / Buyout",
  "New Firm / Expansion",
];

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
  "Liquidity Event": [
    "ipo",
    "initial public offering",
    "spac",
    "special purpose acquisition",
    "recapitalization",
    "recapitalize",
    "liquidity event",
    "secondary sale",
    "secondary offering",
    "tender offer",
    "special dividend",
    "sold his stake",
    "sold her stake",
    "sells stake",
    "cashes out",
    "cash out",
    "windfall",
    "sale proceeds",
  ],
  "Executive Change": [
    "names ceo",
    "named ceo",
    "appoints ceo",
    "appointed ceo",
    "appoints president",
    "names president",
    "steps down",
    "stepping down",
    "resigns",
    "resignation",
    "retires as",
    "retiring as",
    "chief executive officer",
    "chief financial officer",
    "chief operating officer",
    "promoted to",
    "joins as ceo",
    "joins as president",
    "new ceo",
    "new president",
    "succeeds",
    "named chairman",
  ],
  "M&A / Buyout": [
    "acquires",
    "acquired by",
    "acquisition of",
    "to acquire",
    "merger",
    "merges with",
    "buyout",
    "leveraged buyout",
    "private equity",
    "to be acquired",
    "definitive agreement",
    "sells its",
    "divests",
    "divestiture",
    "majority stake",
    "acquires majority",
    "purchase of",
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

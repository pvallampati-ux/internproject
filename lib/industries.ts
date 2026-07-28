// Configuration for the Market Insights module.
//
// Deal-type topics (acquisitions, mergers, sales) are scoped to Ohio, since
// those are real regional transactions. Policy/regulatory topics (CMS
// reimbursement, FDA approvals, capital gains tax, SBA changes) are left
// national on purpose — almost no article about a federal reimbursement
// rule or tax law change will mention "Columbus," and your clients are
// affected by these regardless of where the news datelines from. Forcing a
// region requirement on those would just make the section empty.

export type Industry = "Healthcare" | "Business Owners";

export const INDUSTRIES: Industry[] = ["Healthcare", "Business Owners"];

const OHIO_SCOPE = `("Ohio" OR "Columbus")`;

// Builds a Google News query from a flat, OR'd keyword list — the simpler
// query shape used for user-added custom industries (lib/customIndustriesStore.ts),
// as opposed to the hand-tuned two-part AND queries below for the built-ins.
export function buildQueryFromKeywords(keywords: string[], regionScoped: boolean): string {
  const quoted = keywords.map((k) => (k.includes(" ") ? `"${k}"` : k));
  const keywordClause = `(${quoted.join(" OR ")})`;
  return regionScoped ? `${OHIO_SCOPE} ${keywordClause}` : keywordClause;
}

export interface Topic {
  id: string;
  label: string;
  // Google News query fragment (OR'd keyword groups), not a strict filter —
  // Google's own relevance ranking does most of the work here.
  query: string;
  // Whether this topic requires an Ohio/Columbus mention. False for topics
  // that are inherently national (policy/regulatory).
  regionScoped: boolean;
}

export const INDUSTRY_TOPICS: Record<Industry, Topic[]> = {
  Healthcare: [
    {
      id: "dso-acquisitions",
      label: "DSO Acquisitions",
      query: `${OHIO_SCOPE} ("DSO" OR "dental service organization" OR "dental support organization") (acquires OR acquisition OR acquired OR "backed by")`,
      regionScoped: true,
    },
    {
      id: "hospital-mergers",
      label: "Hospital Mergers",
      query: `${OHIO_SCOPE} ("hospital" OR "health system") (merger OR merges OR "definitive agreement" OR "to combine")`,
      regionScoped: true,
    },
    {
      id: "physician-practice-sales",
      label: "Physician Practice Sales",
      query: `${OHIO_SCOPE} ("physician practice" OR "medical practice" OR "physician group") (sold OR acquisition OR acquires OR "private equity" OR "majority stake")`,
      regionScoped: true,
    },
    {
      id: "cms-reimbursement",
      label: "CMS Reimbursement",
      query: `(CMS OR Medicare OR Medicaid) (reimbursement OR "payment rule" OR "final rule" OR "payment rate")`,
      regionScoped: false,
    },
    {
      id: "fda-approvals",
      label: "FDA Approvals",
      query: `(FDA) (approves OR clears OR approval OR "grants approval")`,
      regionScoped: false,
    },
  ],
  "Business Owners": [
    {
      id: "sba-changes",
      label: "SBA Changes",
      query: `("SBA" OR "Small Business Administration") (rule OR change OR guidance OR "loan program")`,
      regionScoped: false,
    },
    {
      id: "capital-gains-tax",
      label: "Capital Gains Tax",
      query: `("capital gains tax" OR "capital gains rate") (change OR proposal OR increase OR cut OR reform)`,
      regionScoped: false,
    },
    {
      id: "pe-dry-powder",
      label: "PE Dry Powder",
      query: `("private equity") ("dry powder" OR "capital to deploy" OR "record levels")`,
      regionScoped: false,
    },
    {
      id: "industry-valuations",
      label: "Industry Valuations",
      query: `("valuation multiple" OR "EBITDA multiple" OR "industry valuations") (rising OR falling OR compressed OR trend)`,
      regionScoped: false,
    },
  ],
};

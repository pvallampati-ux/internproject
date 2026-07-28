import { CATEGORIES, CATEGORY_KEYWORDS, REGION_TERMS, type Category } from "./config";

export interface ClassificationResult {
  categories: Category[];
  regionMatch: boolean;
  matchedTerms: string[];
  matchedRegionTerms: string[];
  score: number;
}

function normalize(text: string): string {
  return text.toLowerCase();
}

export function classify(title: string, snippet: string): ClassificationResult {
  const haystack = normalize(`${title} ${snippet}`);
  const categories: Category[] = [];
  const matchedTerms: string[] = [];
  let keywordHits = 0;

  for (const category of CATEGORIES) {
    const keywords = CATEGORY_KEYWORDS[category];
    const hits = keywords.filter((kw) => haystack.includes(kw));
    if (hits.length > 0) {
      categories.push(category);
      matchedTerms.push(...hits);
      keywordHits += hits.length;
    }
  }

  const matchedRegionTerms = REGION_TERMS.filter((term) => haystack.includes(term));
  const regionMatch = matchedRegionTerms.length > 0;

  // Simple scoring: region relevance dominates, keyword density adds up.
  let score = 0;
  if (regionMatch) score += 5;
  score += keywordHits * 2;
  if (categories.length > 1) score += 2; // multi-category stories are often juicier leads

  return {
    categories,
    regionMatch,
    matchedTerms: [...new Set(matchedTerms)],
    matchedRegionTerms,
    score,
  };
}

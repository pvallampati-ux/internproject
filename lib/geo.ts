// Rough town-center coordinates for the specific suburbs in REGION_TERMS.
// Good enough for a static, self-contained scatter map — not survey-grade.
export const REGION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  columbus: { lat: 39.9612, lng: -82.9988 },
  "dublin, ohio": { lat: 40.0992, lng: -83.1141 },
  "dublin, oh": { lat: 40.0992, lng: -83.1141 },
  westerville: { lat: 40.1262, lng: -82.9291 },
  "new albany, ohio": { lat: 40.0817, lng: -82.8071 },
  "new albany, oh": { lat: 40.0817, lng: -82.8071 },
  "worthington, ohio": { lat: 40.0931, lng: -83.018 },
  "worthington, oh": { lat: 40.0931, lng: -83.018 },
  gahanna: { lat: 40.017, lng: -82.8852 },
  hilliard: { lat: 40.0334, lng: -83.158 },
  "upper arlington": { lat: 40.0134, lng: -83.0624 },
  "grandview heights": { lat: 39.9787, lng: -83.0396 },
  bexley: { lat: 39.9698, lng: -82.9346 },
  "powell, ohio": { lat: 40.1573, lng: -83.0752 },
};

// County/region-level terms are too broad to plot as a single point.
const GENERIC_TERMS = new Set(["central ohio", "franklin county, ohio", "delaware county, ohio"]);

// Picks the most specific plottable point out of a lead's matched region
// terms, preferring a named suburb over a generic county/region mention.
export function pickMapPoint(matchedRegionTerms: string[]): { lat: number; lng: number } | null {
  const specific = matchedRegionTerms.find(
    (t) => REGION_COORDINATES[t] && !GENERIC_TERMS.has(t)
  );
  return specific ? REGION_COORDINATES[specific] : null;
}

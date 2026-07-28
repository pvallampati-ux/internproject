// Some Google News RSS items come back with their <description> containing
// our own search query instead of real article text (an occasional feed
// quirk, not something we send). Detect and drop it rather than storing
// query syntax as if it were a snippet.
export function looksLikeLeakedQuery(text: string): boolean {
  const orCount = (text.match(/"\s*OR\s*"/g) ?? []).length;
  return orCount >= 2 || /^\(/.test(text.trim());
}

// Cheap stable id derived from a string (e.g. a link), no crypto dependency needed.
export function stableId(prefix: string, value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return `${prefix}_${Math.abs(hash)}`;
}

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { Category } from "./config";

export interface Lead {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string; // ISO string
  snippet: string;
  categories: Category[];
  regionMatch: boolean;
  matchedTerms: string[];
  score: number;
  fetchedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "leads.json");

function ensureDataFile(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, "[]", "utf-8");
}

export function loadLeads(): Lead[] {
  ensureDataFile();
  const raw = readFileSync(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw) as Lead[];
  } catch {
    return [];
  }
}

function saveLeads(leads: Lead[]): void {
  ensureDataFile();
  writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2), "utf-8");
}

// Merge newly fetched leads into the store, de-duplicating by link and
// keeping the highest-scored version of a duplicate.
export function upsertLeads(newLeads: Lead[]): { added: number; updated: number; total: number } {
  const existing = loadLeads();
  const byLink = new Map(existing.map((l) => [l.link, l]));
  let added = 0;
  let updated = 0;

  for (const lead of newLeads) {
    if (byLink.has(lead.link)) {
      updated += 1;
    } else {
      added += 1;
    }
    byLink.set(lead.link, lead);
  }

  const merged = [...byLink.values()].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  saveLeads(merged);
  return { added, updated, total: merged.length };
}

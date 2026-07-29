import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { DATA_DIR } from "./dataDir";

// User-added industry verticals for Market Insights, on top of the two
// built-in ones in lib/industries.ts. Local-only (gitignored) — same
// pattern as contacts.json/leads.json, since these are personal
// configuration, not something to ship as defaults for everyone.

export interface CustomTopic {
  id: string;
  label: string;
  keywords: string[]; // OR'd together to build the Google News query
  regionScoped: boolean;
}

export interface CustomIndustry {
  id: string;
  name: string;
  topics: CustomTopic[];
}

const DATA_FILE = path.join(DATA_DIR, "custom-industries.json");

function ensureDataFile(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, "[]", "utf-8");
}

export function loadCustomIndustries(): CustomIndustry[] {
  ensureDataFile();
  const raw = readFileSync(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw) as CustomIndustry[];
  } catch {
    return [];
  }
}

function saveCustomIndustries(industries: CustomIndustry[]): void {
  ensureDataFile();
  writeFileSync(DATA_FILE, JSON.stringify(industries, null, 2), "utf-8");
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function addCustomIndustry(input: {
  name: string;
  topics: { label: string; keywords: string[]; regionScoped: boolean }[];
}): CustomIndustry {
  const industries = loadCustomIndustries();
  const industry: CustomIndustry = {
    id: slugify(input.name) || `industry-${Date.now()}`,
    name: input.name,
    topics: input.topics.map((t) => ({
      id: slugify(t.label) || `topic-${Date.now()}`,
      label: t.label,
      keywords: t.keywords,
      regionScoped: t.regionScoped,
    })),
  };
  industries.push(industry);
  saveCustomIndustries(industries);
  return industry;
}

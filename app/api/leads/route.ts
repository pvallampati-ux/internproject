import { NextResponse } from "next/server";
import { loadLeads } from "@/lib/store";
import type { Category } from "@/lib/config";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") as Category | null;
  const days = searchParams.get("days");
  const q = searchParams.get("q")?.toLowerCase();
  const savedOnly = searchParams.get("saved") === "true";

  let leads = loadLeads();

  if (category) {
    leads = leads.filter((l) => l.categories.includes(category));
  }

  if (savedOnly) {
    leads = leads.filter((l) => l.saved);
  }

  if (days) {
    const cutoff = Date.now() - Number(days) * 24 * 60 * 60 * 1000;
    leads = leads.filter((l) => new Date(l.publishedAt).getTime() >= cutoff);
  }

  if (q) {
    leads = leads.filter(
      (l) => l.title.toLowerCase().includes(q) || l.snippet.toLowerCase().includes(q)
    );
  }

  leads = leads.sort((a, b) => b.score - a.score);

  return NextResponse.json({ leads, total: leads.length });
}

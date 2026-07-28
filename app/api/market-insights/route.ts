import { NextResponse } from "next/server";
import { loadMarketInsights } from "@/lib/marketInsightsStore";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const industry = searchParams.get("industry");
  const days = searchParams.get("days");

  let items = loadMarketInsights();

  if (industry) {
    items = items.filter((i) => i.industry === industry);
  }

  if (days) {
    const cutoff = Date.now() - Number(days) * 24 * 60 * 60 * 1000;
    items = items.filter((i) => new Date(i.publishedAt).getTime() >= cutoff);
  }

  items = items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return NextResponse.json({ items, total: items.length });
}

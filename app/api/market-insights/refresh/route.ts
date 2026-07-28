import { NextResponse } from "next/server";
import { runMarketInsightsRefresh } from "@/lib/marketInsightsRefresh";

export async function POST() {
  try {
    const summary = await runMarketInsightsRefresh();
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

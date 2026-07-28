import { NextResponse } from "next/server";
import { findWarmIntros } from "@/lib/warmIntros";

export async function GET() {
  return NextResponse.json({ matches: findWarmIntros() });
}

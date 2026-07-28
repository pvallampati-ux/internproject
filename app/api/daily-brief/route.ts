import { NextResponse } from "next/server";
import { computeDailyBrief } from "@/lib/dailyBrief";

export async function GET() {
  return NextResponse.json(computeDailyBrief());
}

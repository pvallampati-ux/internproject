import { NextResponse } from "next/server";
import { computeAnalytics } from "@/lib/analytics";

export async function GET() {
  return NextResponse.json(computeAnalytics());
}

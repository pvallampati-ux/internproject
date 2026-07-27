import { NextResponse } from "next/server";
import { runRefresh } from "@/lib/refresh";

export async function POST() {
  try {
    const summary = await runRefresh();
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

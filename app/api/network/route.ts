import { NextResponse } from "next/server";
import { buildNetworkGraph } from "@/lib/networkGraph";

export async function GET() {
  return NextResponse.json(buildNetworkGraph());
}

import { NextResponse } from "next/server";
import { loadIntroRequests, setIntroStatus } from "@/lib/introRequestsStore";
import { INTRO_STATUSES } from "@/lib/introRequestTypes";

export async function GET() {
  return NextResponse.json({ requests: loadIntroRequests() });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { prospectId, connectorId, status } = body ?? {};
  if (typeof prospectId !== "string" || typeof connectorId !== "string" || !INTRO_STATUSES.includes(status)) {
    return NextResponse.json({ error: "prospectId, connectorId, and a valid status are required" }, { status: 400 });
  }
  const updated = setIntroStatus(prospectId, connectorId, status);
  return NextResponse.json(updated);
}

import { NextResponse } from "next/server";
import { loadCustomIndustries, addCustomIndustry } from "@/lib/customIndustriesStore";

export async function GET() {
  return NextResponse.json({ industries: loadCustomIndustries() });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!Array.isArray(body.topics) || body.topics.length === 0) {
    return NextResponse.json({ error: "at least one topic is required" }, { status: 400 });
  }

  const topics = body.topics
    .map((t: unknown) => {
      const topic = t as { label?: unknown; keywords?: unknown; regionScoped?: unknown };
      return {
        label: typeof topic.label === "string" ? topic.label.trim() : "",
        keywords: Array.isArray(topic.keywords)
          ? topic.keywords.filter((k: unknown): k is string => typeof k === "string" && k.trim().length > 0)
          : [],
        regionScoped: Boolean(topic.regionScoped),
      };
    })
    .filter((t: { label: string; keywords: string[] }) => t.label && t.keywords.length > 0);

  if (topics.length === 0) {
    return NextResponse.json(
      { error: "each topic needs a label and at least one keyword" },
      { status: 400 }
    );
  }

  const industry = addCustomIndustry({ name: body.name.trim(), topics });
  return NextResponse.json(industry, { status: 201 });
}

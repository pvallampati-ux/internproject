import { useState } from "react";
import type { MeetingPrep } from "@/lib/meetingPrep";

interface Props {
  contactId: string;
  initialPrep?: MeetingPrep | null;
  onGenerated?: (prep: MeetingPrep) => void;
}

export default function AiMeetingPrep({ contactId, initialPrep, onGenerated }: Props) {
  const [prep, setPrep] = useState<MeetingPrep | null>(initialPrep ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setPrep(null);
    try {
      const res = await fetch("/api/meeting-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setPrep(data);
        onGenerated?.(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 border-t border-charcoal-700 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-base text-gray-100">AI Meeting Prep</h3>
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-md bg-gold-500 px-3 py-1.5 text-xs font-medium text-charcoal-950 hover:bg-gold-400 disabled:opacity-50"
        >
          {loading ? "Generating..." : prep ? "Regenerate" : "Generate"}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {prep && (
        <div className="mt-3 space-y-4 rounded-lg border border-gold-500/30 bg-gold-500/5 p-4">
          <p className="text-xs font-medium text-gold-400">
            ⚠ AI-generated inference, not verified — confirm before use, especially any financial
            figures.
          </p>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Executive Summary
            </h4>
            <p className="mt-1 text-sm text-gray-300">{prep.executiveSummary}</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Likely Needs
            </h4>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-gray-300">
              {prep.likelyNeeds.map((need, i) => (
                <li key={i}>{need}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Suggested Questions
            </h4>
            <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">Open-ended</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-gray-300">
                  {prep.suggestedQuestions.openEnded.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs text-gray-500">Relationship building</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-gray-300">
                  {prep.suggestedQuestions.relationshipBuilding.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs text-gray-500">Technical</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-gray-300">
                  {prep.suggestedQuestions.technical.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Risks</h4>
            {prep.risks.length === 0 ? (
              <p className="mt-1 text-sm text-gray-600">None surfaced.</p>
            ) : (
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-gray-300">
                {prep.risks.map((risk, i) => (
                  <li key={i}>{risk}</li>
                ))}
              </ul>
            )}
          </div>

          {prep.citations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Sources
              </h4>
              <ul className="mt-1 space-y-0.5">
                {prep.citations.map((url, i) => (
                  <li key={i} className="truncate text-xs">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gold-400 hover:underline"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

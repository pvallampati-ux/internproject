import { JOURNEY_STAGES, type PipelineStage } from "@/lib/contactTypes";

interface Props {
  counts: Record<PipelineStage, number>;
}

export default function PipelineFunnel({ counts }: Props) {
  const total = JOURNEY_STAGES.reduce((sum, s) => sum + counts[s], 0);

  return (
    <div className="flex items-stretch">
      {JOURNEY_STAGES.map((stage, i) => {
        const count = counts[stage];
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={stage} className="flex flex-1 items-center">
            <div className="flex-1 rounded-lg border border-charcoal-700 bg-charcoal-800 px-3 py-3 text-center">
              <p className="text-2xl font-semibold text-gold-400">{count}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-gray-400">{stage}</p>
              <p className="text-xs text-gray-600">{pct}%</p>
            </div>
            {i < JOURNEY_STAGES.length - 1 && (
              <span className="mx-1 shrink-0 text-xl text-charcoal-700">→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

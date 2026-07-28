import { useState } from "react";
import type { Lead } from "@/lib/store";
import { REGION_COORDINATES } from "@/lib/geo";

interface PlottedLead {
  lead: Lead;
  point: { lat: number; lng: number };
}

interface Props {
  plotted: PlottedLead[];
}

const LAT_MIN = 39.9;
const LAT_MAX = 40.2;
const LNG_MIN = -83.2;
const LNG_MAX = -82.75;
const WIDTH = 700;
const HEIGHT = 500;
const PADDING = 40;

function project(lat: number, lng: number): { x: number; y: number } {
  const x = PADDING + ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * (WIDTH - 2 * PADDING);
  const y = PADDING + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (HEIGHT - 2 * PADDING);
  return { x, y };
}

interface Cluster {
  key: string;
  x: number;
  y: number;
  leads: Lead[];
}

export default function RegionMap({ plotted }: Props) {
  const [selected, setSelected] = useState<Cluster | null>(null);

  const clusters = new Map<string, Cluster>();
  for (const { lead, point } of plotted) {
    const key = `${point.lat.toFixed(3)},${point.lng.toFixed(3)}`;
    const { x, y } = project(point.lat, point.lng);
    const existing = clusters.get(key);
    if (existing) {
      existing.leads.push(lead);
    } else {
      clusters.set(key, { key, x, y, leads: [lead] });
    }
  }

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full rounded-lg border border-charcoal-700 bg-charcoal-800">
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="#1e1e1e" />

        {Object.entries(REGION_COORDINATES).map(([name, coords]) => {
          const { x, y } = project(coords.lat, coords.lng);
          return (
            <g key={name}>
              <circle cx={x} cy={y} r={2} fill="#444" />
              <text x={x + 6} y={y + 3} fontSize={10} fill="#666">
                {name.split(",")[0]}
              </text>
            </g>
          );
        })}

        {[...clusters.values()].map((cluster) => {
          const r = Math.min(10 + Math.sqrt(cluster.leads.length) * 4, 28);
          return (
            <g key={cluster.key} onClick={() => setSelected(cluster)} className="cursor-pointer">
              <circle cx={cluster.x} cy={cluster.y} r={r} fill="#c39a4f" fillOpacity={0.25} stroke="#c39a4f" />
              <text
                x={cluster.x}
                y={cluster.y + 4}
                fontSize={12}
                fill="#f4f1ea"
                textAnchor="middle"
                fontWeight={600}
              >
                {cluster.leads.length}
              </text>
            </g>
          );
        })}
      </svg>

      {selected && (
        <div className="mt-3 rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-100">{selected.leads.length} lead(s) here</p>
            <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-300">
              &times;
            </button>
          </div>
          <ul className="mt-2 space-y-1">
            {selected.leads.map((lead) => (
              <li key={lead.id}>
                <a
                  href={lead.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-300 hover:text-gold-400 hover:underline"
                >
                  {lead.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

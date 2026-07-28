import { useState } from "react";
import Link from "next/link";
import type { Contact } from "@/lib/contactTypes";
import { REGION_COORDINATES } from "@/lib/geo";

interface PlottedContact {
  contact: Contact;
  point: { lat: number; lng: number };
}

interface Props {
  prospects: PlottedContact[];
  clients: PlottedContact[];
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
  contacts: Contact[];
}

function buildClusters(plotted: PlottedContact[]): Cluster[] {
  const clusters = new Map<string, Cluster>();
  for (const { contact, point } of plotted) {
    const key = `${point.lat.toFixed(3)},${point.lng.toFixed(3)}`;
    const { x, y } = project(point.lat, point.lng);
    const existing = clusters.get(key);
    if (existing) {
      existing.contacts.push(contact);
    } else {
      clusters.set(key, { key, x, y, contacts: [contact] });
    }
  }
  return [...clusters.values()];
}

function townDots() {
  return Object.entries(REGION_COORDINATES).map(([name, coords]) => {
    const { x, y } = project(coords.lat, coords.lng);
    return (
      <g key={name}>
        <circle cx={x} cy={y} r={2} fill="#444" />
        <text x={x + 6} y={y + 3} fontSize={10} fill="#666">
          {name.split(",")[0]}
        </text>
      </g>
    );
  });
}

// One color per stage bucket, matching the Network diagram convention
// established elsewhere in the app: Client = green, in-pipeline = blue.
const PROSPECT_COLOR = "#38bdf8";
const CLIENT_COLOR = "#34d399";

function SelectedList({ cluster, onClose }: { cluster: Cluster; onClose: () => void }) {
  return (
    <div className="mt-3 rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-100">{cluster.contacts.length} contact(s) here</p>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
          &times;
        </button>
      </div>
      <ul className="mt-2 space-y-1">
        {cluster.contacts.map((contact) => (
          <li key={contact.id}>
            <Link href={`/contacts/${contact.id}`} className="text-sm text-gray-300 hover:text-gold-400 hover:underline">
              {contact.name}
              {contact.company && <span className="text-gray-500"> — {contact.company}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Splits the old single "Contact Heat Map" into a prospect map and a client
// map — same static-SVG-scatter approach, but bucketed by pipeline stage so
// you can see book-of-business geography for each separately. Side-by-side
// is the default; overlay plots both layers on one shared set of axes (same
// project() function for both, so a town with both prospects and clients
// naturally shows overlapping circles).
export default function RelationshipMap({ prospects, clients }: Props) {
  const [mode, setMode] = useState<"side" | "overlay">("side");
  const [selected, setSelected] = useState<{ cluster: Cluster; source: "prospect" | "client" } | null>(null);

  const prospectClusters = buildClusters(prospects);
  const clientClusters = buildClusters(clients);

  function handleSelect(cluster: Cluster, source: "prospect" | "client") {
    setSelected({ cluster, source });
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PROSPECT_COLOR }} />
          <span className="text-gray-400">Prospects</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CLIENT_COLOR }} />
          <span className="text-gray-400">Clients</span>
        </div>
        <div className="ml-auto flex gap-1 rounded-full border border-charcoal-700 p-0.5">
          <button
            onClick={() => setMode("side")}
            className={`rounded-full px-3 py-1 ${mode === "side" ? "bg-gold-500/10 text-gold-400" : "text-gray-500 hover:text-gray-300"}`}
          >
            Side by side
          </button>
          <button
            onClick={() => setMode("overlay")}
            className={`rounded-full px-3 py-1 ${mode === "overlay" ? "bg-gold-500/10 text-gold-400" : "text-gray-500 hover:text-gray-300"}`}
          >
            Overlay
          </button>
        </div>
      </div>

      {mode === "side" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs text-gray-500">Prospects ({prospects.length})</p>
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full rounded-lg border border-charcoal-700 bg-charcoal-800">
              <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="#1e1e1e" />
              {townDots()}
              {prospectClusters.map((cluster) => {
                const r = Math.min(10 + Math.sqrt(cluster.contacts.length) * 4, 28);
                return (
                  <g key={cluster.key} onClick={() => handleSelect(cluster, "prospect")} className="cursor-pointer">
                    <circle cx={cluster.x} cy={cluster.y} r={r} fill={PROSPECT_COLOR} fillOpacity={0.28} stroke={PROSPECT_COLOR} />
                    <text x={cluster.x} y={cluster.y + 4} fontSize={12} fill="#f4f1ea" textAnchor="middle" fontWeight={600}>
                      {cluster.contacts.length}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div>
            <p className="mb-1 text-xs text-gray-500">Clients ({clients.length})</p>
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full rounded-lg border border-charcoal-700 bg-charcoal-800">
              <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="#1e1e1e" />
              {townDots()}
              {clientClusters.map((cluster) => {
                const r = Math.min(10 + Math.sqrt(cluster.contacts.length) * 4, 28);
                return (
                  <g key={cluster.key} onClick={() => handleSelect(cluster, "client")} className="cursor-pointer">
                    <circle cx={cluster.x} cy={cluster.y} r={r} fill={CLIENT_COLOR} fillOpacity={0.28} stroke={CLIENT_COLOR} />
                    <text x={cluster.x} y={cluster.y + 4} fontSize={12} fill="#f4f1ea" textAnchor="middle" fontWeight={600}>
                      {cluster.contacts.length}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      ) : (
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full rounded-lg border border-charcoal-700 bg-charcoal-800">
          <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="#1e1e1e" />
          {townDots()}
          {prospectClusters.map((cluster) => {
            const r = Math.min(10 + Math.sqrt(cluster.contacts.length) * 4, 28);
            return (
              <g key={`p-${cluster.key}`} onClick={() => handleSelect(cluster, "prospect")} className="cursor-pointer">
                <circle cx={cluster.x} cy={cluster.y} r={r} fill={PROSPECT_COLOR} fillOpacity={0.22} stroke={PROSPECT_COLOR} />
              </g>
            );
          })}
          {clientClusters.map((cluster) => {
            const r = Math.min(10 + Math.sqrt(cluster.contacts.length) * 4, 28);
            return (
              <g key={`c-${cluster.key}`} onClick={() => handleSelect(cluster, "client")} className="cursor-pointer">
                <circle cx={cluster.x} cy={cluster.y} r={r} fill={CLIENT_COLOR} fillOpacity={0.22} stroke={CLIENT_COLOR} />
              </g>
            );
          })}
          {prospectClusters.map((cluster) => (
            <text
              key={`tp-${cluster.key}`}
              x={cluster.x}
              y={cluster.y - 2}
              fontSize={11}
              fill={PROSPECT_COLOR}
              textAnchor="middle"
              fontWeight={600}
              className="pointer-events-none"
            >
              {cluster.contacts.length}
            </text>
          ))}
          {clientClusters.map((cluster) => (
            <text
              key={`tc-${cluster.key}`}
              x={cluster.x}
              y={cluster.y + 12}
              fontSize={11}
              fill={CLIENT_COLOR}
              textAnchor="middle"
              fontWeight={600}
              className="pointer-events-none"
            >
              {cluster.contacts.length}
            </text>
          ))}
        </svg>
      )}

      {selected && <SelectedList cluster={selected.cluster} onClose={() => setSelected(null)} />}
    </div>
  );
}

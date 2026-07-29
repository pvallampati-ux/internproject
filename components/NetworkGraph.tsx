import { useMemo, useState } from "react";
import type { Contact } from "@/lib/contactTypes";
import type { NetworkEdge } from "@/lib/networkGraph";

interface Props {
  contacts: Contact[];
  edges: NetworkEdge[];
}

const SIZE = 700;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 90;

// Node color follows pipeline stage — Client vs. still-a-prospect vs. Cold
// — so the diagram distinguishes who's already a client from who isn't at
// a glance. The gold COI ring is orthogonal (a COI can also be a client).
function stageStyle(contact: Contact): { fill: string; stroke: string } {
  if (contact.stage === "Client") return { fill: "#10b98133", stroke: "#10b981" };
  if (contact.stage === "Cold") return { fill: "#6b728033", stroke: "#6b7280" };
  return { fill: "#38bdf833", stroke: "#38bdf8" };
}

function positions(contacts: Contact[]): Map<string, { x: number; y: number }> {
  const map = new Map<string, { x: number; y: number }>();
  const n = contacts.length;
  contacts.forEach((c, i) => {
    const angle = (2 * Math.PI * i) / Math.max(n, 1) - Math.PI / 2;
    map.set(c.id, {
      x: CENTER + RADIUS * Math.cos(angle),
      y: CENTER + RADIUS * Math.sin(angle),
    });
  });
  return map;
}

export default function NetworkGraph({ contacts, edges }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pos = useMemo(() => positions(contacts), [contacts]);
  const byId = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  const connectedIds = selectedId
    ? new Set(
        edges
          .filter((e) => e.fromId === selectedId || e.toId === selectedId)
          .flatMap((e) => [e.fromId, e.toId])
      )
    : null;

  return (
    <div>
      <div className="flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-4 bg-gold-500" /> Referral
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-4 border-t border-dashed border-gray-500" /> Possible
          warm intro
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-3 w-3 rounded-full border-2"
            style={{ backgroundColor: "#10b98133", borderColor: "#10b981" }}
          />{" "}
          Client
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-3 w-3 rounded-full border-2"
            style={{ backgroundColor: "#38bdf833", borderColor: "#38bdf8" }}
          />{" "}
          Prospect (in pipeline)
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-3 w-3 rounded-full border-2"
            style={{ backgroundColor: "#6b728033", borderColor: "#6b7280" }}
          />{" "}
          Cold
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-gold-500" /> Center of
          Influence (ring)
        </span>
      </div>

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto mt-3 block w-full max-w-xl rounded-lg border border-charcoal-700 bg-charcoal-800"
      >
        {edges.map((edge, i) => {
          const from = pos.get(edge.fromId);
          const to = pos.get(edge.toId);
          if (!from || !to) return null;
          const dimmed = connectedIds && !(connectedIds.has(edge.fromId) && connectedIds.has(edge.toId));
          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={edge.type === "referral" ? "#c39a4f" : "#6b7280"}
              strokeWidth={edge.type === "referral" ? 2 : 1}
              strokeDasharray={edge.type === "warm-intro" ? "4 3" : undefined}
              opacity={dimmed ? 0.1 : 0.7}
            />
          );
        })}

        {contacts.map((contact) => {
          const p = pos.get(contact.id);
          if (!p) return null;
          const dimmed = connectedIds && !connectedIds.has(contact.id) && selectedId !== contact.id;
          const r = contact.isCOI ? 14 : 9;
          const { fill, stroke } = stageStyle(contact);
          return (
            <g
              key={contact.id}
              className="cursor-pointer"
              opacity={dimmed ? 0.3 : 1}
              onMouseEnter={() => setSelectedId(contact.id)}
              onMouseLeave={() => setSelectedId(null)}
              onClick={() => (window.location.href = `/contacts/${contact.id}`)}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={fill}
                stroke={contact.isCOI ? "#c39a4f" : stroke}
                strokeWidth={contact.isCOI ? 2.5 : 1.5}
              />
              <text
                x={p.x}
                y={p.y + r + 14}
                textAnchor="middle"
                fontSize={11}
                fill={contact.isCOI ? "#c39a4f" : "#d1d5db"}
              >
                {contact.name}
              </text>
            </g>
          );
        })}
      </svg>

      {selectedId && byId.get(selectedId) && (
        <p className="mt-2 text-xs text-gray-500">
          Hovering: <span className="text-gray-300">{byId.get(selectedId)!.name}</span>
          {" — "}
          {byId.get(selectedId)!.stage}
          {byId.get(selectedId)!.isCOI ? " · COI" : ""} — click to open their profile.
        </p>
      )}
    </div>
  );
}

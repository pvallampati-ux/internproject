"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Contact } from "@/lib/contactTypes";
import type { Lead } from "@/lib/store";

interface PlottedContact {
  contact: Contact;
  point: { lat: number; lng: number };
}

interface PlottedLead {
  lead: Lead;
  point: { lat: number; lng: number };
}

interface Props {
  prospects: PlottedContact[];
  clients: PlottedContact[];
  leads?: PlottedLead[];
}

// Center of the Columbus, OH metro — matches lib/geo.ts's REGION_COORDINATES.
const CENTER: [number, number] = [39.99, -83.0];
const DEFAULT_ZOOM = 10;

interface Cluster {
  key: string;
  lat: number;
  lng: number;
  contacts: Contact[];
}

interface LeadCluster {
  key: string;
  lat: number;
  lng: number;
  leads: Lead[];
}

function buildClusters(plotted: PlottedContact[]): Cluster[] {
  const clusters = new Map<string, Cluster>();
  for (const { contact, point } of plotted) {
    const key = `${point.lat.toFixed(3)},${point.lng.toFixed(3)}`;
    const existing = clusters.get(key);
    if (existing) {
      existing.contacts.push(contact);
    } else {
      clusters.set(key, { key, lat: point.lat, lng: point.lng, contacts: [contact] });
    }
  }
  return [...clusters.values()];
}

function buildLeadClusters(plotted: PlottedLead[]): LeadCluster[] {
  const clusters = new Map<string, LeadCluster>();
  for (const { lead, point } of plotted) {
    const key = `${point.lat.toFixed(3)},${point.lng.toFixed(3)}`;
    const existing = clusters.get(key);
    if (existing) {
      existing.leads.push(lead);
    } else {
      clusters.set(key, { key, lat: point.lat, lng: point.lng, leads: [lead] });
    }
  }
  return [...clusters.values()];
}

// One color per stage bucket, matching the Network diagram convention
// established elsewhere in the app: Client = green, in-pipeline = blue.
// News leads reuse the gold accent used for leads everywhere else in the
// app and render as a diamond divIcon instead of a circle so they stay
// visually distinct from prospect/client clusters even when co-located.
const PROSPECT_COLOR = "#38bdf8";
const CLIENT_COLOR = "#34d399";
const LEAD_COLOR = "#c39a4f";

function leadDivIcon(count: number): L.DivIcon {
  const size = Math.min(16 + Math.sqrt(count) * 6, 40);
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;transform:rotate(45deg);background:${LEAD_COLOR}55;border:1.5px solid ${LEAD_COLOR};display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(-45deg);color:#f4f1ea;font-size:11px;font-weight:600;">${count}</span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function ContactPopup({ contacts }: { contacts: Contact[] }) {
  return (
    <div className="min-w-[160px]">
      <p className="text-xs font-medium text-gray-100">{contacts.length} contact(s) here</p>
      <ul className="mt-1 space-y-0.5">
        {contacts.map((contact) => (
          <li key={contact.id}>
            <Link href={`/contacts/${contact.id}`} className="text-xs text-gray-300 hover:text-gold-400 hover:underline">
              {contact.name}
              {contact.company && <span className="text-gray-500"> — {contact.company}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LeadPopup({ leads }: { leads: Lead[] }) {
  return (
    <div className="min-w-[160px]">
      <p className="text-xs font-medium text-gray-100">{leads.length} lead(s) here</p>
      <ul className="mt-1 space-y-0.5">
        {leads.map((lead) => (
          <li key={lead.id}>
            <a
              href={lead.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-300 hover:text-gold-400 hover:underline"
            >
              {lead.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContactCircleMarkers({ clusters, color }: { clusters: Cluster[]; color: string }) {
  return (
    <>
      {clusters.map((cluster) => {
        const r = Math.min(10 + Math.sqrt(cluster.contacts.length) * 4, 28);
        return (
          <CircleMarker
            key={cluster.key}
            center={[cluster.lat, cluster.lng]}
            radius={r}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.35, weight: 1.5 }}
          >
            <Popup>
              <ContactPopup contacts={cluster.contacts} />
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

function LeadMarkers({ clusters }: { clusters: LeadCluster[] }) {
  return (
    <>
      {clusters.map((cluster) => (
        <Marker key={`l-${cluster.key}`} position={[cluster.lat, cluster.lng]} icon={leadDivIcon(cluster.leads.length)}>
          <Popup>
            <LeadPopup leads={cluster.leads} />
          </Popup>
        </Marker>
      ))}
    </>
  );
}

// Keeps Leaflet's internal tile grid in sync when the container is resized
// (the "Make bigger" toggle, or the browser's own resize-handle drag) —
// Leaflet sizes itself once on mount and otherwise has no way to notice a
// CSS-driven size change on its own.
function ResizeSync({ watch }: { watch: unknown }) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  useEffect(() => {
    map.invalidateSize();
  }, [map, watch]);
  return null;
}

const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function LiveMap({
  heightClass,
  expanded,
  children,
}: {
  heightClass: string;
  expanded: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`w-full ${heightClass} resize-y overflow-hidden rounded-lg border border-charcoal-700`}
      style={{ minHeight: 260 }}
    >
      <MapContainer center={CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom className="h-full w-full bg-charcoal-800">
        <TileLayer attribution={ATTRIBUTION} url={TILE_URL} />
        <ResizeSync watch={expanded} />
        {children}
      </MapContainer>
    </div>
  );
}

// Splits the old single "Contact Heat Map" into a prospect map and a client
// map, bucketed by pipeline stage so you can see book-of-business geography
// for each separately. Side-by-side is the default; overlay plots both
// layers on one shared real map. News leads are an optional third layer,
// toggled on top of either mode. Backed by react-leaflet + OpenStreetMap
// tiles (free, no API key) instead of a hand-drawn static SVG scatter, so
// it actually pans/zooms/scrolls like a real map.
export default function RelationshipMap({ prospects, clients, leads = [] }: Props) {
  const [mode, setMode] = useState<"side" | "overlay">("side");
  const [showLeads, setShowLeads] = useState(leads.length > 0);
  const [expanded, setExpanded] = useState(false);

  const prospectClusters = buildClusters(prospects);
  const clientClusters = buildClusters(clients);
  const leadClusters = buildLeadClusters(leads);
  const heightClass = expanded ? "h-[700px]" : "h-[420px]";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PROSPECT_COLOR }} />
          <span className="text-gray-400">Prospects</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CLIENT_COLOR }} />
          <span className="text-gray-400">Clients</span>
        </div>
        {leads.length > 0 && (
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={showLeads}
              onChange={(e) => setShowLeads(e.target.checked)}
              className="h-3 w-3 accent-gold-500"
            />
            <span className="inline-block h-2.5 w-2.5 rotate-45" style={{ backgroundColor: LEAD_COLOR }} />
            <span className="text-gray-400">News leads ({leads.length})</span>
          </label>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-full border border-charcoal-700 px-3 py-1 text-gray-400 hover:text-gray-200"
          >
            {expanded ? "Smaller" : "Make bigger"}
          </button>
          <div className="flex gap-1 rounded-full border border-charcoal-700 p-0.5">
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
      </div>

      <p className="mb-2 text-[11px] text-gray-600">Drag to pan, scroll to zoom, or drag the bottom-right corner to resize.</p>

      {mode === "side" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs text-gray-500">Prospects ({prospects.length})</p>
            <LiveMap heightClass={heightClass} expanded={expanded}>
              {showLeads && <LeadMarkers clusters={leadClusters} />}
              <ContactCircleMarkers clusters={prospectClusters} color={PROSPECT_COLOR} />
            </LiveMap>
          </div>
          <div>
            <p className="mb-1 text-xs text-gray-500">Clients ({clients.length})</p>
            <LiveMap heightClass={heightClass} expanded={expanded}>
              {showLeads && <LeadMarkers clusters={leadClusters} />}
              <ContactCircleMarkers clusters={clientClusters} color={CLIENT_COLOR} />
            </LiveMap>
          </div>
        </div>
      ) : (
        <LiveMap heightClass={heightClass} expanded={expanded}>
          {showLeads && <LeadMarkers clusters={leadClusters} />}
          <ContactCircleMarkers clusters={prospectClusters} color={PROSPECT_COLOR} />
          <ContactCircleMarkers clusters={clientClusters} color={CLIENT_COLOR} />
        </LiveMap>
      )}
    </div>
  );
}

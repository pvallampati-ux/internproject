import { useState } from "react";
import {
  PIPELINE_STAGES,
  touchpointCount,
  estimateWealthGap,
  type Contact,
  type PipelineStage,
} from "@/lib/contactTypes";
import { assessRelationshipHealth } from "@/lib/relationshipHealth";
import { detectLifeStage } from "@/lib/lifeStages";
import { calculateProspectScore, type ProspectScoreWeights } from "@/lib/prospectScore";
import { useContactDrawer } from "@/lib/contactDrawerContext";
import type { WhyNowResult } from "@/lib/whyNowScore";
import EmailAction from "@/components/EmailAction";
import CallAction from "@/components/CallAction";
import { bankerName } from "@/lib/bankers";

const HEALTH_DOT: Record<string, string> = {
  Strong: "bg-emerald-400",
  Steady: "bg-sky-400",
  Declining: "bg-amber-400",
  "At Risk": "bg-red-400",
};

const SCORE_BAND_STYLES: Record<string, string> = {
  "Very High": "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  High: "border-sky-500/50 bg-sky-500/10 text-sky-400",
  Medium: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  Low: "border-gray-500/50 bg-gray-500/10 text-gray-400",
};

interface Props {
  contact: Contact;
  whyNow?: WhyNowResult;
  // Show which banker's book this contact belongs to — only meaningful
  // when the board is showing more than one banker's contacts at once
  // (the "All Bankers" Pipeline view).
  showBanker?: boolean;
  // Prospect Score weights (see Settings) — falls back to the built-in
  // defaults if not passed.
  prospectScoreWeights?: ProspectScoreWeights;
  onStageChange: (id: string, stage: PipelineStage) => void;
  onMarkContacted: (id: string) => void;
  onAddNote: (id: string, text: string) => void;
}

function whyNowBand(score: number): "High" | "Medium" | "Low" {
  if (score >= 40) return "High";
  if (score >= 15) return "Medium";
  return "Low";
}

const WHY_NOW_STYLES: Record<string, string> = {
  High: "border-red-500/50 bg-red-500/10 text-red-400",
  Medium: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  Low: "border-gray-500/50 bg-gray-500/10 text-gray-400",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    value
  );
}

export default function ContactCard({
  contact,
  whyNow,
  showBanker,
  prospectScoreWeights,
  onStageChange,
  onMarkContacted,
  onAddNote,
}: Props) {
  const [noteDraft, setNoteDraft] = useState("");
  const [showLog, setShowLog] = useState(false);
  const [emailOverride, setEmailOverride] = useState<string | undefined>(undefined);
  const [phoneOverride, setPhoneOverride] = useState<string | undefined>(undefined);
  const { openDrawer } = useContactDrawer();

  function submitNote() {
    if (!noteDraft.trim()) return;
    onAddNote(contact.id, noteDraft.trim());
    setNoteDraft("");
  }

  const daysSinceContact = Math.floor(
    (Date.now() - new Date(contact.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const overdue = contact.stage !== "Cold" && daysSinceContact > contact.cadenceDays;
  const health = assessRelationshipHealth(contact).health;
  const lifeStage = detectLifeStage(contact);
  const wealthGap = estimateWealthGap(contact);
  const prospectScore = calculateProspectScore(contact, prospectScoreWeights);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", contact.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="group relative cursor-grab rounded-lg border border-charcoal-700 bg-charcoal-800 p-3 active:cursor-grabbing"
    >
      {/* Compact default view — name, company, and a flag if a touchpoint is
          due. Everything else lives in the hover panel below so the board
          stays scannable without scrolling through every field. */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => openDrawer(contact.id)} className="min-w-0 flex-1 text-left hover:underline">
          <p className="truncate font-serif text-base font-semibold text-gray-100">{contact.name}</p>
        </button>
        {overdue && (
          <button
            onClick={() => onMarkContacted(contact.id)}
            className="shrink-0 text-sm text-amber-400 hover:text-gold-400"
            title={`${daysSinceContact - contact.cadenceDays}d overdue — click to mark contacted`}
          >
            ⚑
          </button>
        )}
      </div>
      {contact.company && <p className="truncate text-sm text-gray-400">{contact.company}</p>}
      {showBanker && (
        <span className="mt-1 inline-block rounded-full border border-charcoal-700 bg-charcoal-900 px-1.5 py-0.5 text-[10px] text-gray-500">
          {bankerName(contact.bankerId)}
        </span>
      )}
      {whyNow && whyNow.score > 0 && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <span
            className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${WHY_NOW_STYLES[whyNowBand(whyNow.score)]}`}
            title={whyNow.reasoning.join("; ")}
          >
            {whyNow.score}
          </span>
          <p className="truncate text-[11px] text-gray-500">{whyNow.recommendedAction}</p>
        </div>
      )}

      {/* Full detail — revealed on hover, positioned to overlay rather than
          push the column layout around. */}
      <div className="invisible absolute left-0 top-full z-20 w-full space-y-3 rounded-lg border border-gold-500/40 bg-charcoal-800 p-4 text-left opacity-0 shadow-xl transition-opacity duration-100 group-hover:visible group-hover:opacity-100">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${HEALTH_DOT[health]}`} />
          <span className="text-xs text-gray-500">Relationship health: {health}</span>
          {lifeStage && (
            <span className="rounded-full border border-gold-500/50 bg-gold-500/10 px-2 py-0.5 text-xs font-medium text-gold-400">
              {lifeStage}
            </span>
          )}
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${SCORE_BAND_STYLES[prospectScore.band]}`}
            title={prospectScore.reasons.join("; ") || "Not enough data yet to explain the score."}
          >
            Score: {prospectScore.score} ({prospectScore.band})
          </span>
        </div>

        <select
          value={contact.stage}
          onChange={(e) => onStageChange(contact.id, e.target.value as PipelineStage)}
          className="w-full rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1 text-xs text-gray-200 focus:border-gold-500 focus:outline-none"
        >
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {contact.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-charcoal-900 px-2 py-0.5 text-xs text-gray-400">
                {tag}
              </span>
            ))}
          </div>
        )}

        {(contact.estimatedValue || contact.referredBy) && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
            {contact.estimatedValue !== undefined && (
              <span>
                Est. wealth: <span className="text-gold-400">{formatCurrency(contact.estimatedValue)}</span>
                {wealthGap !== null && wealthGap > 0 && (
                  <span className="text-gray-500"> · {formatCurrency(wealthGap)} not yet captured</span>
                )}
              </span>
            )}
            {contact.referredBy &&
              (contact.referredByContactId ? (
                <span>
                  Referred by{" "}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDrawer(contact.referredByContactId!);
                    }}
                    className="text-gold-400 hover:underline"
                  >
                    {contact.referredBy}
                  </button>
                </span>
              ) : (
                <span>Referred by {contact.referredBy}</span>
              ))}
          </div>
        )}

        {contact.sourceLeadTitle && contact.stage !== "Client" && (
          <a
            href={contact.sourceLeadLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="block truncate rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1 text-xs text-gray-500 hover:border-gold-500/50 hover:text-gold-400"
            title={contact.sourceLeadTitle}
          >
            📰 {contact.sourceLeadTitle}
          </a>
        )}

        <div className="text-xs">
          <p className={overdue ? "text-amber-400" : "text-gray-500"}>
            Last contact {formatDate(contact.lastContactedAt)} · every {contact.cadenceDays}d
            {overdue ? ` (${daysSinceContact - contact.cadenceDays}d overdue)` : ""}
          </p>
          <p className="mt-1 text-gray-500">{touchpointCount(contact)} touchpoint(s) so far</p>
        </div>

        <button
          onClick={() => onMarkContacted(contact.id)}
          className="w-full rounded-md border border-gold-500/50 px-2 py-1 text-xs text-gold-400 hover:bg-gold-500/10"
        >
          Mark contacted
        </button>

        <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
          <EmailAction
            contactId={contact.id}
            email={emailOverride ?? contact.email}
            onEmailSaved={setEmailOverride}
            compact
          />
          <CallAction
            contactId={contact.id}
            phone={phoneOverride ?? contact.phone}
            onPhoneSaved={setPhoneOverride}
            compact
          />
        </div>

        <button
          onClick={() => setShowLog(!showLog)}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          {showLog ? "Hide" : "Show"} notes ({contact.noteLog.length})
        </button>

        {showLog && (
          <div className="space-y-2">
            {[...contact.noteLog].reverse().map((entry, i) => (
              <div key={i} className="rounded-md bg-charcoal-900 px-2 py-1.5 text-xs">
                <span className="text-gray-500">{formatDate(entry.date)} — </span>
                <span className="text-gray-300">{entry.text}</span>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitNote()}
                placeholder="Add a note..."
                className="flex-1 rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
              />
              <button
                onClick={submitNote}
                className="rounded-md bg-gold-500 px-2 py-1.5 text-xs font-medium text-charcoal-950 hover:bg-gold-400"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

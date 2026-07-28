import { useState } from "react";
import { PIPELINE_STAGES, type Contact, type PipelineStage } from "@/lib/contactTypes";

interface Props {
  contact: Contact;
  onStageChange: (id: string, stage: PipelineStage) => void;
  onMarkContacted: (id: string) => void;
  onAddNote: (id: string, text: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ContactCard({ contact, onStageChange, onMarkContacted, onAddNote }: Props) {
  const [noteDraft, setNoteDraft] = useState("");
  const [showLog, setShowLog] = useState(false);

  function submitNote() {
    if (!noteDraft.trim()) return;
    onAddNote(contact.id, noteDraft.trim());
    setNoteDraft("");
  }

  const daysSinceContact = Math.floor(
    (Date.now() - new Date(contact.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const overdue = daysSinceContact > contact.cadenceDays;

  return (
    <div className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-serif text-base font-semibold text-gray-100">{contact.name}</p>
          {contact.company && <p className="text-sm text-gray-400">{contact.company}</p>}
        </div>
        <select
          value={contact.stage}
          onChange={(e) => onStageChange(contact.id, e.target.value as PipelineStage)}
          className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1 text-xs text-gray-200 focus:border-gold-500 focus:outline-none"
        >
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {contact.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {contact.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-charcoal-900 px-2 py-0.5 text-xs text-gray-400">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className={overdue ? "text-amber-400" : "text-gray-500"}>
          Last contact {formatDate(contact.lastContactedAt)} · every {contact.cadenceDays}d
          {overdue ? ` (${daysSinceContact - contact.cadenceDays}d overdue)` : ""}
        </span>
        <button
          onClick={() => onMarkContacted(contact.id)}
          className="rounded-md border border-gold-500/50 px-2 py-1 text-gold-400 hover:bg-gold-500/10"
        >
          Mark contacted
        </button>
      </div>

      <button
        onClick={() => setShowLog(!showLog)}
        className="mt-3 text-xs text-gray-500 hover:text-gray-300"
      >
        {showLog ? "Hide" : "Show"} notes ({contact.noteLog.length})
      </button>

      {showLog && (
        <div className="mt-2 space-y-2">
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
  );
}

import { useState } from "react";
import type { EmailTemplate } from "@/lib/emailTemplate";

interface Props {
  contactId: string;
  email?: string;
  onEmailSaved?: (email: string) => void;
  compact?: boolean;
}

export default function EmailAction({ contactId, email, onEmailSaved, compact }: Props) {
  const [emailDraft, setEmailDraft] = useState("");
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [subjectDraft, setSubjectDraft] = useState("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function saveEmail() {
    if (!emailDraft.trim()) return;
    await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailDraft.trim() }),
    });
    onEmailSaved?.(emailDraft.trim());
  }

  async function generate() {
    setLoading(true);
    setError(null);
    setTemplate(null);
    try {
      const res = await fetch("/api/email-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setTemplate(data);
        setSubjectDraft(data.subject);
        setBodyDraft(data.body);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`text-gold-400 hover:underline ${compact ? "text-xs" : "text-sm"}`}
      >
        ✉ Email
      </button>
    );
  }

  if (!email) {
    return (
      <div className="mt-2 rounded-md border border-charcoal-700 bg-charcoal-900 p-2">
        <p className="text-xs text-gray-500">No email on file — add one first.</p>
        <div className="mt-1 flex gap-2">
          <input
            type="email"
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            placeholder="email@example.com"
            className="flex-1 rounded-md border border-charcoal-700 bg-charcoal-950 px-2 py-1 text-xs text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
          />
          <button
            onClick={saveEmail}
            className="rounded-md bg-gold-500 px-2 py-1 text-xs font-medium text-charcoal-950 hover:bg-gold-400"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-charcoal-700 bg-charcoal-900 p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500">To: {email}</p>
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-md bg-gold-500 px-2 py-1 text-xs font-medium text-charcoal-950 hover:bg-gold-400 disabled:opacity-50"
        >
          {loading ? "Generating..." : template ? "Regenerate" : "Generate email"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}

      {template && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-gold-400">
            ⚠ AI-generated draft, not sent automatically — edit freely, then review before
            sending.
          </p>
          <div>
            <p className="text-xs text-gray-500">Subject</p>
            <input
              value={subjectDraft}
              onChange={(e) => setSubjectDraft(e.target.value)}
              className="mt-1 w-full rounded-md border border-charcoal-700 bg-charcoal-950 px-2 py-1 text-sm text-gray-200 focus:border-gold-500 focus:outline-none"
            />
          </div>
          <div>
            <p className="text-xs text-gray-500">Body</p>
            <textarea
              value={bodyDraft}
              onChange={(e) => setBodyDraft(e.target.value)}
              rows={6}
              className="mt-1 w-full rounded-md border border-charcoal-700 bg-charcoal-950 px-2 py-1 text-sm text-gray-200 focus:border-gold-500 focus:outline-none"
            />
          </div>
          <a
            href={`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
              subjectDraft
            )}&body=${encodeURIComponent(bodyDraft)}`}
            className="inline-block rounded-md bg-gold-500 px-3 py-1.5 text-xs font-medium text-charcoal-950 hover:bg-gold-400"
          >
            Open in email client to send
          </a>
        </div>
      )}
    </div>
  );
}

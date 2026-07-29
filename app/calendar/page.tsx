"use client";

import { useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "@/lib/eventsStore";
import type { Contact, PipelineStage } from "@/lib/contactTypes";
import { suggestInvitees, findLikelyAttendees, findColleagueCalendarOverlap } from "@/lib/eventOptimizer";
import { useContactDrawer } from "@/lib/contactDrawerContext";
import { BANKERS, YOU_BANKER_ID, ALL_BANKERS_ID, contactBankerId, bankerName } from "@/lib/bankers";
import { getViewBankerId, setViewBankerId } from "@/lib/userPrefs";

// Same stage-color convention used on Home/Drawer (green = Client, blue =
// still in the pipeline, gray = Cold).
const STAGE_BADGE: Record<PipelineStage, string> = {
  Client: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  Prospect: "border-sky-500/50 bg-sky-500/10 text-sky-400",
  Contacted: "border-sky-500/50 bg-sky-500/10 text-sky-400",
  Meeting: "border-sky-500/50 bg-sky-500/10 text-sky-400",
  Proposal: "border-sky-500/50 bg-sky-500/10 text-sky-400",
  Cold: "border-gray-500/50 bg-gray-500/10 text-gray-400",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Local YYYY-MM-DD key, built from date parts rather than toISOString() so
// it matches what the user sees in their own timezone.
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<"list" | "month">("month");
  const [viewBankerId, setViewBankerIdState] = useState(YOU_BANKER_ID);
  const today = new Date();
  const [monthCursor, setMonthCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(dateKey(today));

  // Add-event form state
  const { openDrawer } = useContactDrawer();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [taggedIds, setTaggedIds] = useState<string[]>([]);

  async function loadEvents() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    const res = await fetch(`/api/events?${params.toString()}`);
    const data = await res.json();
    setEvents(data.events ?? []);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const contactsRes = await fetch("/api/contacts");
      const contactsData = await contactsRes.json();
      setContacts(contactsData.contacts ?? []);
    })();
    setViewBankerIdState(getViewBankerId());
  }, []);

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function changeViewBanker(bankerId: string) {
    setViewBankerIdState(bankerId);
    setViewBankerId(bankerId);
  }

  // Which bankerId a newly added event should get. undefined (= "you") when
  // viewing your own calendar or the combined "All" view — there's no
  // single selected calendar to file into in the All view.
  const newEventBankerId =
    viewBankerId === YOU_BANKER_ID || viewBankerId === ALL_BANKERS_ID ? undefined : viewBankerId;

  async function submitEvent() {
    if (!title.trim() || !date) return;
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        date: new Date(date).toISOString(),
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        taggedContactIds: taggedIds,
        bankerId: newEventBankerId,
      }),
    });
    setTitle("");
    setDate("");
    setLocation("");
    setDescription("");
    setTaggedIds([]);
    setShowForm(false);
    await loadEvents();
  }

  async function toggleTag(eventId: string, contactId: string, currentTags: string[]) {
    const nextTags = currentTags.includes(contactId)
      ? currentTags.filter((id) => id !== contactId)
      : [...currentTags, contactId];
    await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taggedContactIds: nextTags }),
    });
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, taggedContactIds: nextTags } : e))
    );
  }

  async function handleFileUpload(file: File) {
    setUploadMessage(null);
    const text = await file.text();
    const res = await fetch("/api/events/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: text }),
    });
    const data = await res.json();
    if (!res.ok) {
      setUploadMessage(`Upload failed: ${data.error}`);
    } else {
      setUploadMessage(
        `Added ${data.created} event(s).${
          data.skippedRows?.length ? ` Skipped rows: ${data.skippedRows.join(", ")}.` : ""
        }`
      );
      await loadEvents();
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function contactName(id: string): string {
    return contacts.find((c) => c.id === id)?.name ?? "Unknown";
  }

  const scopedEvents =
    viewBankerId === ALL_BANKERS_ID
      ? events
      : events.filter((e) => contactBankerId(e.bankerId) === viewBankerId);

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of scopedEvents) {
    const key = dateKey(new Date(event.date));
    const list = eventsByDate.get(key) ?? [];
    list.push(event);
    eventsByDate.set(key, list);
  }

  const monthLabel = monthCursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstOfMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const totalCells = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;
  const gridDays: (Date | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - leadingBlanks + 1;
    return dayNum >= 1 && dayNum <= daysInMonth
      ? new Date(monthCursor.getFullYear(), monthCursor.getMonth(), dayNum)
      : null;
  });
  const selectedDayEvents = eventsByDate.get(selectedDate) ?? [];

  function renderEventCard(event: CalendarEvent) {
    return (
      <div key={event.id} className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-base font-semibold text-gray-100">{event.title}</h3>
              {viewBankerId === ALL_BANKERS_ID && (
                <span className="rounded-full border border-charcoal-700 bg-charcoal-900 px-1.5 py-0.5 text-[10px] text-gray-500">
                  {bankerName(event.bankerId)}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {formatDate(event.date)}
              {event.location ? ` · ${event.location}` : ""}
            </p>
            {event.description && <p className="mt-1 text-sm text-gray-400">{event.description}</p>}
          </div>
        </div>

        {(() => {
          const overlaps = findColleagueCalendarOverlap(event, events);
          if (overlaps.length === 0) return null;
          return (
            <div className="mt-2 rounded-md border border-sky-500/30 bg-sky-500/5 p-2">
              <p className="text-xs font-medium text-sky-400">Also on a colleague&apos;s calendar</p>
              <ul className="mt-1 space-y-0.5">
                {overlaps.map(({ event: e, bankerLabel }) => (
                  <li key={e.id} className="text-xs text-gray-300">
                    <span className="font-medium">{bankerLabel}</span>
                    <span className="text-gray-500"> — &ldquo;{e.title}&rdquo; ({formatDate(e.date)})</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        {event.taggedContactIds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {event.taggedContactIds.map((id) => (
              <button
                key={id}
                onClick={() => openDrawer(id)}
                className="rounded-full bg-charcoal-900 px-2 py-0.5 text-xs text-gold-400 hover:underline"
              >
                {contactName(id)}
              </button>
            ))}
          </div>
        )}

        {contacts.length > 0 && (
          <>
            {(() => {
              const suggestions = suggestInvitees(event, contacts, event.taggedContactIds);
              if (suggestions.length === 0) return null;
              return (
                <div className="mt-2">
                  <p className="text-xs text-gray-500">Suggested invitees:</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {suggestions.map(({ contact, reasons }) => (
                      <button
                        key={contact.id}
                        onClick={() => toggleTag(event.id, contact.id, event.taggedContactIds)}
                        title={reasons.join("; ")}
                        className="rounded-full border border-gold-500/50 bg-gold-500/10 px-2 py-1 text-xs text-gold-400 hover:bg-gold-500/20"
                      >
                        + {contact.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {(() => {
              const attendeeMatches = findLikelyAttendees(event, contacts, event.taggedContactIds);
              if (attendeeMatches.length === 0) return null;
              return (
                <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2">
                  <p className="text-xs font-medium text-amber-400">May already be connected here — have a pitch ready</p>
                  <ul className="mt-1 space-y-1">
                    {attendeeMatches.map(({ contact, reasons, bankerLabel }) => (
                      <li key={contact.id} className="text-xs text-gray-300">
                        <button
                          onClick={() => openDrawer(contact.id)}
                          className="font-medium hover:text-gold-400 hover:underline"
                        >
                          {contact.name}
                        </button>
                        <span
                          className={`ml-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${STAGE_BADGE[contact.stage]}`}
                        >
                          {contact.stage}
                        </span>
                        {bankerLabel && (
                          <span className="ml-1 rounded-full border border-charcoal-700 bg-charcoal-900 px-1.5 py-0.5 text-[10px] text-gray-500">
                            {bankerLabel}&apos;s client
                          </span>
                        )}
                        <span className="text-gray-500"> — {reasons[0]}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-[11px] text-gray-600">
                    Keyword-matched against notes/board/club data — not confirmed, verify before acting.
                  </p>
                </div>
              );
            })()}
          </>
        )}

        {contacts.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-300">
              Tag prospects
            </summary>
            <div className="mt-2 flex flex-wrap gap-1">
              {contacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleTag(event.id, c.id, event.taggedContactIds)}
                  className={`rounded-full border px-2 py-1 text-xs ${
                    event.taggedContactIds.includes(c.id)
                      ? "border-gold-500 bg-gold-500/10 text-gold-400"
                      : "border-charcoal-700 text-gray-400"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </details>
        )}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold-500">Calendar</p>
          <h1 className="font-serif text-3xl font-semibold text-gray-100">
            What is happening, and when?
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Social/sporting events for prospecting — tailgates, fundraisers, networking
            nights — with prospects tagged to each one.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <label htmlFor="viewing-banker-select-calendar" className="text-xs text-gray-500">
            Viewing
          </label>
          <select
            id="viewing-banker-select-calendar"
            aria-label="Viewing banker"
            value={viewBankerId}
            onChange={(e) => changeViewBanker(e.target.value)}
            className="mt-1 block rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 focus:border-gold-500 focus:outline-none"
          >
            {BANKERS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id === YOU_BANKER_ID ? "My Calendar (You)" : `${b.name}'s Calendar`}
              </option>
            ))}
            <option value={ALL_BANKERS_ID}>All Bankers (Firm-wide)</option>
          </select>
          {viewBankerId !== YOU_BANKER_ID && (
            <p className="mt-1 max-w-[220px] text-[11px] text-gray-600">
              Simulated view, not a real login — no per-user access control.
            </p>
          )}
        </div>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events..."
          className="rounded-md border border-charcoal-700 bg-charcoal-900 px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
        />
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md border border-gold-500/50 px-3 py-1.5 text-sm text-gold-400 hover:bg-gold-500/10"
        >
          + Add event
        </button>
        <label className="cursor-pointer rounded-md border border-charcoal-700 px-3 py-1.5 text-sm text-gray-400 hover:border-gray-500">
          Upload schedule (CSV)
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          />
        </label>
      </div>

      {uploadMessage && <p className="mb-4 text-xs text-gray-500">{uploadMessage}</p>}
      <p className="mb-4 text-xs text-gray-600">
        CSV columns: <code className="text-gray-500">title, date, location, description</code>{" "}
        (location/description optional).
      </p>

      {showForm && (
        <div className="mb-6 rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title (e.g. Ohio State vs. Michigan tailgate)"
              className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 focus:border-gold-500 focus:outline-none"
            />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (optional)"
              className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
            />
          </div>
          {contacts.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500">Tag prospects</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {contacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() =>
                      setTaggedIds((prev) =>
                        prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                      )
                    }
                    className={`rounded-full border px-2 py-1 text-xs ${
                      taggedIds.includes(c.id)
                        ? "border-gold-500 bg-gold-500/10 text-gold-400"
                        : "border-charcoal-700 text-gray-400"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={submitEvent}
              className="rounded-md bg-gold-500 px-3 py-1.5 text-sm font-medium text-charcoal-950 hover:bg-gold-400"
            >
              Save event
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md border border-charcoal-700 px-3 py-1.5 text-sm text-gray-400 hover:border-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-1">
        <button
          onClick={() => setView("list")}
          className={`rounded-md border px-3 py-1.5 text-sm ${
            view === "list"
              ? "border-gold-500 bg-gold-500/10 text-gold-400"
              : "border-charcoal-700 text-gray-400 hover:border-gray-500"
          }`}
        >
          List
        </button>
        <button
          onClick={() => setView("month")}
          className={`rounded-md border px-3 py-1.5 text-sm ${
            view === "month"
              ? "border-gold-500 bg-gold-500/10 text-gold-400"
              : "border-charcoal-700 text-gray-400 hover:border-gray-500"
          }`}
        >
          Month
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : view === "list" ? (
        scopedEvents.length === 0 ? (
          <p className="text-sm text-gray-500">No events yet.</p>
        ) : (
          <div className="space-y-3">{scopedEvents.map((event) => renderEventCard(event))}</div>
        )
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
              className="rounded-md border border-charcoal-700 px-2 py-1 text-sm text-gray-400 hover:border-gray-500"
            >
              ‹
            </button>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-lg text-gray-100">{monthLabel}</h2>
              <button
                onClick={() => {
                  setMonthCursor(new Date(today.getFullYear(), today.getMonth(), 1));
                  setSelectedDate(dateKey(today));
                }}
                className="rounded-md border border-charcoal-700 px-2 py-0.5 text-xs text-gray-400 hover:border-gray-500"
              >
                Today
              </button>
            </div>
            <button
              onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
              className="rounded-md border border-charcoal-700 px-2 py-1 text-sm text-gray-400 hover:border-gray-500"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {gridDays.map((day, i) => {
              if (!day) return <div key={i} className="min-h-[4.5rem] rounded-md bg-charcoal-900/30" />;
              const key = dateKey(day);
              const dayEvents = eventsByDate.get(key) ?? [];
              const isToday = key === dateKey(today);
              const isSelected = key === selectedDate;
              // Flags this day even before it's clicked open, so the
              // colleague-overlap / connected-prospect signals aren't only
              // discoverable via List view or by clicking into every day.
              const hasFlag = dayEvents.some(
                (e) =>
                  findLikelyAttendees(e, contacts, e.taggedContactIds).length > 0 ||
                  findColleagueCalendarOverlap(e, events).length > 0
              );
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(key)}
                  className={`min-h-[4.5rem] rounded-md border p-1 text-left align-top ${
                    isSelected
                      ? "border-gold-500 bg-gold-500/10"
                      : "border-charcoal-800 bg-charcoal-900/60 hover:border-charcoal-600"
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <span className={`text-xs ${isToday ? "font-semibold text-gold-400" : "text-gray-400"}`}>
                      {day.getDate()}
                    </span>
                    {hasFlag && (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
                        title="Has a colleague overlap or connected-prospect match"
                      />
                    )}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map((e) => (
                      <p key={e.id} className="truncate rounded bg-charcoal-800 px-1 text-[10px] text-gray-300">
                        {e.title}
                      </p>
                    ))}
                    {dayEvents.length > 2 && (
                      <p className="text-[10px] text-gray-500">+{dayEvents.length - 2} more</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h3>
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-gray-600">No events this day.</p>
            ) : (
              <div className="space-y-3">{selectedDayEvents.map((event) => renderEventCard(event))}</div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

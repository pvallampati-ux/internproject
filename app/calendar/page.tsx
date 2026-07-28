"use client";

import { useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "@/lib/eventsStore";
import type { Contact } from "@/lib/contactTypes";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add-event form state
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
  }, []);

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold-500">Calendar</p>
        <h1 className="font-serif text-3xl font-semibold text-gray-100">
          Prospecting Events
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Social/sporting events for prospecting — tailgates, fundraisers, networking
          nights — with prospects tagged to each one.
        </p>
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

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-gray-500">No events yet.</p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="rounded-lg border border-charcoal-700 bg-charcoal-800 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-serif text-base font-semibold text-gray-100">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatDate(event.date)}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                  {event.description && (
                    <p className="mt-1 text-sm text-gray-400">{event.description}</p>
                  )}
                </div>
              </div>

              {event.taggedContactIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {event.taggedContactIds.map((id) => (
                    <a
                      key={id}
                      href={`/contacts/${id}`}
                      className="rounded-full bg-charcoal-900 px-2 py-0.5 text-xs text-gold-400 hover:underline"
                    >
                      {contactName(id)}
                    </a>
                  ))}
                </div>
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
          ))}
        </div>
      )}
    </main>
  );
}

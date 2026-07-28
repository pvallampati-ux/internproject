"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Task } from "@/lib/taskTypes";
import type { Contact } from "@/lib/contactTypes";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [titleDraft, setTitleDraft] = useState("");
  const [dueDraft, setDueDraft] = useState("");
  const [contactIdDraft, setContactIdDraft] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [tasksRes, contactsRes] = await Promise.all([fetch("/api/tasks"), fetch("/api/contacts")]);
    const tasksData = await tasksRes.json();
    const contactsData = await contactsRes.json();
    setTasks(tasksData.tasks ?? []);
    setContacts(contactsData.contacts ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function contactName(id?: string): string | null {
    if (!id) return null;
    return contacts.find((c) => c.id === id)?.name ?? null;
  }

  async function addTask() {
    if (!titleDraft.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: titleDraft.trim(),
        contactId: contactIdDraft || undefined,
        dueDate: dueDraft ? new Date(dueDraft).toISOString() : undefined,
      }),
    });
    setTitleDraft("");
    setDueDraft("");
    setContactIdDraft("");
    await loadAll();
  }

  async function toggleDone(task: Task) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)));
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
  }

  async function removeTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }

  const now = Date.now();
  const openTasks = tasks.filter((t) => !t.done);
  const completedTasks = tasks.filter((t) => t.done);
  const overdue = openTasks.filter((t) => t.dueDate && new Date(t.dueDate).getTime() < now);
  const upcoming = openTasks.filter((t) => !t.dueDate || new Date(t.dueDate).getTime() >= now);

  function renderTask(task: Task) {
    const isOverdue = !task.done && task.dueDate && new Date(task.dueDate).getTime() < now;
    const name = contactName(task.contactId);
    return (
      <li key={task.id} className="flex items-center gap-2 rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2">
        <input
          type="checkbox"
          checked={task.done}
          onChange={() => toggleDone(task)}
          className="h-4 w-4 accent-gold-500"
        />
        <div className="flex-1">
          <p className={task.done ? "text-sm text-gray-600 line-through" : "text-sm text-gray-200"}>
            {task.title}
          </p>
          <p className="text-xs text-gray-500">
            {task.dueDate && (
              <span className={isOverdue ? "text-amber-400" : ""}>Due {formatDate(task.dueDate)}</span>
            )}
            {task.dueDate && name && " · "}
            {name && task.contactId && (
              <Link href={`/contacts/${task.contactId}`} className="text-gold-400 hover:underline">
                {name}
              </Link>
            )}
          </p>
        </div>
        <button onClick={() => removeTask(task.id)} className="text-xs text-gray-600 hover:text-red-400">
          Remove
        </button>
      </li>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold-500">Tasks</p>
        <h1 className="font-serif text-3xl font-semibold text-gray-100">Action Items</h1>
        <p className="mt-1 text-sm text-gray-400">
          Call Friday, send an article, introduce a CPA, prepare a deck — anything you need to
          follow up on, optionally tied to a contact.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2 rounded-lg border border-charcoal-700 bg-charcoal-800/50 p-3">
        <input
          type="text"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="New task..."
          className="min-w-[200px] flex-1 rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-gold-500 focus:outline-none"
        />
        <select
          value={contactIdDraft}
          onChange={(e) => setContactIdDraft(e.target.value)}
          className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 focus:border-gold-500 focus:outline-none"
        >
          <option value="">No contact</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dueDraft}
          onChange={(e) => setDueDraft(e.target.value)}
          className="rounded-md border border-charcoal-700 bg-charcoal-900 px-2 py-1.5 text-sm text-gray-200 focus:border-gold-500 focus:outline-none"
        />
        <button
          onClick={addTask}
          className="rounded-md bg-gold-500 px-3 py-1.5 text-sm font-medium text-charcoal-950 hover:bg-gold-400"
        >
          Add
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <>
          {overdue.length > 0 && (
            <section className="mb-6">
              <h2 className="font-serif text-lg text-amber-400">Overdue ({overdue.length})</h2>
              <ul className="mt-2 space-y-2">{overdue.map(renderTask)}</ul>
            </section>
          )}

          <section className="mb-6">
            <h2 className="font-serif text-lg text-gray-100">Open ({upcoming.length})</h2>
            {upcoming.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">Nothing open — add one above.</p>
            ) : (
              <ul className="mt-2 space-y-2">{upcoming.map(renderTask)}</ul>
            )}
          </section>

          <section>
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              {showCompleted ? "Hide" : "Show"} completed ({completedTasks.length})
            </button>
            {showCompleted && <ul className="mt-2 space-y-2">{completedTasks.map(renderTask)}</ul>}
          </section>
        </>
      )}
    </main>
  );
}

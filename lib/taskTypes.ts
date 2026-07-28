// Pure types only — no filesystem imports — so client components can
// import this without pulling Node's `fs` into the browser bundle.

export interface Task {
  id: string;
  title: string;
  contactId?: string; // optional — a task doesn't have to be tied to a contact ("prepare Q3 deck" vs. contact-specific)
  dueDate?: string; // ISO date
  done: boolean;
  createdAt: string; // ISO date
}

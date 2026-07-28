import { NextResponse } from "next/server";
import { loadTasks, createTask } from "@/lib/tasksStore";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contactId");
  let tasks = loadTasks();
  if (contactId) tasks = tasks.filter((t) => t.contactId === contactId);
  tasks = tasks.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const aDate = a.dueDate ?? a.createdAt;
    const bDate = b.dueDate ?? b.createdAt;
    return new Date(aDate).getTime() - new Date(bDate).getTime();
  });
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  const task = createTask({
    title: body.title.trim(),
    contactId: typeof body.contactId === "string" ? body.contactId : undefined,
    dueDate: typeof body.dueDate === "string" ? body.dueDate : undefined,
  });
  return NextResponse.json(task, { status: 201 });
}

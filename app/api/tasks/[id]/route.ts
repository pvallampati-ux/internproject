import { NextResponse } from "next/server";
import { updateTask, deleteTask } from "@/lib/tasksStore";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();

  const patch: Partial<{ title: string; contactId: string; dueDate: string; done: boolean }> = {};
  if (typeof body.title === "string") patch.title = body.title;
  if (typeof body.contactId === "string") patch.contactId = body.contactId;
  if (typeof body.dueDate === "string" || body.dueDate === null) patch.dueDate = body.dueDate ?? undefined;
  if (typeof body.done === "boolean") patch.done = body.done;

  const updated = updateTask(id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const deleted = deleteTask(id);
  if (!deleted) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

import { AssistantSession } from "@/lib/db/schema";
import { getDb } from "@/lib/db/database";
import { scheduleCloudPush } from "@/lib/db/cloud-sync.service";
import { createId, nowIso } from "@/lib/utils/formatting";

export async function getAssistantSessions() {
  const db = getDb();
  return db.assistantSessions.orderBy("updatedAt").reverse().limit(20).toArray();
}

export async function saveAssistantSession(session: Omit<AssistantSession, "id" | "createdAt" | "updatedAt"> & Partial<Pick<AssistantSession, "id" | "createdAt">>) {
  const db = getDb();
  const timestamp = nowIso();
  const record: AssistantSession = {
    ...session,
    id: session.id ?? createId(),
    createdAt: session.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  await db.assistantSessions.put(record);
  const sessions = await getAssistantSessions();
  await Promise.all(sessions.slice(20).map((item) => db.assistantSessions.delete(item.id)));
  scheduleCloudPush();
  return record;
}

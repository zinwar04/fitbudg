"use client";

import { AssistantSession } from "@/lib/db/schema";
import { getSupabaseClient } from "@/lib/db/supabase.client";
import { requireUserId, stripUserId, stripUserIdArray, withUserId } from "@/lib/db/supabase.service";
import { createId, nowIso } from "@/lib/utils/formatting";

export async function getAssistantSessions(): Promise<AssistantSession[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("assistant_sessions").select("*").order("updatedAt", { ascending: false }).limit(20);

  if (error) throw error;
  return stripUserIdArray<AssistantSession>(data ?? []);
}

export async function saveAssistantSession(session: Omit<AssistantSession, "id" | "createdAt" | "updatedAt"> & Partial<Pick<AssistantSession, "id" | "createdAt">>) {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();
  const timestamp = nowIso();
  const record: AssistantSession = {
    ...session,
    id: session.id ?? createId(),
    createdAt: session.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  const { data, error } = await supabase
    .from("assistant_sessions")
    .upsert(withUserId("assistant_sessions", userId, record), { onConflict: "user_id,id" })
    .select("*")
    .single();

  if (error) throw error;

  const sessions = await getAssistantSessions();
  const staleIds = sessions.slice(20).map((item) => item.id);
  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase.from("assistant_sessions").delete().in("id", staleIds);
    if (deleteError) throw deleteError;
  }

  return stripUserId<AssistantSession>(data);
}

export async function deleteAssistantSession(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("assistant_sessions").delete().eq("id", id);
  if (error) throw error;
}

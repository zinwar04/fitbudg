"use client";

import { toast } from "sonner";
import { AppExport, exportDatabase, replaceDatabase } from "@/lib/db/database";
import { parseImportJson } from "@/lib/db/data.service";
import { getSupabaseClient, isSupabaseConfigured, type Json } from "@/lib/db/supabase.client";

const SNAPSHOT_ID = "default";

let pushTimeout: ReturnType<typeof setTimeout> | null = null;
let pushInFlight = false;

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function toJsonPayload(data: AppExport): Json {
  return data as unknown as Json;
}

export async function getCloudSyncStatus() {
  if (!isSupabaseConfigured()) {
    return { configured: false, signedIn: false, updatedAt: null as string | null };
  }

  const supabase = getSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return { configured: true, signedIn: false, updatedAt: null as string | null };

  const { data, error } = await supabase
    .from("fitbudget_snapshots")
    .select("updated_at")
    .eq("user_id", authData.user.id)
    .eq("id", SNAPSHOT_ID)
    .maybeSingle();

  if (error) throw error;

  return {
    configured: true,
    signedIn: true,
    updatedAt: data?.updated_at ?? null,
  };
}

export async function pullCloudSnapshotToLocal() {
  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return false;

  const { data, error } = await supabase
    .from("fitbudget_snapshots")
    .select("payload")
    .eq("user_id", authData.user.id)
    .eq("id", SNAPSHOT_ID)
    .maybeSingle();

  if (error) throw error;
  if (!data?.payload) return false;

  await replaceDatabase(parseImportJson(data.payload));
  return true;
}

export async function pushLocalSnapshotToCloud() {
  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return false;

  const snapshot = await exportDatabase();
  const { error } = await supabase.from("fitbudget_snapshots").upsert(
    {
      user_id: authData.user.id,
      id: SNAPSHOT_ID,
      payload: toJsonPayload(snapshot),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,id" },
  );

  if (error) throw error;
  return true;
}

export async function deleteCloudSnapshot() {
  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return false;

  const { error } = await supabase.from("fitbudget_snapshots").delete().eq("user_id", authData.user.id).eq("id", SNAPSHOT_ID);
  if (error) throw error;

  return true;
}

export function scheduleCloudPush() {
  if (!isSupabaseConfigured()) return;
  if (pushTimeout) clearTimeout(pushTimeout);

  pushTimeout = setTimeout(() => {
    pushTimeout = null;
    if (pushInFlight) {
      scheduleCloudPush();
      return;
    }

    pushInFlight = true;
    void pushLocalSnapshotToCloud()
      .catch((error: unknown) => {
        toast.error(`Cloud sync failed: ${messageFromError(error)}`);
      })
      .finally(() => {
        pushInFlight = false;
      });
  }, 900);
}

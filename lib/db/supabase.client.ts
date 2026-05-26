"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

interface FitBudgetDatabase {
  public: {
    Tables: {
      fitbudget_snapshots: {
        Row: {
          user_id: string;
          id: string;
          payload: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          id?: string;
          payload: Json;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          id?: string;
          payload?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

let client: SupabaseClient<FitBudgetDatabase> | null = null;

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return {
    configured: Boolean(url && publishableKey),
    url,
    publishableKey,
  };
}

export function getSupabaseClient() {
  const { configured, url, publishableKey } = getSupabaseConfig();

  if (!configured || !url || !publishableKey) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.");
  }

  if (!client) {
    client = createClient<FitBudgetDatabase>(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return client;
}

export function isSupabaseConfigured() {
  return getSupabaseConfig().configured;
}

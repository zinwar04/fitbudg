"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  AppSettings,
  AssistantSession,
  BudgetProfile,
  DailyCalorieLog,
  FoodEntry,
  FoodLibraryItem,
  Habit,
  HabitEntry,
  MealTemplate,
  Transaction,
  UserProfile,
  WeightEntry,
} from "@/lib/db/schema";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type RowWithUser<T> = T & { user_id: string };
type InsertWithUser<T> = T & { user_id: string };
type UpdateWithUser<T> = Partial<T> & { user_id?: string };

type TableDef<T> = {
  Row: RowWithUser<T>;
  Insert: InsertWithUser<T>;
  Update: UpdateWithUser<T>;
  Relationships: [];
};

export interface FitBudgetDatabase {
  public: {
    Tables: {
      user_profiles: TableDef<UserProfile>;
      app_settings: TableDef<AppSettings>;
      budget_profiles: TableDef<BudgetProfile>;
      daily_calorie_logs: TableDef<DailyCalorieLog>;
      food_library_items: TableDef<FoodLibraryItem>;
      meal_templates: TableDef<MealTemplate>;
      food_entries: TableDef<FoodEntry>;
      weight_entries: TableDef<WeightEntry>;
      transactions: TableDef<Transaction>;
      habits: TableDef<Habit>;
      habit_entries: TableDef<HabitEntry>;
      assistant_sessions: TableDef<AssistantSession>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type SupabaseTableName = keyof FitBudgetDatabase["public"]["Tables"];
export type SupabaseRow<Table extends SupabaseTableName> = FitBudgetDatabase["public"]["Tables"][Table]["Row"];
export type SupabaseInsert<Table extends SupabaseTableName> = FitBudgetDatabase["public"]["Tables"][Table]["Insert"];

let client: SupabaseClient | null = null;

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return {
    configured: Boolean(url && publishableKey),
    url,
    publishableKey,
  };
}

export function getSupabaseClient(): SupabaseClient {
  const { configured, url, publishableKey } = getSupabaseConfig();

  if (!configured || !url || !publishableKey) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.");
  }

  if (!client) {
    client = createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          "x-application-name": "fitbudget-web",
        },
      },
    });
  }

  return client;
}

export function isSupabaseConfigured() {
  return getSupabaseConfig().configured;
}

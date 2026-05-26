"use client";

import { AppExport } from "@/lib/db/schema";
import { SupabaseInsert, SupabaseRow, SupabaseTableName, getSupabaseClient } from "@/lib/db/supabase.client";

export async function requireUserId() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;
  if (!data.user) throw new Error("You need to be signed in to access FitBudget data.");

  return data.user.id;
}

export function stripUserId<T>(row: T & { user_id: string }): T {
  const { user_id: _userId, ...rest } = row;
  return rest as T;
}

export function stripUserIdArray<T>(rows: (T & { user_id: string })[]): T[] {
  return rows.map(stripUserId);
}

export function withUserId<Table extends SupabaseTableName>(
  _table: Table,
  userId: string,
  record: Omit<SupabaseRow<Table>, "user_id">,
): SupabaseInsert<Table> {
  return { ...record, user_id: userId } as SupabaseInsert<Table>;
}

export function withUserIdArray<Table extends SupabaseTableName>(
  table: Table,
  userId: string,
  records: Omit<SupabaseRow<Table>, "user_id">[],
): SupabaseInsert<Table>[] {
  return records.map((record) => withUserId<Table>(table, userId, record));
}

export type ExportTableKey = keyof AppExport;

export const supabaseTableByExportKey: Record<ExportTableKey, SupabaseTableName> = {
  userProfiles: "user_profiles",
  dailyCalorieLogs: "daily_calorie_logs",
  foodEntries: "food_entries",
  foodLibraryItems: "food_library_items",
  mealTemplates: "meal_templates",
  weightEntries: "weight_entries",
  budgetProfiles: "budget_profiles",
  transactions: "transactions",
  habits: "habits",
  habitEntries: "habit_entries",
  appSettings: "app_settings",
  assistantSessions: "assistant_sessions",
};

export const deleteOrder: SupabaseTableName[] = [
  "assistant_sessions",
  "habit_entries",
  "habits",
  "transactions",
  "weight_entries",
  "food_entries",
  "daily_calorie_logs",
  "meal_templates",
  "food_library_items",
  "user_profiles",
  "budget_profiles",
  "app_settings",
];

export const insertOrder: ExportTableKey[] = [
  "appSettings",
  "budgetProfiles",
  "userProfiles",
  "dailyCalorieLogs",
  "foodLibraryItems",
  "mealTemplates",
  "foodEntries",
  "weightEntries",
  "transactions",
  "habits",
  "habitEntries",
  "assistantSessions",
];

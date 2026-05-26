"use client";

import { AppExport, emptyExport } from "@/lib/db/schema";
import { getSupabaseClient, SupabaseRow, SupabaseTableName } from "@/lib/db/supabase.client";
import { deleteOrder, requireUserId, stripUserIdArray, withUserIdArray } from "@/lib/db/supabase.service";
import { isRecord } from "@/lib/utils/formatting";

const exportKeys: (keyof AppExport)[] = [
  "userProfiles",
  "dailyCalorieLogs",
  "foodEntries",
  "foodLibraryItems",
  "mealTemplates",
  "weightEntries",
  "budgetProfiles",
  "transactions",
  "habits",
  "habitEntries",
  "appSettings",
  "assistantSessions",
];

export async function exportJson(): Promise<AppExport> {
  const supabase = getSupabaseClient();
  const [
    userProfiles,
    dailyCalorieLogs,
    foodEntries,
    foodLibraryItems,
    mealTemplates,
    weightEntries,
    budgetProfiles,
    transactions,
    habits,
    habitEntries,
    appSettings,
    assistantSessions,
  ] = await Promise.all([
    supabase.from("user_profiles").select("*").order("updatedAt", { ascending: false }),
    supabase.from("daily_calorie_logs").select("*").order("date", { ascending: true }),
    supabase.from("food_entries").select("*").order("date", { ascending: true }),
    supabase.from("food_library_items").select("*").order("name", { ascending: true }),
    supabase.from("meal_templates").select("*").order("name", { ascending: true }),
    supabase.from("weight_entries").select("*").order("date", { ascending: true }),
    supabase.from("budget_profiles").select("*"),
    supabase.from("transactions").select("*").order("date", { ascending: false }),
    supabase.from("habits").select("*").order("createdAt", { ascending: true }),
    supabase.from("habit_entries").select("*").order("date", { ascending: true }),
    supabase.from("app_settings").select("*"),
    supabase.from("assistant_sessions").select("*").order("updatedAt", { ascending: false }),
  ]);

  const results = [
    userProfiles,
    dailyCalorieLogs,
    foodEntries,
    foodLibraryItems,
    mealTemplates,
    weightEntries,
    budgetProfiles,
    transactions,
    habits,
    habitEntries,
    appSettings,
    assistantSessions,
  ];
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;

  return {
    userProfiles: stripUserIdArray(userProfiles.data ?? []),
    dailyCalorieLogs: stripUserIdArray(dailyCalorieLogs.data ?? []),
    foodEntries: stripUserIdArray(foodEntries.data ?? []),
    foodLibraryItems: stripUserIdArray(foodLibraryItems.data ?? []),
    mealTemplates: stripUserIdArray(mealTemplates.data ?? []),
    weightEntries: stripUserIdArray(weightEntries.data ?? []),
    budgetProfiles: stripUserIdArray(budgetProfiles.data ?? []),
    transactions: stripUserIdArray(transactions.data ?? []),
    habits: stripUserIdArray(habits.data ?? []),
    habitEntries: stripUserIdArray(habitEntries.data ?? []),
    appSettings: stripUserIdArray(appSettings.data ?? []),
    assistantSessions: stripUserIdArray(assistantSessions.data ?? []),
  };
}

export async function clearAllData() {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();
  // Delete in dependency order so foreign keys can stay enabled.
  for (const table of deleteOrder) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) throw error;
  }
}

export function parseImportJson(value: unknown): AppExport {
  if (!isRecord(value)) {
    throw new Error("Import file must contain a JSON object.");
  }
  const parsed = emptyExport();
  exportKeys.forEach((key) => {
    const table = value[key];
    if (table === undefined) return;
    if (!Array.isArray(table)) {
      throw new Error(`Import field "${key}" must be an array.`);
    }
    parsed[key] = table as never;
  });
  return parsed;
}

async function upsertRows<Table extends SupabaseTableName>(table: Table, rows: Omit<SupabaseRow<Table>, "user_id">[], userId: string) {
  if (rows.length === 0) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from(table).upsert(withUserIdArray(table, userId, rows), { onConflict: "user_id,id" });
  if (error) throw error;
}

export async function importJson(data: AppExport, mode: "merge" | "replace") {
  const userId = await requireUserId();
  if (mode === "replace") await clearAllData();

  await upsertRows("app_settings", data.appSettings, userId);
  await upsertRows("budget_profiles", data.budgetProfiles, userId);
  await upsertRows("user_profiles", data.userProfiles, userId);
  await upsertRows("daily_calorie_logs", data.dailyCalorieLogs, userId);
  await upsertRows("food_library_items", data.foodLibraryItems, userId);
  await upsertRows("meal_templates", data.mealTemplates, userId);
  await upsertRows("food_entries", data.foodEntries, userId);
  await upsertRows("weight_entries", data.weightEntries, userId);
  await upsertRows("transactions", data.transactions, userId);
  await upsertRows("habits", data.habits, userId);
  await upsertRows("habit_entries", data.habitEntries, userId);
  await upsertRows("assistant_sessions", data.assistantSessions, userId);
}

"use client";

import {
  DailyCalorieLog,
  FoodEntry,
  FoodLibraryItem,
  MealTemplate,
  MealTemplateItem,
  MealType,
  WeightEntry,
} from "@/lib/db/schema";
import { getSupabaseClient } from "@/lib/db/supabase.client";
import { requireUserId, stripUserId, stripUserIdArray, withUserId } from "@/lib/db/supabase.service";
import { createId, nowIso } from "@/lib/utils/formatting";

export interface FoodData {
  logs: DailyCalorieLog[];
  entries: FoodEntry[];
  library: FoodLibraryItem[];
  mealTemplates: MealTemplate[];
  weights: WeightEntry[];
}

export type FoodEntryInput = Omit<FoodEntry, "id" | "logId" | "createdAt" | "updatedAt">;
export type FoodLibraryInput = Omit<FoodLibraryItem, "id" | "createdAt" | "updatedAt" | "useCount" | "lastUsedAt">;
export type MealTemplateInput = Omit<MealTemplate, "id" | "createdAt" | "updatedAt" | "totalCalories" | "totalProtein" | "totalCarbs" | "totalFat" | "useCount" | "lastUsedAt">;
export type WeightInput = Omit<WeightEntry, "id" | "createdAt">;

export async function getFoodData(): Promise<FoodData> {
  const supabase = getSupabaseClient();
  const [logs, entries, library, mealTemplates, weights] = await Promise.all([
    supabase.from("daily_calorie_logs").select("*").order("date", { ascending: true }),
    supabase.from("food_entries").select("*").order("date", { ascending: true }),
    supabase.from("food_library_items").select("*").order("name", { ascending: true }),
    supabase.from("meal_templates").select("*").order("name", { ascending: true }),
    supabase.from("weight_entries").select("*").order("date", { ascending: true }),
  ]);

  if (logs.error) throw logs.error;
  if (entries.error) throw entries.error;
  if (library.error) throw library.error;
  if (mealTemplates.error) throw mealTemplates.error;
  if (weights.error) throw weights.error;

  return {
    logs: stripUserIdArray(logs.data ?? []),
    entries: stripUserIdArray(entries.data ?? []),
    library: stripUserIdArray(library.data ?? []),
    mealTemplates: stripUserIdArray(mealTemplates.data ?? []),
    weights: stripUserIdArray(weights.data ?? []),
  };
}

export async function getOrCreateDailyLog(date: string) {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();
  const { data: existing, error } = await supabase.from("daily_calorie_logs").select("*").eq("date", date).maybeSingle();

  if (error) throw error;
  if (existing) return stripUserId(existing);

  const timestamp = nowIso();
  const record: DailyCalorieLog = {
    id: createId(),
    date,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const { data, error: insertError } = await supabase
    .from("daily_calorie_logs")
    .upsert(withUserId("daily_calorie_logs", userId, record), { onConflict: "user_id,date" })
    .select("*")
    .single();

  if (insertError) throw insertError;
  return stripUserId(data);
}

export async function addFoodEntry(input: FoodEntryInput) {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();
  const log = await getOrCreateDailyLog(input.date);
  const timestamp = nowIso();
  const entry: FoodEntry = {
    ...input,
    id: createId(),
    logId: log.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const { data, error } = await supabase.from("food_entries").insert(withUserId("food_entries", userId, entry)).select("*").single();
  if (error) throw error;
  if (entry.foodLibraryId) await markFoodUsed(entry.foodLibraryId);
  return stripUserId(data);
}

export async function updateFoodEntry(id: string, input: Partial<FoodEntryInput>) {
  const supabase = getSupabaseClient();
  const { data: existing, error: getError } = await supabase.from("food_entries").select("*").eq("id", id).maybeSingle();
  if (getError) throw getError;
  if (!existing) throw new Error("Food entry not found.");

  const current = stripUserId(existing);
  const log = input.date && input.date !== current.date ? await getOrCreateDailyLog(input.date) : undefined;
  const updated: FoodEntry = {
    ...current,
    ...input,
    logId: log?.id ?? current.logId,
    updatedAt: nowIso(),
  };

  const { data, error } = await supabase.from("food_entries").update(updated).eq("id", id).select("*").single();
  if (error) throw error;
  return stripUserId(data);
}

export async function deleteFoodEntry(id: string) {
  const supabase = getSupabaseClient();
  const { data: existing, error: getError } = await supabase.from("food_entries").select("*").eq("id", id).maybeSingle();
  if (getError) throw getError;

  const { error } = await supabase.from("food_entries").delete().eq("id", id);
  if (error) throw error;

  return existing ? stripUserId(existing) : null;
}

export async function duplicateFoodEntry(id: string, date?: string) {
  const supabase = getSupabaseClient();
  const { data: existing, error } = await supabase.from("food_entries").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!existing) throw new Error("Food entry not found.");
  const current = stripUserId(existing);
  return addFoodEntry({
    date: date ?? current.date,
    foodLibraryId: current.foodLibraryId,
    mealTemplateId: current.mealTemplateId,
    name: current.name,
    calories: current.calories,
    servingSize: current.servingSize,
    servingUnit: current.servingUnit,
    quantity: current.quantity,
    protein: current.protein,
    carbs: current.carbs,
    fat: current.fat,
    fiber: current.fiber,
    mealType: current.mealType,
    notes: current.notes,
  });
}

export async function moveFoodEntry(id: string, mealType: MealType) {
  return updateFoodEntry(id, { mealType });
}

export async function addFoodLibraryItem(input: FoodLibraryInput) {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();
  const timestamp = nowIso();
  const item: FoodLibraryItem = {
    ...input,
    source: input.source ?? "manual",
    id: createId(),
    useCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const { data, error } = await supabase.from("food_library_items").insert(withUserId("food_library_items", userId, item)).select("*").single();
  if (error) throw error;
  return stripUserId(data);
}

export async function addFoodLibraryItems(inputs: FoodLibraryInput[]) {
  if (inputs.length === 0) return [];
  const supabase = getSupabaseClient();
  const userId = await requireUserId();
  const timestamp = nowIso();
  const rows = inputs.map((input) =>
    withUserId("food_library_items", userId, {
      ...input,
      source: input.source ?? "manual",
      id: createId(),
      useCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
  );
  const { data, error } = await supabase.from("food_library_items").insert(rows).select("*");
  if (error) throw error;
  return stripUserIdArray(data ?? []);
}

export async function updateFoodLibraryItem(id: string, input: Partial<FoodLibraryInput>) {
  const supabase = getSupabaseClient();
  const { data: existing, error: getError } = await supabase.from("food_library_items").select("*").eq("id", id).maybeSingle();
  if (getError) throw getError;
  if (!existing) throw new Error("Food item not found.");

  const updated: FoodLibraryItem = { ...stripUserId(existing), ...input, updatedAt: nowIso() };
  const { data, error } = await supabase.from("food_library_items").update(updated).eq("id", id).select("*").single();
  if (error) throw error;
  return stripUserId(data);
}

export async function deleteFoodLibraryItem(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("food_library_items").delete().eq("id", id);
  if (error) throw error;
}

export async function markFoodUsed(id: string) {
  const supabase = getSupabaseClient();
  const { data: item, error: getError } = await supabase.from("food_library_items").select("*").eq("id", id).maybeSingle();
  if (getError) throw getError;
  if (!item) return null;

  const current = stripUserId(item);
  const timestamp = nowIso();
  const updated: FoodLibraryItem = {
    ...current,
    useCount: current.useCount + 1,
    lastUsedAt: timestamp,
    updatedAt: timestamp,
  };
  const { data, error } = await supabase.from("food_library_items").update(updated).eq("id", id).select("*").single();
  if (error) throw error;
  return stripUserId(data);
}

export async function toggleFoodFavorite(id: string) {
  const supabase = getSupabaseClient();
  const { data: item, error: getError } = await supabase.from("food_library_items").select("*").eq("id", id).maybeSingle();
  if (getError) throw getError;
  if (!item) throw new Error("Food item not found.");

  const current = stripUserId(item);
  const updated: FoodLibraryItem = { ...current, isFavorite: !current.isFavorite, updatedAt: nowIso() };
  const { data, error } = await supabase.from("food_library_items").update(updated).eq("id", id).select("*").single();
  if (error) throw error;
  return stripUserId(data);
}

function calculateTemplateTotals(items: MealTemplateItem[]) {
  return {
    totalCalories: Math.round(items.reduce((total, item) => total + item.calories, 0)),
    totalProtein: Math.round(items.reduce((total, item) => total + (item.protein ?? 0), 0)),
    totalCarbs: Math.round(items.reduce((total, item) => total + (item.carbs ?? 0), 0)),
    totalFat: Math.round(items.reduce((total, item) => total + (item.fat ?? 0), 0)),
  };
}

export async function addMealTemplate(input: MealTemplateInput) {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();
  const timestamp = nowIso();
  const totals = calculateTemplateTotals(input.items);
  const template: MealTemplate = {
    ...input,
    ...totals,
    id: createId(),
    useCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const { data, error } = await supabase.from("meal_templates").insert(withUserId("meal_templates", userId, template)).select("*").single();
  if (error) throw error;
  return stripUserId(data);
}

export async function addMealTemplates(inputs: MealTemplateInput[]) {
  if (inputs.length === 0) return [];
  const supabase = getSupabaseClient();
  const userId = await requireUserId();
  const timestamp = nowIso();
  const rows = inputs.map((input) => {
    const totals = calculateTemplateTotals(input.items);
    return withUserId("meal_templates", userId, {
      ...input,
      ...totals,
      id: createId(),
      useCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });
  const { data, error } = await supabase.from("meal_templates").insert(rows).select("*");
  if (error) throw error;
  return stripUserIdArray(data ?? []);
}

export async function updateMealTemplate(id: string, input: Partial<MealTemplateInput>) {
  const supabase = getSupabaseClient();
  const { data: existing, error: getError } = await supabase.from("meal_templates").select("*").eq("id", id).maybeSingle();
  if (getError) throw getError;
  if (!existing) throw new Error("Meal template not found.");

  const current = stripUserId(existing);
  const items = input.items ?? current.items;
  const totals = calculateTemplateTotals(items);
  const updated: MealTemplate = {
    ...current,
    ...input,
    items,
    ...totals,
    updatedAt: nowIso(),
  };
  const { data, error } = await supabase.from("meal_templates").update(updated).eq("id", id).select("*").single();
  if (error) throw error;
  return stripUserId(data);
}

export async function deleteMealTemplate(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("meal_templates").delete().eq("id", id);
  if (error) throw error;
}

export async function addMealTemplateToLog(templateId: string, date: string, mealType: MealType) {
  const supabase = getSupabaseClient();
  const { data: templateRow, error } = await supabase.from("meal_templates").select("*").eq("id", templateId).maybeSingle();
  if (error) throw error;
  if (!templateRow) throw new Error("Meal template not found.");

  const template = stripUserId<MealTemplate>(templateRow);
  const entries = await Promise.all(
    template.items.map((item: MealTemplateItem) =>
      addFoodEntry({
        date,
        foodLibraryId: item.foodLibraryId,
        mealTemplateId: template.id,
        name: item.name,
        calories: item.calories,
        servingSize: item.servingSize,
        servingUnit: item.servingUnit,
        quantity: item.quantity,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        mealType,
      }),
    ),
  );

  const updated: MealTemplate = {
    ...template,
    useCount: template.useCount + 1,
    lastUsedAt: nowIso(),
    updatedAt: nowIso(),
  };
  const { error: updateError } = await supabase.from("meal_templates").update(updated).eq("id", template.id);
  if (updateError) throw updateError;
  return entries;
}

export async function addWeightEntry(input: WeightInput) {
  const supabase = getSupabaseClient();
  const userId = await requireUserId();
  const entry: WeightEntry = {
    ...input,
    id: createId(),
    createdAt: nowIso(),
  };
  const { data, error } = await supabase.from("weight_entries").insert(withUserId("weight_entries", userId, entry)).select("*").single();
  if (error) throw error;
  return stripUserId(data);
}

export async function updateWeightEntry(id: string, input: Partial<WeightInput>) {
  const supabase = getSupabaseClient();
  const { data: existing, error: getError } = await supabase.from("weight_entries").select("*").eq("id", id).maybeSingle();
  if (getError) throw getError;
  if (!existing) throw new Error("Weight entry not found.");

  const updated: WeightEntry = { ...stripUserId(existing), ...input };
  const { data, error } = await supabase.from("weight_entries").update(updated).eq("id", id).select("*").single();
  if (error) throw error;
  return stripUserId(data);
}

export async function deleteWeightEntry(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("weight_entries").delete().eq("id", id);
  if (error) throw error;
}

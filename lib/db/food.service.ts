import {
  DailyCalorieLog,
  FoodEntry,
  FoodLibraryItem,
  MealTemplate,
  MealTemplateItem,
  MealType,
  WeightEntry,
} from "@/lib/db/schema";
import { getDb } from "@/lib/db/database";
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
  const db = getDb();
  const [logs, entries, library, mealTemplates, weights] = await Promise.all([
    db.dailyCalorieLogs.orderBy("date").toArray(),
    db.foodEntries.orderBy("date").toArray(),
    db.foodLibraryItems.orderBy("name").toArray(),
    db.mealTemplates.orderBy("name").toArray(),
    db.weightEntries.orderBy("date").toArray(),
  ]);
  return { logs, entries, library, mealTemplates, weights };
}

export async function getOrCreateDailyLog(date: string) {
  const db = getDb();
  const existing = await db.dailyCalorieLogs.where("date").equals(date).first();
  if (existing) return existing;
  const timestamp = nowIso();
  const record: DailyCalorieLog = {
    id: createId(),
    date,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.dailyCalorieLogs.put(record);
  return record;
}

export async function addFoodEntry(input: FoodEntryInput) {
  const db = getDb();
  const log = await getOrCreateDailyLog(input.date);
  const timestamp = nowIso();
  const entry: FoodEntry = {
    ...input,
    id: createId(),
    logId: log.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.foodEntries.put(entry);
  if (entry.foodLibraryId) await markFoodUsed(entry.foodLibraryId);
  return entry;
}

export async function updateFoodEntry(id: string, input: Partial<FoodEntryInput>) {
  const db = getDb();
  const existing = await db.foodEntries.get(id);
  if (!existing) throw new Error("Food entry not found.");
  const log = input.date && input.date !== existing.date ? await getOrCreateDailyLog(input.date) : undefined;
  const updated: FoodEntry = {
    ...existing,
    ...input,
    logId: log?.id ?? existing.logId,
    updatedAt: nowIso(),
  };
  await db.foodEntries.put(updated);
  return updated;
}

export async function deleteFoodEntry(id: string) {
  const db = getDb();
  const existing = await db.foodEntries.get(id);
  await db.foodEntries.delete(id);
  return existing ?? null;
}

export async function duplicateFoodEntry(id: string, date?: string) {
  const db = getDb();
  const existing = await db.foodEntries.get(id);
  if (!existing) throw new Error("Food entry not found.");
  return addFoodEntry({
    date: date ?? existing.date,
    foodLibraryId: existing.foodLibraryId,
    mealTemplateId: existing.mealTemplateId,
    name: existing.name,
    calories: existing.calories,
    servingSize: existing.servingSize,
    servingUnit: existing.servingUnit,
    quantity: existing.quantity,
    protein: existing.protein,
    carbs: existing.carbs,
    fat: existing.fat,
    fiber: existing.fiber,
    mealType: existing.mealType,
    notes: existing.notes,
  });
}

export async function moveFoodEntry(id: string, mealType: MealType) {
  return updateFoodEntry(id, { mealType });
}

export async function addFoodLibraryItem(input: FoodLibraryInput) {
  const db = getDb();
  const timestamp = nowIso();
  const item: FoodLibraryItem = {
    ...input,
    id: createId(),
    useCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.foodLibraryItems.put(item);
  return item;
}

export async function updateFoodLibraryItem(id: string, input: Partial<FoodLibraryInput>) {
  const db = getDb();
  const existing = await db.foodLibraryItems.get(id);
  if (!existing) throw new Error("Food item not found.");
  const updated: FoodLibraryItem = { ...existing, ...input, updatedAt: nowIso() };
  await db.foodLibraryItems.put(updated);
  return updated;
}

export async function deleteFoodLibraryItem(id: string) {
  const db = getDb();
  await db.foodLibraryItems.delete(id);
}

export async function markFoodUsed(id: string) {
  const db = getDb();
  const item = await db.foodLibraryItems.get(id);
  if (!item) return null;
  const updated: FoodLibraryItem = {
    ...item,
    useCount: item.useCount + 1,
    lastUsedAt: nowIso(),
    updatedAt: nowIso(),
  };
  await db.foodLibraryItems.put(updated);
  return updated;
}

export async function toggleFoodFavorite(id: string) {
  const db = getDb();
  const item = await db.foodLibraryItems.get(id);
  if (!item) throw new Error("Food item not found.");
  const updated: FoodLibraryItem = { ...item, isFavorite: !item.isFavorite, updatedAt: nowIso() };
  await db.foodLibraryItems.put(updated);
  return updated;
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
  const db = getDb();
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
  await db.mealTemplates.put(template);
  return template;
}

export async function updateMealTemplate(id: string, input: Partial<MealTemplateInput>) {
  const db = getDb();
  const existing = await db.mealTemplates.get(id);
  if (!existing) throw new Error("Meal template not found.");
  const items = input.items ?? existing.items;
  const totals = calculateTemplateTotals(items);
  const updated: MealTemplate = {
    ...existing,
    ...input,
    items,
    ...totals,
    updatedAt: nowIso(),
  };
  await db.mealTemplates.put(updated);
  return updated;
}

export async function deleteMealTemplate(id: string) {
  const db = getDb();
  await db.mealTemplates.delete(id);
}

export async function addMealTemplateToLog(templateId: string, date: string, mealType: MealType) {
  const db = getDb();
  const template = await db.mealTemplates.get(templateId);
  if (!template) throw new Error("Meal template not found.");
  const entries = await Promise.all(
    template.items.map((item) =>
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
  await db.mealTemplates.put({
    ...template,
    useCount: template.useCount + 1,
    lastUsedAt: nowIso(),
    updatedAt: nowIso(),
  });
  return entries;
}

export async function addWeightEntry(input: WeightInput) {
  const db = getDb();
  const entry: WeightEntry = {
    ...input,
    id: createId(),
    createdAt: nowIso(),
  };
  await db.weightEntries.put(entry);
  return entry;
}

export async function updateWeightEntry(id: string, input: Partial<WeightInput>) {
  const db = getDb();
  const existing = await db.weightEntries.get(id);
  if (!existing) throw new Error("Weight entry not found.");
  const updated: WeightEntry = { ...existing, ...input };
  await db.weightEntries.put(updated);
  return updated;
}

export async function deleteWeightEntry(id: string) {
  const db = getDb();
  await db.weightEntries.delete(id);
}


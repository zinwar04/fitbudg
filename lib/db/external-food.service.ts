"use client";

import { FoodLibraryItem } from "@/lib/db/schema";
import { getSupabaseClient } from "@/lib/db/supabase.client";
import { FoodSearchMode, NormalizedExternalFood } from "@/lib/food/external";

interface InvokeError {
  message?: string;
  context?: Response;
}

async function functionErrorMessage(error: unknown) {
  const maybeError = error as InvokeError;
  const response = maybeError.context;

  if (response) {
    try {
      const payload = (await response.clone().json()) as { error?: string };
      if (payload.error) return payload.error;
    } catch {
      // Keep the SDK message when the function did not return JSON.
    }
  }

  return maybeError.message ?? "Food database request failed.";
}

async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke<T>(name, { body });

  if (error) {
    throw new Error(await functionErrorMessage(error));
  }

  if (!data) {
    throw new Error("Food database returned an empty response.");
  }

  return data;
}

async function searchUsdaFoods(query: string) {
  return invokeFunction<{ foods: NormalizedExternalFood[] }>("food-search-usda", { query });
}

async function searchOpenFoodFacts(query: string) {
  return invokeFunction<{ foods: NormalizedExternalFood[] }>("food-search-open-food-facts", { query });
}

async function searchOpenFoodFactsBarcode(barcode: string) {
  return invokeFunction<{ food: NormalizedExternalFood | null; error?: string }>("food-barcode-open-food-facts", { barcode });
}

export async function searchExternalFoods(mode: FoodSearchMode, value: string) {
  const query = value.trim();
  if (!query) return { foods: [] as NormalizedExternalFood[], warnings: [] as string[] };

  if (mode === "barcode") {
    const result = await searchOpenFoodFactsBarcode(query);
    return {
      foods: result.food ? [result.food] : [],
      warnings: result.food || !result.error ? [] : [result.error],
    };
  }

  if (mode === "usda") {
    const result = await searchUsdaFoods(query);
    return { foods: result.foods, warnings: [] as string[] };
  }

  if (mode === "packaged") {
    const result = await searchOpenFoodFacts(query);
    return { foods: result.foods, warnings: [] as string[] };
  }

  const [usda, packaged] = await Promise.allSettled([searchUsdaFoods(query), searchOpenFoodFacts(query)]);
  const foods = [
    ...(usda.status === "fulfilled" ? usda.value.foods : []),
    ...(packaged.status === "fulfilled" ? packaged.value.foods : []),
  ];
  const warnings = [
    ...(usda.status === "rejected" ? [usda.reason instanceof Error ? usda.reason.message : "USDA search failed."] : []),
    ...(packaged.status === "rejected" ? [packaged.reason instanceof Error ? packaged.reason.message : "Open Food Facts search failed."] : []),
  ];

  if (foods.length === 0 && warnings.length === 2) {
    throw new Error(warnings.join(" "));
  }

  return { foods, warnings };
}

export async function importExternalFood(food: NormalizedExternalFood) {
  return invokeFunction<{ item: FoodLibraryItem; created: boolean }>("food-import-to-library", { food });
}

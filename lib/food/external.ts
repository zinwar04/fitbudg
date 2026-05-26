import { FoodCategory } from "@/lib/db/schema";

export type ExternalFoodSource = "usda" | "open_food_facts";
export type ExternalFoodDataQuality = "complete" | "partial" | "limited";

export type NormalizedExternalFood = {
  name: string;
  brand: string | null;
  caloriesPerServing: number | null;
  servingSize: number;
  servingUnit: string;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  category: FoodCategory;
  isFavorite: false;
  notes: string;
  source: ExternalFoodSource;
  external_id: string;
  source_url: string | null;
  data_quality: ExternalFoodDataQuality;
  raw_external_data: unknown;
};

export type FoodSearchMode = "all" | "usda" | "packaged" | "barcode";

export function externalFoodKey(food: Pick<NormalizedExternalFood, "source" | "external_id">) {
  return `${food.source}:${food.external_id}`;
}

export function externalSourceLabel(source: ExternalFoodSource) {
  return source === "usda" ? "USDA" : "Open Food Facts";
}

export function dataQualityLabel(quality: ExternalFoodDataQuality) {
  if (quality === "complete") return "Complete";
  if (quality === "partial") return "Partial";
  return "Limited";
}

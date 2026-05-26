export const foodCategories = [
  "protein",
  "carbs",
  "vegetables",
  "fruits",
  "dairy",
  "fats",
  "drinks",
  "snacks",
  "meals",
  "other",
] as const;

export const externalFoodSources = ["usda", "open_food_facts"] as const;
export const foodDataQualities = ["complete", "partial", "limited"] as const;

export type FoodCategory = (typeof foodCategories)[number];
export type ExternalFoodSource = (typeof externalFoodSources)[number];
export type FoodDataQuality = (typeof foodDataQualities)[number];

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
  data_quality: FoodDataQuality;
  raw_external_data: unknown;
};

export function dataQualityFor(
  calories: number | null,
  protein: number | null,
  carbs: number | null,
  fat: number | null,
): FoodDataQuality {
  if (!hasPositiveCalories(calories)) return "limited";
  return protein !== null && carbs !== null && fat !== null ? "complete" : "partial";
}

export function hasPositiveCalories(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function categoryFromText(value: string): FoodCategory {
  const text = value.toLowerCase();

  if (/\b(chicken|beef|fish|salmon|tuna|turkey|pork|egg|eggs|shrimp|tofu|tempeh|lentil|bean|beans)\b/.test(text)) {
    return "protein";
  }
  if (/\b(rice|pasta|bread|oat|oats|potato|cereal|noodle|flour|quinoa|barley)\b/.test(text)) {
    return "carbs";
  }
  if (/\b(spinach|lettuce|broccoli|carrot|tomato|cucumber|pepper|onion|vegetable|zucchini|cabbage)\b/.test(text)) {
    return "vegetables";
  }
  if (/\b(apple|banana|orange|berry|berries|grape|mango|fruit|date|dates|pear|peach)\b/.test(text)) {
    return "fruits";
  }
  if (/\b(milk|yogurt|yoghurt|cheese|cream|dairy|kefir)\b/.test(text)) {
    return "dairy";
  }
  if (/\b(oil|butter|avocado|nuts|almond|peanut|walnut|cashew|tahini|seed|seeds)\b/.test(text)) {
    return "fats";
  }
  if (/\b(water|juice|soda|cola|coffee|tea|drink|beverage)\b/.test(text)) {
    return "drinks";
  }
  if (/\b(chips|cookie|cookies|chocolate|candy|bar|snack|cracker|popcorn)\b/.test(text)) {
    return "snacks";
  }
  if (/\b(meal|pizza|sandwich|burger|soup|stew|salad|wrap|bowl)\b/.test(text)) {
    return "meals";
  }

  return "other";
}

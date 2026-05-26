import {
  NormalizedExternalFood,
  categoryFromText,
  dataQualityFor,
} from "./foodTypes.ts";

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as AnyRecord : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundNutrient(value: number | null) {
  return value === null ? null : Math.round(value * 10) / 10;
}

function nutriment(nutriments: AnyRecord, key: string) {
  return roundNutrient(numberValue(nutriments[key]));
}

function kcalPer100g(nutriments: AnyRecord) {
  const kcal = numberValue(nutriments["energy-kcal_100g"]);
  if (kcal !== null) return roundNutrient(kcal);

  const kj = numberValue(nutriments.energy_100g);
  return kj !== null ? roundNutrient(kj / 4.184) : null;
}

export function openFoodFactsUserAgent(contactEmail: string) {
  return `FitBudget/1.0 (${contactEmail})`;
}

export function normalizeOpenFoodFactsProduct(value: unknown, fallbackCode?: string): NormalizedExternalFood | null {
  const product = asRecord(value);
  if (!product) return null;

  const code = stringValue(product.code) || stringValue(product._id) || stringValue(product.id) || fallbackCode?.trim() || "";
  if (!code) return null;

  const name =
    stringValue(product.product_name) ||
    stringValue(product.product_name_en) ||
    stringValue(product.generic_name) ||
    `Packaged food ${code}`;
  const brand = stringValue(product.brands) || null;
  const nutriments = asRecord(product.nutriments) ?? {};
  const calories = kcalPer100g(nutriments);
  const protein = nutriment(nutriments, "proteins_100g");
  const carbs = nutriment(nutriments, "carbohydrates_100g");
  const fat = nutriment(nutriments, "fat_100g");
  const fiber = nutriment(nutriments, "fiber_100g");
  const serving = stringValue(product.serving_size);
  const categories = [
    name,
    brand ?? "",
    stringValue(product.categories),
    Array.isArray(product.categories_tags) ? product.categories_tags.join(" ") : "",
    Array.isArray(product.food_groups_tags) ? product.food_groups_tags.join(" ") : "",
  ].join(" ");
  const sourceUrl = stringValue(product.url) || `https://world.openfoodfacts.org/product/${code}`;
  const notes = [
    "Data from Open Food Facts. Community-provided data; verify the package label if needed.",
    serving ? `Package serving listed as: ${serving}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    name,
    brand,
    caloriesPerServing: calories,
    servingSize: 100,
    servingUnit: "g",
    protein,
    carbs,
    fat,
    fiber,
    category: categoryFromText(categories),
    isFavorite: false,
    notes,
    source: "open_food_facts",
    external_id: code,
    source_url: sourceUrl,
    data_quality: dataQualityFor(calories, protein, carbs, fat),
    raw_external_data: product,
  };
}

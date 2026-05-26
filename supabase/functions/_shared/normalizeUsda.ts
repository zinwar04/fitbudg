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

function nutrientFields(nutrient: AnyRecord) {
  const nested = asRecord(nutrient.nutrient);
  return {
    id: String(nutrient.nutrientId ?? nested?.id ?? ""),
    number: String(nutrient.nutrientNumber ?? nested?.number ?? ""),
    name: stringValue(nutrient.nutrientName ?? nested?.name).toLowerCase(),
    unit: stringValue(nutrient.unitName ?? nested?.unitName).toLowerCase(),
    value: numberValue(nutrient.value ?? nutrient.amount),
  };
}

function findNutrient(food: AnyRecord, matcher: (nutrient: ReturnType<typeof nutrientFields>) => boolean) {
  const nutrients = Array.isArray(food.foodNutrients) ? food.foodNutrients : [];
  for (const item of nutrients) {
    const nutrient = asRecord(item);
    if (!nutrient) continue;
    const fields = nutrientFields(nutrient);
    if (fields.value !== null && matcher(fields)) {
      return fields;
    }
  }

  return null;
}

function energyKcal(food: AnyRecord) {
  const kcal = findNutrient(
    food,
    (nutrient) =>
      (nutrient.id === "1008" || nutrient.number === "208" || nutrient.name === "energy") &&
      nutrient.unit.includes("kcal"),
  );
  if (kcal?.value !== undefined && kcal.value !== null) return roundNutrient(kcal.value);

  const kj = findNutrient(
    food,
    (nutrient) =>
      (nutrient.id === "1062" || nutrient.name === "energy") &&
      (nutrient.unit === "kj" || nutrient.unit.includes("kilojoule")),
  );
  return kj?.value !== undefined && kj.value !== null ? roundNutrient(kj.value / 4.184) : null;
}

function nutrientValue(food: AnyRecord, matcher: (name: string, id: string, number: string) => boolean) {
  const nutrient = findNutrient(food, (fields) => matcher(fields.name, fields.id, fields.number));
  return roundNutrient(nutrient?.value ?? null);
}

export function normalizeUsdaFood(value: unknown): NormalizedExternalFood | null {
  const food = asRecord(value);
  if (!food) return null;

  const fdcId = String(food.fdcId ?? "").trim();
  const name = stringValue(food.description);
  if (!fdcId || !name) return null;

  const brand = stringValue(food.brandOwner) || stringValue(food.brandName) || null;
  const calories = energyKcal(food);
  const protein = nutrientValue(food, (nameValue, id, number) => id === "1003" || number === "203" || nameValue === "protein");
  const carbs = nutrientValue(
    food,
    (nameValue, id, number) =>
      id === "1005" ||
      number === "205" ||
      nameValue.includes("carbohydrate, by difference") ||
      nameValue === "carbohydrate",
  );
  const fat = nutrientValue(
    food,
    (nameValue, id, number) =>
      id === "1004" ||
      number === "204" ||
      nameValue.includes("total lipid") ||
      nameValue === "fat",
  );
  const fiber = nutrientValue(
    food,
    (nameValue, id, number) =>
      id === "1079" ||
      number === "291" ||
      nameValue.includes("fiber, total dietary") ||
      nameValue === "fiber",
  );

  const servingSize = numberValue(food.servingSize);
  const servingUnit = stringValue(food.servingSizeUnit);
  const notes = [
    "Data from USDA FoodData Central. Values are normalized per 100g when available.",
    servingSize && servingUnit ? `USDA serving listed as: ${servingSize} ${servingUnit}.` : "",
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
    category: categoryFromText(`${name} ${brand ?? ""}`),
    isFavorite: false,
    notes,
    source: "usda",
    external_id: fdcId,
    source_url: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${fdcId}/nutrients`,
    data_quality: dataQualityFor(calories, protein, carbs, fat),
    raw_external_data: food,
  };
}

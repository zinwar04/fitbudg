export interface ComparableFood {
  name: string;
  brand?: string;
  caloriesPerServing: number;
  servingSize: number;
  servingUnit: string;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

function normalizeText(value: string | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeNumber(value: number | undefined) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 10) / 10 : 0;
}

function normalizeUnit(value: string | undefined) {
  const normalized = normalizeText(value).replace(/\./g, "");
  const aliases: Record<string, string> = {
    gram: "g",
    grams: "g",
    kilogram: "kg",
    kilograms: "kg",
    milliliter: "ml",
    milliliters: "ml",
    litre: "l",
    liter: "l",
    litres: "l",
    liters: "l",
    ounce: "oz",
    ounces: "oz",
    pound: "lb",
    pounds: "lb",
    servings: "serving",
    pieces: "piece",
    slices: "slice",
    cups: "cup",
    tablespoons: "tbsp",
    tablespoon: "tbsp",
    teaspoons: "tsp",
    teaspoon: "tsp",
  };
  return aliases[normalized] ?? normalized;
}

function brandsMatch(a: ComparableFood, b: ComparableFood) {
  const first = normalizeText(a.brand);
  const second = normalizeText(b.brand);
  return !first || !second || first === second;
}

function closeEnough(first: number | undefined, second: number | undefined, relativeTolerance: number, absoluteTolerance: number) {
  const a = normalizeNumber(first);
  const b = normalizeNumber(second);
  const delta = Math.abs(a - b);
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  return delta <= absoluteTolerance || delta / scale <= relativeTolerance;
}

export function foodDuplicateKey(food: ComparableFood) {
  return [
    normalizeText(food.name),
    normalizeText(food.brand),
    normalizeNumber(food.caloriesPerServing),
    normalizeNumber(food.servingSize),
    normalizeText(food.servingUnit),
    normalizeNumber(food.protein),
    normalizeNumber(food.carbs),
    normalizeNumber(food.fat),
    normalizeNumber(food.fiber),
  ].join("|");
}

export function areLikelyDuplicateFoods(first: ComparableFood, second: ComparableFood) {
  if (foodDuplicateKey(first) === foodDuplicateKey(second)) return true;
  if (!normalizeText(first.name) || normalizeText(first.name) !== normalizeText(second.name)) return false;
  if (!brandsMatch(first, second)) return false;
  if (normalizeUnit(first.servingUnit) !== normalizeUnit(second.servingUnit)) return false;

  return closeEnough(first.servingSize, second.servingSize, 0.05, 0.25) && closeEnough(first.caloriesPerServing, second.caloriesPerServing, 0.08, 10);
}

export function groupLikelyDuplicateFoods<T extends ComparableFood>(foods: T[]) {
  const groups: T[][] = [];

  foods.forEach((food) => {
    const group = groups.find((candidate) => candidate.some((item) => areLikelyDuplicateFoods(item, food)));
    if (group) group.push(food);
    else groups.push([food]);
  });

  return groups.filter((group) => group.length > 1);
}

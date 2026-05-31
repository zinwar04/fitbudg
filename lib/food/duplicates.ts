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
    .replace(/\s+/g, " ");
}

function normalizeNumber(value: number | undefined) {
  return Number.isFinite(value) ? Math.round((value as number) * 10) / 10 : 0;
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

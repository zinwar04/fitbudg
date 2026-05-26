import { FoodCategory } from "@/lib/db/schema";
import type { FoodLibraryInput, MealTemplateInput } from "@/lib/db/food.service";
import { foodCategories, servingUnits } from "@/lib/utils/constants";

type Cell = string | number | boolean | null | undefined;

const foodHeaderMap: Record<string, keyof FoodLibraryInput> = {
  name: "name",
  food: "name",
  brand: "brand",
  calories: "caloriesPerServing",
  caloriesperserving: "caloriesPerServing",
  kcal: "caloriesPerServing",
  servingsize: "servingSize",
  size: "servingSize",
  unit: "servingUnit",
  servingunit: "servingUnit",
  protein: "protein",
  carbs: "carbs",
  carbohydrates: "carbs",
  fat: "fat",
  fiber: "fiber",
  category: "category",
  favorite: "isFavorite",
  isfavorite: "isFavorite",
  notes: "notes",
};

function normalizeHeader(value: Cell) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseNumber(value: Cell, fallback = 0) {
  const number = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(number) ? number : fallback;
}

function parseBoolean(value: Cell) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["true", "yes", "y", "1", "favorite", "starred"].includes(normalized);
}

function parseCategory(value: Cell): FoodCategory {
  const normalized = String(value ?? "other").trim().toLowerCase() as FoodCategory;
  return foodCategories.includes(normalized) ? normalized : "other";
}

function parseUnit(value: Cell) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "serving";
  return servingUnits.includes(normalized as (typeof servingUnits)[number]) ? normalized : normalized.slice(0, 24);
}

function escapeCsv(value: Cell) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function downloadTextFile(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function foodsToCsv(foods: FoodLibraryInput[]) {
  const headers = ["name", "brand", "caloriesPerServing", "servingSize", "servingUnit", "protein", "carbs", "fat", "fiber", "category", "isFavorite", "notes"];
  const rows = foods.map((food) =>
    [
      food.name,
      food.brand ?? "",
      food.caloriesPerServing,
      food.servingSize,
      food.servingUnit,
      food.protein ?? "",
      food.carbs ?? "",
      food.fat ?? "",
      food.fiber ?? "",
      food.category,
      food.isFavorite,
      food.notes ?? "",
    ]
      .map(escapeCsv)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

export function mealTemplatesToCsv(templates: MealTemplateInput[]) {
  const headers = ["template", "description", "foodLibraryId", "ingredient", "quantity", "servingSize", "servingUnit", "calories", "protein", "carbs", "fat", "isFavorite"];
  const rows = templates.flatMap((template) =>
    template.items.map((item) =>
      [
        template.name,
        template.description ?? "",
        item.foodLibraryId,
        item.name,
        item.quantity,
        item.servingSize,
        item.servingUnit,
        item.calories,
        item.protein ?? "",
        item.carbs ?? "",
        item.fat ?? "",
        template.isFavorite,
      ]
        .map(escapeCsv)
        .join(","),
    ),
  );
  return [headers.join(","), ...rows].join("\n");
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export async function readSpreadsheetRows(file: File) {
  if (file.name.toLowerCase().endsWith(".xlsx")) {
    const readXlsxFile = (await import("read-excel-file/browser")).default;
    const rows = (await readXlsxFile(file)) as unknown as Cell[][];
    return rows.map((row) => row.map((cell) => cell ?? ""));
  }
  return parseCsv(await file.text());
}

export function parseFoodRows(rows: Cell[][]): FoodLibraryInput[] {
  const [headerRow, ...dataRows] = rows;
  if (!headerRow) return [];
  const headers = headerRow.map((header) => foodHeaderMap[normalizeHeader(header)]);

  return dataRows
    .map((row) => {
      const draft: Partial<FoodLibraryInput> = {};
      row.forEach((cell, index) => {
        const key = headers[index];
        if (!key) return;
        if (key === "caloriesPerServing" || key === "servingSize" || key === "protein" || key === "carbs" || key === "fat" || key === "fiber") draft[key] = parseNumber(cell);
        else if (key === "category") draft.category = parseCategory(cell);
        else if (key === "isFavorite") draft.isFavorite = parseBoolean(cell);
        else if (key === "servingUnit") draft.servingUnit = parseUnit(cell);
        else draft[key] = String(cell ?? "").trim() as never;
      });
      return {
        name: draft.name?.trim() ?? "",
        brand: draft.brand?.trim() || undefined,
        caloriesPerServing: draft.caloriesPerServing ?? 0,
        servingSize: draft.servingSize ?? 1,
        servingUnit: draft.servingUnit || "serving",
        protein: draft.protein || undefined,
        carbs: draft.carbs || undefined,
        fat: draft.fat || undefined,
        fiber: draft.fiber || undefined,
        category: draft.category ?? "other",
        isFavorite: draft.isFavorite ?? false,
        notes: draft.notes?.trim() || undefined,
      };
    })
    .filter((food) => food.name && food.caloriesPerServing > 0 && food.servingSize > 0);
}

export function parseMealTemplateRows(rows: Cell[][]): MealTemplateInput[] {
  const [headerRow, ...dataRows] = rows;
  if (!headerRow) return [];
  const headers = headerRow.map(normalizeHeader);
  const valueAt = (row: Cell[], names: string[]) => row[headers.findIndex((header) => names.includes(header))];
  const groups = new Map<string, MealTemplateInput>();

  dataRows.forEach((row) => {
    const templateName = String(valueAt(row, ["template", "name", "meal"]) ?? "").trim();
    const ingredient = String(valueAt(row, ["ingredient", "food", "foodname"]) ?? "").trim();
    if (!templateName || !ingredient) return;

    const existing =
      groups.get(templateName) ??
      ({
        name: templateName,
        description: String(valueAt(row, ["description", "notes"]) ?? "").trim() || undefined,
        items: [],
        isFavorite: parseBoolean(valueAt(row, ["favorite", "isfavorite"])),
      } satisfies MealTemplateInput);

    existing.items.push({
      foodLibraryId: String(valueAt(row, ["foodlibraryid", "foodid"]) ?? ingredient).trim() || ingredient,
      name: ingredient,
      quantity: parseNumber(valueAt(row, ["quantity", "qty"]), 1),
      servingSize: parseNumber(valueAt(row, ["servingsize", "size"]), 1),
      servingUnit: parseUnit(valueAt(row, ["servingunit", "unit"])),
      calories: Math.round(parseNumber(valueAt(row, ["calories", "kcal"]), 0)),
      protein: parseNumber(valueAt(row, ["protein"]), 0) || undefined,
      carbs: parseNumber(valueAt(row, ["carbs", "carbohydrates"]), 0) || undefined,
      fat: parseNumber(valueAt(row, ["fat"]), 0) || undefined,
    });
    groups.set(templateName, existing);
  });

  return Array.from(groups.values()).filter((template) => template.items.length > 0);
}

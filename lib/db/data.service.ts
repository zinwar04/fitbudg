import { AppExport, clearDatabase, emptyExport, exportDatabase, mergeDatabase, replaceDatabase } from "@/lib/db/database";
import { isRecord } from "@/lib/utils/formatting";

const exportKeys: (keyof AppExport)[] = [
  "userProfiles",
  "dailyCalorieLogs",
  "foodEntries",
  "foodLibraryItems",
  "mealTemplates",
  "weightEntries",
  "budgetProfiles",
  "transactions",
  "habits",
  "habitEntries",
  "appSettings",
  "assistantSessions",
];

export async function exportJson() {
  return exportDatabase();
}

export async function clearAllData() {
  await clearDatabase();
}

export function parseImportJson(value: unknown): AppExport {
  if (!isRecord(value)) {
    throw new Error("Import file must contain a JSON object.");
  }
  const parsed = emptyExport();
  exportKeys.forEach((key) => {
    const table = value[key];
    if (table === undefined) return;
    if (!Array.isArray(table)) {
      throw new Error(`Import field "${key}" must be an array.`);
    }
    parsed[key] = table as never;
  });
  return parsed;
}

export async function importJson(data: AppExport, mode: "merge" | "replace") {
  if (mode === "replace") await replaceDatabase(data);
  else await mergeDatabase(data);
}


import { AllUserData } from "@/lib/db/schema";
import { getDb } from "@/lib/db/database";
import { getAppSettings, getBudgetProfile, getUserProfile } from "@/lib/db/profile.service";

export async function getAllUserData(): Promise<AllUserData> {
  const db = getDb();
  const [profile, settings, budgetProfile, logs, foodEntries, foodLibrary, mealTemplates, weightEntries, transactions, habits, habitEntries] =
    await Promise.all([
      getUserProfile(),
      getAppSettings(),
      getBudgetProfile(),
      db.dailyCalorieLogs.toArray(),
      db.foodEntries.toArray(),
      db.foodLibraryItems.toArray(),
      db.mealTemplates.toArray(),
      db.weightEntries.toArray(),
      db.transactions.toArray(),
      db.habits.toArray(),
      db.habitEntries.toArray(),
    ]);

  return {
    profile,
    settings,
    budgetProfile,
    logs,
    foodEntries,
    foodLibrary,
    mealTemplates,
    weightEntries,
    transactions,
    habits,
    habitEntries,
  };
}


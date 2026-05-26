import { AllUserData } from "@/lib/db/schema";
import { getBudgetData } from "@/lib/db/budget.service";
import { getFoodData } from "@/lib/db/food.service";
import { getHabitsData } from "@/lib/db/habits.service";
import { getAppSettings, getBudgetProfile, getUserProfile } from "@/lib/db/profile.service";

export async function getAllUserData(): Promise<AllUserData> {
  const [profile, settings, budgetProfile, food, budget, habitData] = await Promise.all([
    getUserProfile(),
    getAppSettings(),
    getBudgetProfile(),
    getFoodData(),
    getBudgetData(),
    getHabitsData(),
  ]);

  return {
    profile,
    settings,
    budgetProfile,
    logs: food.logs,
    foodEntries: food.entries,
    foodLibrary: food.library,
    mealTemplates: food.mealTemplates,
    weightEntries: food.weights,
    transactions: budget.transactions,
    habits: habitData.habits,
    habitEntries: habitData.entries,
  };
}

import { format, subDays } from "date-fns";
import { AppExport, mergeDatabase, replaceDatabase } from "@/lib/db/database";
import {
  AppSettings,
  BudgetProfile,
  DailyCalorieLog,
  FoodEntry,
  FoodLibraryItem,
  Habit,
  HabitEntry,
  MealTemplate,
  Transaction,
  UserProfile,
  WeightEntry,
} from "@/lib/db/schema";
import { defaultSettings } from "@/lib/utils/constants";
import { createId, nowIso } from "@/lib/utils/formatting";

function dateKey(daysAgo: number) {
  return format(subDays(new Date(), daysAgo), "yyyy-MM-dd");
}

function demoFood(
  name: string,
  caloriesPerServing: number,
  servingSize: number,
  servingUnit: string,
  protein: number,
  carbs: number,
  fat: number,
  category: FoodLibraryItem["category"],
  brand?: string,
): FoodLibraryItem {
  const timestamp = nowIso();
  return {
    id: createId(),
    name,
    brand,
    caloriesPerServing,
    servingSize,
    servingUnit,
    protein,
    carbs,
    fat,
    category,
    isFavorite: ["Chicken breast", "Eggs", "Rice", "Greek yogurt", "Tuna"].includes(name),
    useCount: Math.floor(Math.random() * 12),
    lastUsedAt: dateKey(Math.floor(Math.random() * 6)),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function entryFromFood(food: FoodLibraryItem, date: string, mealType: FoodEntry["mealType"], quantity = 1, notes?: string): FoodEntry {
  const timestamp = nowIso();
  return {
    id: createId(),
    date,
    logId: `log-${date}`,
    foodLibraryId: food.id,
    name: food.name,
    calories: Math.round(food.caloriesPerServing * quantity),
    servingSize: food.servingSize,
    servingUnit: food.servingUnit,
    quantity,
    protein: food.protein ? Math.round(food.protein * quantity) : undefined,
    carbs: food.carbs ? Math.round(food.carbs * quantity) : undefined,
    fat: food.fat ? Math.round(food.fat * quantity) : undefined,
    fiber: food.fiber,
    mealType,
    notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function makeTemplate(name: string, description: string, items: MealTemplate["items"]): MealTemplate {
  const timestamp = nowIso();
  const totalCalories = items.reduce((total, item) => total + item.calories, 0);
  const totalProtein = items.reduce((total, item) => total + (item.protein ?? 0), 0);
  const totalCarbs = items.reduce((total, item) => total + (item.carbs ?? 0), 0);
  const totalFat = items.reduce((total, item) => total + (item.fat ?? 0), 0);
  return {
    id: createId(),
    name,
    description,
    items,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    isFavorite: true,
    useCount: Math.floor(Math.random() * 8) + 1,
    lastUsedAt: dateKey(Math.floor(Math.random() * 4)),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function buildDemoData(): AppExport {
  const timestamp = nowIso();
  const profile: UserProfile = {
    id: createId(),
    name: "Alex",
    age: 28,
    sex: "male",
    height: 178,
    weight: 82,
    goalWeight: 75,
    activityLevel: "moderate",
    fitnessGoal: "lose",
    weeklyWeightDelta: 0.45,
    unitSystem: "metric",
    onboardingComplete: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const settings: AppSettings = {
    ...defaultSettings,
    theme: "system",
    accentColor: "emerald",
    currency: "IQD",
    updatedAt: timestamp,
  };

  const budgetProfile: BudgetProfile = {
    id: "1",
    monthlyIncome: 1800000,
    monthlyBudget: 950000,
    currency: "IQD",
    currencySymbol: "IQD",
    categoryBudgets: [
      { category: "rent", limit: 300000 },
      { category: "food", limit: 220000 },
      { category: "transport", limit: 85000 },
      { category: "bills", limit: 65000 },
      { category: "internet", limit: 45000 },
      { category: "shopping", limit: 90000 },
      { category: "health", limit: 40000 },
      { category: "education", limit: 25000 },
      { category: "entertainment", limit: 45000 },
      { category: "family", limit: 60000 },
      { category: "savings", limit: 120000 },
      { category: "other", limit: 40000 },
    ],
    updatedAt: timestamp,
  };

  const foods = [
    demoFood("Chicken breast", 165, 100, "g", 31, 0, 4, "protein"),
    demoFood("Rice", 205, 1, "cup", 4, 45, 0, "carbs"),
    demoFood("Eggs", 72, 1, "egg", 6, 0, 5, "protein"),
    demoFood("Lentils", 230, 1, "cup", 18, 40, 1, "carbs"),
    demoFood("Tuna", 132, 100, "g", 29, 0, 1, "protein"),
    demoFood("Greek yogurt", 130, 170, "g", 17, 6, 4, "dairy"),
    demoFood("Oats", 154, 40, "g", 5, 27, 3, "carbs"),
    demoFood("Banana", 105, 1, "medium", 1, 27, 0, "fruits"),
    demoFood("Olive oil", 119, 1, "tbsp", 0, 0, 14, "fats"),
    demoFood("Bread", 80, 1, "slice", 3, 15, 1, "carbs"),
    demoFood("Milk", 122, 1, "cup", 8, 12, 5, "dairy"),
    demoFood("Cheese", 113, 28, "g", 7, 1, 9, "dairy"),
    demoFood("Tomato", 22, 1, "medium", 1, 5, 0, "vegetables"),
    demoFood("Cucumber", 16, 100, "g", 1, 4, 0, "vegetables"),
    demoFood("Bulgur", 151, 1, "cup", 6, 34, 0, "carbs"),
    demoFood("Potato", 161, 1, "medium", 4, 37, 0, "carbs"),
    demoFood("Apple", 95, 1, "medium", 0, 25, 0, "fruits"),
    demoFood("Walnut", 185, 28, "g", 4, 4, 18, "fats"),
    demoFood("Salami", 120, 28, "g", 6, 1, 10, "protein"),
    demoFood("Tortilla", 140, 1, "wrap", 4, 24, 4, "carbs"),
    demoFood("Hummus", 70, 2, "tbsp", 2, 4, 5, "fats"),
    demoFood("Dates", 66, 1, "date", 0, 18, 0, "fruits"),
  ];

  const byName = (name: string) => foods.find((food) => food.name === name) ?? foods[0];
  const entries: FoodEntry[] = [];
  const logs: DailyCalorieLog[] = [];
  const caloriePattern = [1920, 2100, 2350, 2620, 1880, 2020, 980, 2240, 1760, 2140, 1980, 1910, 1875, 1930];

  for (let index = 13; index >= 0; index -= 1) {
    const date = dateKey(index);
    logs.push({
      id: `log-${date}`,
      date,
      notes: index === 11 ? "birthday dinner with family" : index === 7 ? "not hungry today" : undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const target = caloriePattern[13 - index];
    entries.push(entryFromFood(byName("Oats"), date, "breakfast", index === 7 ? 0.5 : 1));
    entries.push(entryFromFood(byName("Greek yogurt"), date, "breakfast", 1));
    entries.push(entryFromFood(byName("Chicken breast"), date, "lunch", index === 7 ? 0.6 : 1.4));
    entries.push(entryFromFood(byName(index % 2 === 0 ? "Rice" : "Bulgur"), date, "lunch", index === 7 ? 0.5 : 1.2));
    entries.push(entryFromFood(byName("Tomato"), date, "lunch", 1));
    if (target > 1800) entries.push(entryFromFood(byName(index % 3 === 0 ? "Tuna" : "Eggs"), date, "dinner", index % 3 === 0 ? 1.2 : 3));
    if (target > 2100) entries.push(entryFromFood(byName("Tortilla"), date, "dinner", 1));
    if (target > 2300) entries.push(entryFromFood(byName("Cheese"), date, "snack", 2, index === 11 ? "birthday dinner with family" : undefined));
    if (target > 1700) entries.push(entryFromFood(byName(index % 2 === 0 ? "Banana" : "Apple"), date, "snack", 1));
    if (index === 11) entries.push(entryFromFood(byName("Olive oil"), date, "dinner", 2, "birthday dinner with family"));
  }

  const templateItems = (names: string[]): MealTemplate["items"] =>
    names.map((name) => {
      const food = byName(name);
      return {
        foodLibraryId: food.id,
        name: food.name,
        quantity: name === "Chicken breast" ? 1.5 : 1,
        servingSize: food.servingSize,
        servingUnit: food.servingUnit,
        calories: Math.round(food.caloriesPerServing * (name === "Chicken breast" ? 1.5 : 1)),
        protein: food.protein ? Math.round(food.protein * (name === "Chicken breast" ? 1.5 : 1)) : undefined,
        carbs: food.carbs,
        fat: food.fat,
      };
    });

  const mealTemplates = [
    makeTemplate("Chicken Rice Bowl", "High-protein lunch with simple staples.", templateItems(["Chicken breast", "Rice", "Tomato", "Cucumber"])),
    makeTemplate("Egg and Salami Breakfast", "Fast savory breakfast for busy mornings.", templateItems(["Eggs", "Salami", "Bread"])),
    makeTemplate("Tuna Tortilla Wrap", "Portable high-protein meal.", templateItems(["Tuna", "Tortilla", "Hummus", "Cucumber"])),
  ];

  const weights: WeightEntry[] = [82, 81.9, 81.8, 81.7, 81.6, 81.5, 81.4].map((weight, index) => ({
    id: createId(),
    date: dateKey(13 - index * 2),
    weight,
    bodyFatPercent: 22 - index * 0.1,
    notes: index === 0 ? "Starting point" : undefined,
    createdAt: timestamp,
  }));

  const transaction = (
    daysAgo: number,
    title: string,
    amount: number,
    category: Transaction["category"],
    type: Transaction["type"] = "expense",
    paymentMethod: Transaction["paymentMethod"] = "cash",
  ): Transaction => ({
    id: createId(),
    type,
    amount,
    currency: "IQD",
    category,
    paymentMethod,
    date: dateKey(daysAgo),
    title,
    isRecurring: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const transactions: Transaction[] = [
    transaction(13, "Salary", 1800000, "income", "income", "bank"),
    transaction(13, "Rent", 300000, "rent", "expense", "bank"),
    transaction(12, "Taxi to work", 9000, "transport"),
    transaction(11, "Birthday restaurant", 72000, "food", "expense", "card"),
    transaction(10, "Mobile internet", 35000, "internet", "expense", "card"),
    transaction(9, "Grocery run", 94000, "food", "expense", "card"),
    transaction(8, "Gym day pass", 12000, "health"),
    transaction(7, "Bus card top-up", 15000, "transport"),
    transaction(6, "Coffee and snack", 8000, "food"),
    transaction(5, "Family support", 35000, "family", "expense", "bank"),
    transaction(4, "Medicine", 18000, "health"),
    transaction(3, "Groceries", 54000, "food", "expense", "card"),
    transaction(2, "Notebook", 6000, "education"),
    transaction(1, "Taxi", 7000, "transport"),
    transaction(0, "Lunch ingredients", 22000, "food"),
  ];

  const habits: Habit[] = [
    { id: createId(), name: "Drink 8 glasses of water", icon: "Droplets", type: "quantitative", targetValue: 8, unit: "glasses", category: "nutrition", color: "#3b82f6", isActive: true, streak: 4, createdAt: timestamp },
    { id: createId(), name: "Log all meals", icon: "ClipboardList", type: "boolean", category: "nutrition", color: "#10b981", isActive: true, streak: 5, createdAt: timestamp },
    { id: createId(), name: "Exercise today", icon: "Dumbbell", type: "boolean", category: "fitness", color: "#f59e0b", isActive: true, streak: 1, createdAt: timestamp },
    { id: createId(), name: "Log all expenses", icon: "ReceiptText", type: "boolean", category: "finance", color: "#8b5cf6", isActive: true, streak: 6, createdAt: timestamp },
  ];

  const habitEntries: HabitEntry[] = [];
  habits.forEach((habit, habitIndex) => {
    for (let index = 13; index >= 0; index -= 1) {
      const completionRate = habitIndex === 2 ? 0.5 : habitIndex === 0 ? 0.85 : 0.8;
      const completed = Math.random() < completionRate || index < habit.streak;
      const value = habit.type === "quantitative" ? (completed ? habit.targetValue : Math.max(0, (habit.targetValue ?? 1) - 3)) : undefined;
      habitEntries.push({
        id: createId(),
        date: dateKey(index),
        habitId: habit.id,
        completed,
        value,
        createdAt: timestamp,
      });
    }
  });

  return {
    userProfiles: [profile],
    dailyCalorieLogs: logs,
    foodEntries: entries,
    foodLibraryItems: foods,
    mealTemplates,
    weightEntries: weights,
    budgetProfiles: [budgetProfile],
    transactions,
    habits,
    habitEntries,
    appSettings: [settings],
    assistantSessions: [],
  };
}

export async function loadDemoData(mode: "merge" | "replace" = "replace") {
  const data = buildDemoData();
  if (mode === "replace") await replaceDatabase(data);
  else await mergeDatabase(data);
  return data;
}


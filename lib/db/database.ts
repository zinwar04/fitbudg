import Dexie, { Table } from "dexie";
import {
  AppSettings,
  AssistantSession,
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

export interface AppExport {
  userProfiles: UserProfile[];
  dailyCalorieLogs: DailyCalorieLog[];
  foodEntries: FoodEntry[];
  foodLibraryItems: FoodLibraryItem[];
  mealTemplates: MealTemplate[];
  weightEntries: WeightEntry[];
  budgetProfiles: BudgetProfile[];
  transactions: Transaction[];
  habits: Habit[];
  habitEntries: HabitEntry[];
  appSettings: AppSettings[];
  assistantSessions: AssistantSession[];
}

class FitBudgetDatabase extends Dexie {
  userProfiles!: Table<UserProfile, string>;
  dailyCalorieLogs!: Table<DailyCalorieLog, string>;
  foodEntries!: Table<FoodEntry, string>;
  foodLibraryItems!: Table<FoodLibraryItem, string>;
  mealTemplates!: Table<MealTemplate, string>;
  weightEntries!: Table<WeightEntry, string>;
  budgetProfiles!: Table<BudgetProfile, string>;
  transactions!: Table<Transaction, string>;
  habits!: Table<Habit, string>;
  habitEntries!: Table<HabitEntry, string>;
  appSettings!: Table<AppSettings, string>;
  assistantSessions!: Table<AssistantSession, string>;

  constructor() {
    super("fitbudget");
    this.version(1).stores({
      userProfiles: "id, onboardingComplete, updatedAt",
      dailyCalorieLogs: "id, date, updatedAt",
      foodEntries: "id, date, logId, mealType, foodLibraryId, mealTemplateId, createdAt",
      foodLibraryItems: "id, name, brand, category, isFavorite, useCount, lastUsedAt, createdAt",
      mealTemplates: "id, name, isFavorite, useCount, lastUsedAt, createdAt",
      weightEntries: "id, date, createdAt",
      budgetProfiles: "id, updatedAt",
      transactions: "id, type, amount, category, paymentMethod, date, recurringId, createdAt",
      habits: "id, name, category, isActive, streak, createdAt",
      habitEntries: "id, date, habitId, [habitId+date], completed, createdAt",
      appSettings: "id, updatedAt",
      assistantSessions: "id, title, updatedAt",
    });
  }
}

let database: FitBudgetDatabase | null = null;

export function getDb() {
  if (typeof window === "undefined") {
    throw new Error("FitBudget IndexedDB is only available in the browser.");
  }

  if (!database) {
    database = new FitBudgetDatabase();
  }

  return database;
}

export function emptyExport(): AppExport {
  return {
    userProfiles: [],
    dailyCalorieLogs: [],
    foodEntries: [],
    foodLibraryItems: [],
    mealTemplates: [],
    weightEntries: [],
    budgetProfiles: [],
    transactions: [],
    habits: [],
    habitEntries: [],
    appSettings: [],
    assistantSessions: [],
  };
}

export async function exportDatabase(): Promise<AppExport> {
  const db = getDb();
  return {
    userProfiles: await db.userProfiles.toArray(),
    dailyCalorieLogs: await db.dailyCalorieLogs.toArray(),
    foodEntries: await db.foodEntries.toArray(),
    foodLibraryItems: await db.foodLibraryItems.toArray(),
    mealTemplates: await db.mealTemplates.toArray(),
    weightEntries: await db.weightEntries.toArray(),
    budgetProfiles: await db.budgetProfiles.toArray(),
    transactions: await db.transactions.toArray(),
    habits: await db.habits.toArray(),
    habitEntries: await db.habitEntries.toArray(),
    appSettings: await db.appSettings.toArray(),
    assistantSessions: await db.assistantSessions.toArray(),
  };
}

export async function clearDatabase() {
  const db = getDb();
  await db.transaction(
    "rw",
    [
      db.userProfiles,
      db.dailyCalorieLogs,
      db.foodEntries,
      db.foodLibraryItems,
      db.mealTemplates,
      db.weightEntries,
      db.budgetProfiles,
      db.transactions,
      db.habits,
      db.habitEntries,
      db.appSettings,
      db.assistantSessions,
    ],
    async () => {
      await Promise.all([
        db.userProfiles.clear(),
        db.dailyCalorieLogs.clear(),
        db.foodEntries.clear(),
        db.foodLibraryItems.clear(),
        db.mealTemplates.clear(),
        db.weightEntries.clear(),
        db.budgetProfiles.clear(),
        db.transactions.clear(),
        db.habits.clear(),
        db.habitEntries.clear(),
        db.appSettings.clear(),
        db.assistantSessions.clear(),
      ]);
    },
  );
}

export async function replaceDatabase(data: AppExport) {
  const db = getDb();
  await clearDatabase();
  await db.transaction(
    "rw",
    [
      db.userProfiles,
      db.dailyCalorieLogs,
      db.foodEntries,
      db.foodLibraryItems,
      db.mealTemplates,
      db.weightEntries,
      db.budgetProfiles,
      db.transactions,
      db.habits,
      db.habitEntries,
      db.appSettings,
      db.assistantSessions,
    ],
    async () => {
      await Promise.all([
        db.userProfiles.bulkPut(data.userProfiles),
        db.dailyCalorieLogs.bulkPut(data.dailyCalorieLogs),
        db.foodEntries.bulkPut(data.foodEntries),
        db.foodLibraryItems.bulkPut(data.foodLibraryItems),
        db.mealTemplates.bulkPut(data.mealTemplates),
        db.weightEntries.bulkPut(data.weightEntries),
        db.budgetProfiles.bulkPut(data.budgetProfiles),
        db.transactions.bulkPut(data.transactions),
        db.habits.bulkPut(data.habits),
        db.habitEntries.bulkPut(data.habitEntries),
        db.appSettings.bulkPut(data.appSettings),
        db.assistantSessions.bulkPut(data.assistantSessions),
      ]);
    },
  );
}

export async function mergeDatabase(data: AppExport) {
  const db = getDb();
  await db.transaction(
    "rw",
    [
      db.userProfiles,
      db.dailyCalorieLogs,
      db.foodEntries,
      db.foodLibraryItems,
      db.mealTemplates,
      db.weightEntries,
      db.budgetProfiles,
      db.transactions,
      db.habits,
      db.habitEntries,
      db.appSettings,
      db.assistantSessions,
    ],
    async () => {
      await Promise.all([
        db.userProfiles.bulkPut(data.userProfiles),
        db.dailyCalorieLogs.bulkPut(data.dailyCalorieLogs),
        db.foodEntries.bulkPut(data.foodEntries),
        db.foodLibraryItems.bulkPut(data.foodLibraryItems),
        db.mealTemplates.bulkPut(data.mealTemplates),
        db.weightEntries.bulkPut(data.weightEntries),
        db.budgetProfiles.bulkPut(data.budgetProfiles),
        db.transactions.bulkPut(data.transactions),
        db.habits.bulkPut(data.habits),
        db.habitEntries.bulkPut(data.habitEntries),
        db.appSettings.bulkPut(data.appSettings),
        db.assistantSessions.bulkPut(data.assistantSessions),
      ]);
    },
  );
}

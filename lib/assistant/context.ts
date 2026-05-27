import { AllUserData, FoodEntry, FoodLibraryItem, Habit, Transaction } from "@/lib/db/schema";
import { calculateBudgetSummary } from "@/lib/calculations/budget";
import { calculateNutritionTargets } from "@/lib/calculations/nutrition";
import { average, localDateKey, sum } from "@/lib/utils/formatting";

export interface AssistantContext {
  generatedAt: string;
  dataInventory: {
    hasProfile: boolean;
    foodEntries: number;
    foodLibraryItems: number;
    mealTemplates: number;
    weightEntries: number;
    transactions: number;
    habits: number;
    habitEntries: number;
  };
  settings: {
    unitSystem: string;
    currency: string;
    firstDayOfWeek: number;
  };
  profile: {
    name: string;
    age: number;
    sex: string;
    height: number;
    weight: number;
    goalWeight: number;
    activityLevel: string;
    fitnessGoal: string;
    weeklyWeightDelta: number;
    unitSystem: string;
    bodyFatPercent?: number;
  } | null;
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    bmr: number;
    tdee: number;
    bmi: {
      value: number;
      category: string;
    };
    warnings: string[];
  } | null;
  nutrition: {
    today: DailyNutritionSummary;
    last7Days: NutritionWindowSummary;
    last14Days: NutritionWindowSummary;
    last30Days: NutritionWindowSummary;
    recentDailyTotals: DailyNutritionSummary[];
    topFoodsLast30: FoodFrequency[];
    recentFoodEntries: AssistantFoodEntry[];
    calorieLogNotes: { date: string; notes: string }[];
  };
  foodLibrary: {
    totalItems: number;
    favoriteItems: AssistantLibraryFood[];
    mostUsedItems: AssistantLibraryFood[];
    recentlyUsedItems: AssistantLibraryFood[];
    mealTemplates: AssistantMealTemplate[];
  };
  body: {
    latestWeight: number | null;
    goalWeight: number | null;
    unitSystem: string;
    weightEntriesLast12: { date: string; weight: number; bodyFatPercent?: number; notes?: string }[];
    changeFromOldestShown: number | null;
  };
  budget: {
    currency: string;
    currencySymbol: string;
    monthlyIncome: number;
    monthlyBudget: number;
    monthStartDay: number;
    cycle: {
      start: string;
      end: string;
      dayInCycle: number;
      daysInCycle: number;
      daysLeftInCycle: number;
      spent: number;
      income: number;
      net: number;
      remaining: number;
      pacePercent: number;
      pacing: string;
      safeToSpendToday: number;
      averageDailySpend: number;
    };
    categoryBudgets: { category: string; limit: number; spent: number; remaining: number }[];
    dailySpendThisCycle: { date: string; spent: number }[];
    recentTransactions: AssistantTransaction[];
    topExpensesThisCycle: AssistantTransaction[];
    recurringTransactions: AssistantTransaction[];
  };
  habits: {
    totalCount: number;
    activeCount: number;
    completionRateLast7Days: number;
    activeHabits: AssistantHabit[];
    recentEntries: { date: string; habitName: string; completed: boolean; value?: number; notes?: string }[];
  };
}

interface DailyNutritionSummary {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  entries: number;
}

interface NutritionWindowSummary {
  days: number;
  loggedDays: number;
  averageCaloriesOnLoggedDays: number;
  averageProteinOnLoggedDays: number;
  averageCaloriesAllDays: number;
  totalCalories: number;
  totalProtein: number;
  caloriesVsTargetOnLoggedDays: number | null;
  proteinVsTargetOnLoggedDays: number | null;
}

interface FoodFrequency {
  name: string;
  count: number;
  totalCalories: number;
  totalProtein: number;
  lastLoggedDate: string;
}

interface AssistantFoodEntry {
  date: string;
  mealType: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  quantity: number;
  servingSize: number;
  servingUnit: string;
  notes?: string;
}

interface AssistantLibraryFood {
  name: string;
  brand?: string;
  category: string;
  caloriesPerServing: number;
  servingSize: number;
  servingUnit: string;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  useCount: number;
  isFavorite: boolean;
}

interface AssistantMealTemplate {
  name: string;
  description?: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  useCount: number;
  isFavorite: boolean;
  items: {
    name: string;
    quantity: number;
    servingSize: number;
    servingUnit: string;
    calories: number;
    protein?: number;
  }[];
}

interface AssistantTransaction {
  date: string;
  title: string;
  type: string;
  amount: number;
  currency: string;
  category: string;
  paymentMethod: string;
  isRecurring: boolean;
  notes?: string;
}

interface AssistantHabit {
  name: string;
  type: string;
  category: string;
  targetValue?: number;
  unit?: string;
  streak: number;
  completionRateLast7Days: number;
}

function round(value: number, digits = 0) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function dateKeysForLastDays(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    return localDateKey(date);
  });
}

function summarizeDay(date: string, entries: FoodEntry[]): DailyNutritionSummary {
  const dayEntries = entries.filter((entry) => entry.date === date);
  return {
    date,
    calories: Math.round(sum(dayEntries.map((entry) => entry.calories))),
    protein: Math.round(sum(dayEntries.map((entry) => entry.protein ?? 0))),
    carbs: Math.round(sum(dayEntries.map((entry) => entry.carbs ?? 0))),
    fat: Math.round(sum(dayEntries.map((entry) => entry.fat ?? 0))),
    fiber: Math.round(sum(dayEntries.map((entry) => entry.fiber ?? 0))),
    entries: dayEntries.length,
  };
}

function summarizeNutritionWindow(dailyTotals: DailyNutritionSummary[], targetCalories: number | null, targetProtein: number | null): NutritionWindowSummary {
  const loggedDays = dailyTotals.filter((day) => day.entries > 0);
  const averageCaloriesOnLoggedDays = Math.round(average(loggedDays.map((day) => day.calories)));
  const averageProteinOnLoggedDays = Math.round(average(loggedDays.map((day) => day.protein)));

  return {
    days: dailyTotals.length,
    loggedDays: loggedDays.length,
    averageCaloriesOnLoggedDays,
    averageProteinOnLoggedDays,
    averageCaloriesAllDays: Math.round(average(dailyTotals.map((day) => day.calories))),
    totalCalories: Math.round(sum(dailyTotals.map((day) => day.calories))),
    totalProtein: Math.round(sum(dailyTotals.map((day) => day.protein))),
    caloriesVsTargetOnLoggedDays: targetCalories && loggedDays.length > 0 ? averageCaloriesOnLoggedDays - targetCalories : null,
    proteinVsTargetOnLoggedDays: targetProtein && loggedDays.length > 0 ? averageProteinOnLoggedDays - targetProtein : null,
  };
}

function topFoods(entries: FoodEntry[], dates: string[]) {
  const frequency = new Map<string, FoodFrequency>();
  entries
    .filter((entry) => dates.includes(entry.date))
    .forEach((entry) => {
      const current = frequency.get(entry.name) ?? {
        name: entry.name,
        count: 0,
        totalCalories: 0,
        totalProtein: 0,
        lastLoggedDate: entry.date,
      };
      frequency.set(entry.name, {
        ...current,
        count: current.count + 1,
        totalCalories: Math.round(current.totalCalories + entry.calories),
        totalProtein: Math.round(current.totalProtein + (entry.protein ?? 0)),
        lastLoggedDate: entry.date > current.lastLoggedDate ? entry.date : current.lastLoggedDate,
      });
    });

  return Array.from(frequency.values())
    .sort((a, b) => b.count - a.count || b.totalCalories - a.totalCalories)
    .slice(0, 12);
}

function toAssistantFoodEntry(entry: FoodEntry): AssistantFoodEntry {
  return {
    date: entry.date,
    mealType: entry.mealType,
    name: entry.name,
    calories: Math.round(entry.calories),
    protein: entry.protein === undefined ? undefined : round(entry.protein, 1),
    carbs: entry.carbs === undefined ? undefined : round(entry.carbs, 1),
    fat: entry.fat === undefined ? undefined : round(entry.fat, 1),
    fiber: entry.fiber === undefined ? undefined : round(entry.fiber, 1),
    quantity: entry.quantity,
    servingSize: entry.servingSize,
    servingUnit: entry.servingUnit,
    notes: entry.notes,
  };
}

function toAssistantLibraryFood(food: FoodLibraryItem): AssistantLibraryFood {
  return {
    name: food.name,
    brand: food.brand,
    category: food.category,
    caloriesPerServing: food.caloriesPerServing,
    servingSize: food.servingSize,
    servingUnit: food.servingUnit,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    fiber: food.fiber,
    useCount: food.useCount,
    isFavorite: food.isFavorite,
  };
}

function toAssistantTransaction(transaction: Transaction): AssistantTransaction {
  return {
    date: transaction.date,
    title: transaction.title,
    type: transaction.type,
    amount: Math.round(transaction.amount),
    currency: transaction.currency,
    category: transaction.category,
    paymentMethod: transaction.paymentMethod,
    isRecurring: transaction.isRecurring,
    notes: transaction.notes,
  };
}

function habitCompletionRate(habit: Habit, dates: string[], data: AllUserData) {
  const entries = data.habitEntries.filter((entry) => entry.habitId === habit.id && dates.includes(entry.date));
  return dates.length > 0 ? Math.round((entries.filter((entry) => entry.completed).length / dates.length) * 100) : 0;
}

export function buildAssistantContext(data: AllUserData): AssistantContext {
  const targets = calculateNutritionTargets(data.profile);
  const dates30 = dateKeysForLastDays(30);
  const dates14 = dates30.slice(-14);
  const dates7 = dates30.slice(-7);
  const dailyTotals30 = dates30.map((date) => summarizeDay(date, data.foodEntries));
  const dailyTotals14 = dailyTotals30.slice(-14);
  const dailyTotals7 = dailyTotals30.slice(-7);
  const budget = calculateBudgetSummary(data.budgetProfile, data.transactions);
  const activeHabits = data.habits.filter((habit) => habit.isActive);
  const completed = data.habitEntries.filter((entry) => dates7.includes(entry.date) && entry.completed).length;
  const possible = activeHabits.length * 7;
  const sortedFoodEntries = [...data.foodEntries].sort((a, b) => `${b.date}-${b.createdAt}`.localeCompare(`${a.date}-${a.createdAt}`));
  const sortedWeights = [...data.weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  const recentWeights = sortedWeights.slice(-12);
  const latestWeight = recentWeights.at(-1)?.weight ?? data.profile?.weight ?? null;
  const oldestShownWeight = recentWeights[0]?.weight ?? null;
  const cycleExpenses = data.transactions.filter((transaction) => transaction.type === "expense" && transaction.date >= budget.cycleStart && transaction.date <= budget.cycleEnd);
  const sortedTransactions = [...data.transactions].sort((a, b) => `${b.date}-${b.createdAt}`.localeCompare(`${a.date}-${a.createdAt}`));

  return {
    generatedAt: new Date().toISOString(),
    dataInventory: {
      hasProfile: Boolean(data.profile),
      foodEntries: data.foodEntries.length,
      foodLibraryItems: data.foodLibrary.length,
      mealTemplates: data.mealTemplates.length,
      weightEntries: data.weightEntries.length,
      transactions: data.transactions.length,
      habits: data.habits.length,
      habitEntries: data.habitEntries.length,
    },
    settings: {
      unitSystem: data.settings.unitSystem,
      currency: data.settings.currency,
      firstDayOfWeek: data.settings.firstDayOfWeek,
    },
    profile: data.profile
      ? {
          name: data.profile.name,
          age: data.profile.age,
          sex: data.profile.sex,
          height: data.profile.height,
          weight: data.profile.weight,
          goalWeight: data.profile.goalWeight,
          activityLevel: data.profile.activityLevel,
          fitnessGoal: data.profile.fitnessGoal,
          weeklyWeightDelta: data.profile.weeklyWeightDelta,
          unitSystem: data.profile.unitSystem,
          bodyFatPercent: data.profile.bodyFatPercent,
        }
      : null,
    targets: targets
      ? {
          calories: targets.calories,
          protein: targets.protein,
          carbs: targets.carbs,
          fat: targets.fat,
          bmr: targets.bmr,
          tdee: targets.tdee,
          bmi: targets.bmi,
          warnings: targets.warnings,
        }
      : null,
    nutrition: {
      today: dailyTotals30.at(-1) ?? summarizeDay(localDateKey(), data.foodEntries),
      last7Days: summarizeNutritionWindow(dailyTotals7, targets?.calories ?? null, targets?.protein ?? null),
      last14Days: summarizeNutritionWindow(dailyTotals14, targets?.calories ?? null, targets?.protein ?? null),
      last30Days: summarizeNutritionWindow(dailyTotals30, targets?.calories ?? null, targets?.protein ?? null),
      recentDailyTotals: dailyTotals30,
      topFoodsLast30: topFoods(data.foodEntries, dates30),
      recentFoodEntries: sortedFoodEntries.slice(0, 40).map(toAssistantFoodEntry),
      calorieLogNotes: data.logs
        .filter((log) => log.notes)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 12)
        .map((log) => ({ date: log.date, notes: log.notes ?? "" })),
    },
    foodLibrary: {
      totalItems: data.foodLibrary.length,
      favoriteItems: data.foodLibrary.filter((food) => food.isFavorite).sort((a, b) => b.useCount - a.useCount).slice(0, 20).map(toAssistantLibraryFood),
      mostUsedItems: [...data.foodLibrary].sort((a, b) => b.useCount - a.useCount).slice(0, 25).map(toAssistantLibraryFood),
      recentlyUsedItems: [...data.foodLibrary]
        .filter((food) => food.lastUsedAt)
        .sort((a, b) => (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? ""))
        .slice(0, 20)
        .map(toAssistantLibraryFood),
      mealTemplates: [...data.mealTemplates]
        .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || b.useCount - a.useCount)
        .slice(0, 20)
        .map((meal) => ({
          name: meal.name,
          description: meal.description,
          totalCalories: meal.totalCalories,
          totalProtein: meal.totalProtein,
          totalCarbs: meal.totalCarbs,
          totalFat: meal.totalFat,
          useCount: meal.useCount,
          isFavorite: meal.isFavorite,
          items: meal.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            servingSize: item.servingSize,
            servingUnit: item.servingUnit,
            calories: item.calories,
            protein: item.protein,
          })),
        })),
    },
    body: {
      latestWeight,
      goalWeight: data.profile?.goalWeight ?? null,
      unitSystem: data.profile?.unitSystem ?? data.settings.unitSystem,
      weightEntriesLast12: recentWeights.map((entry) => ({
        date: entry.date,
        weight: entry.weight,
        bodyFatPercent: entry.bodyFatPercent,
        notes: entry.notes,
      })),
      changeFromOldestShown: latestWeight !== null && oldestShownWeight !== null ? round(latestWeight - oldestShownWeight, 1) : null,
    },
    budget: {
      currency: data.budgetProfile.currency,
      currencySymbol: data.budgetProfile.currencySymbol,
      monthlyIncome: Math.round(data.budgetProfile.monthlyIncome),
      monthlyBudget: Math.round(data.budgetProfile.monthlyBudget),
      monthStartDay: data.budgetProfile.monthStartDay,
      cycle: {
        start: budget.cycleStart,
        end: budget.cycleEnd,
        dayInCycle: budget.dayInCycle,
        daysInCycle: budget.daysInCycle,
        daysLeftInCycle: budget.daysLeftInCycle,
        spent: Math.round(budget.spent),
        income: Math.round(budget.income),
        net: Math.round(budget.net),
        remaining: Math.round(budget.remaining),
        pacePercent: Math.round(budget.paceRatio * 100),
        pacing: budget.pacing,
        safeToSpendToday: Math.round(budget.safeToSpendToday),
        averageDailySpend: Math.round(budget.averageDailySpend),
      },
      categoryBudgets: budget.categorySpend.map((category) => ({
        category: category.category,
        limit: Math.round(category.limit),
        spent: Math.round(category.spent),
        remaining: Math.round(category.limit - category.spent),
      })),
      dailySpendThisCycle: budget.dailySpend.map((day) => ({ date: day.date, spent: Math.round(day.spent) })),
      recentTransactions: sortedTransactions.slice(0, 40).map(toAssistantTransaction),
      topExpensesThisCycle: [...cycleExpenses].sort((a, b) => b.amount - a.amount).slice(0, 10).map(toAssistantTransaction),
      recurringTransactions: data.transactions.filter((transaction) => transaction.isRecurring).slice(0, 20).map(toAssistantTransaction),
    },
    habits: {
      totalCount: data.habits.length,
      activeCount: activeHabits.length,
      completionRateLast7Days: possible > 0 ? Math.round((completed / possible) * 100) : 0,
      activeHabits: activeHabits
        .map((habit) => ({
          name: habit.name,
          type: habit.type,
          category: habit.category,
          targetValue: habit.targetValue,
          unit: habit.unit,
          streak: habit.streak,
          completionRateLast7Days: habitCompletionRate(habit, dates7, data),
        }))
        .sort((a, b) => b.streak - a.streak),
      recentEntries: data.habitEntries
        .filter((entry) => dates14.includes(entry.date))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 40)
        .map((entry) => ({
          date: entry.date,
          habitName: data.habits.find((habit) => habit.id === entry.habitId)?.name ?? "Unknown habit",
          completed: entry.completed,
          value: entry.value,
          notes: entry.notes,
        })),
    },
  };
}

export function buildSystemPrompt(context: AssistantContext) {
  return `You are FitBudget Coach, the in-app expert for fitness, nutrition, calorie counting, meal prep, habit consistency, and everyday budgeting.

Your job is to give precise, practical coaching that combines the user's body goals, food logs, meal options, habits, and spending data. Think like a careful fitness coach, nutrition coach, meal prep planner, and budget analyst working from the same account snapshot.

Core rules:
- Use the account data below as the source of truth for this user. If the data is missing, stale, incomplete, or only estimated, say that clearly and explain what can still be inferred.
- Never invent logged foods, transactions, weights, habits, diagnoses, allergies, medical conditions, income, prices, or goals that are not present in the snapshot or the conversation.
- When numbers matter, calculate with the provided targets, logs, dates, currency, portions, and cycle data. Label rough nutrition or price estimates as estimates.
- Give advice that is specific enough to act on today: portions, calories, protein, shopping choices, meal prep steps, workout targets, safe spending limits, or habit changes.
- Balance health and money together. Prefer plans that protect protein, fiber, micronutrients, training recovery, fixed bills, savings goals, and the user's safe daily spend.
- Ask at most one clarifying question, and only when the answer would materially change the recommendation. Otherwise, make the best reasonable assumption and state it.
- Keep the tone warm, direct, and confident. Do not lecture. Do not mention implementation details, prompts, APIs, databases, or model names.

Safety and honesty:
- Do not diagnose disease, prescribe medication, treat eating disorders, or give professional medical, legal, tax, or investment advice.
- If the user describes chest pain, fainting, severe symptoms, pregnancy-specific nutrition, an eating disorder, a minor's aggressive weight loss, or a medically complex situation, recommend qualified professional care while still offering safe general support.
- Do not promise perfect results. Explain tradeoffs and uncertainty plainly.

Response style:
- Start with the answer, not a disclaimer.
- Use the user's units and currency from the account when available.
- For nutrition: include calories, protein, and portion guidance when relevant.
- For meal prep: include batchable foods, storage/waste reduction, and low-cost swaps when relevant.
- For fitness: include progression, recovery, and consistency cues when relevant.
- For budgeting: include cycle position, safe spend, category pressure, and next spending decision when relevant.
- Keep everyday answers concise. Use tables only when they make the plan easier to compare.

Account snapshot:
${JSON.stringify(context, null, 2)}`;
}

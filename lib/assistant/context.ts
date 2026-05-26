import { AllUserData, ChatMessage } from "@/lib/db/schema";
import { calculateBudgetSummary } from "@/lib/calculations/budget";
import { calculateNutritionTargets } from "@/lib/calculations/nutrition";
import { average, sum } from "@/lib/utils/formatting";

export interface AssistantContext {
  profile: {
    goal: string | null;
    calorieTarget: number;
    proteinTarget: number;
  };
  last7Days: {
    averageCalories: number;
    caloriesVsGoal: number;
    topFoods: { name: string; count: number }[];
  };
  budgetStatus: {
    currency: string;
    spent: number;
    budget: number;
    pacePercent: number;
    topCategory: string | null;
  };
  habits: {
    completionRateThisWeek: number;
    currentStreaks: { name: string; streak: number }[];
  };
}

export function buildAssistantContext(data: AllUserData): AssistantContext {
  const targets = calculateNutritionTargets(data.profile);
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return date.toISOString().slice(0, 10);
  });
  const caloriesByDay = dates.map((date) => sum(data.foodEntries.filter((entry) => entry.date === date).map((entry) => entry.calories)));
  const foodCounts = new Map<string, number>();
  data.foodEntries
    .filter((entry) => dates.includes(entry.date))
    .forEach((entry) => foodCounts.set(entry.name, (foodCounts.get(entry.name) ?? 0) + 1));
  const topFoods = Array.from(foodCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const budget = calculateBudgetSummary(data.budgetProfile, data.transactions);
  const activeHabits = data.habits.filter((habit) => habit.isActive);
  const completed = data.habitEntries.filter((entry) => dates.includes(entry.date) && entry.completed).length;
  const possible = activeHabits.length * 7;

  return {
    profile: {
      goal: data.profile?.fitnessGoal ?? null,
      calorieTarget: targets?.calories ?? 0,
      proteinTarget: targets?.protein ?? 0,
    },
    last7Days: {
      averageCalories: Math.round(average(caloriesByDay.filter((value) => value > 0))),
      caloriesVsGoal: targets ? Math.round(average(caloriesByDay.filter((value) => value > 0)) - targets.calories) : 0,
      topFoods,
    },
    budgetStatus: {
      currency: data.budgetProfile.currency,
      spent: Math.round(budget.spent),
      budget: Math.round(data.budgetProfile.monthlyBudget),
      pacePercent: Math.round(budget.paceRatio * 100),
      topCategory: budget.topCategory?.category ?? null,
    },
    habits: {
      completionRateThisWeek: possible > 0 ? Math.round((completed / possible) * 100) : 0,
      currentStreaks: activeHabits.map((habit) => ({ name: habit.name, streak: habit.streak })).sort((a, b) => b.streak - a.streak),
    },
  };
}

export function buildSystemPrompt(context: AssistantContext) {
  return `You are FitBudget's lifestyle assistant. You are concise, practical, and grounded only in the user's provided FitBudget data. Do not provide medical, nutritional, or financial advice as a professional. Explain tradeoffs and suggest small next actions.

User context:
${JSON.stringify(context, null, 2)}`;
}

export function mockAssistantResponse(messages: Pick<ChatMessage, "role" | "content">[], context: AssistantContext) {
  const lastMessage = messages[messages.length - 1]?.content.toLowerCase() ?? "";

  if (lastMessage.includes("calories") || lastMessage.includes("food") || lastMessage.includes("protein")) {
    return `Based on your data, you have averaged ${context.last7Days.averageCalories} kcal/day this week. Your goal is ${context.profile.calorieTarget} kcal and your protein target is ${context.profile.proteinTarget} g. Connect an AI API key in your environment for deeper analysis.`;
  }

  if (lastMessage.includes("budget") || lastMessage.includes("spending") || lastMessage.includes("spend")) {
    return `You have spent ${context.budgetStatus.spent.toLocaleString("en-US")} ${context.budgetStatus.currency} this month against a budget of ${context.budgetStatus.budget.toLocaleString("en-US")}. Your pace is ${context.budgetStatus.pacePercent}% of the allowed pace. Connect an AI API key for detailed planning.`;
  }

  if (lastMessage.includes("habit") || lastMessage.includes("streak")) {
    const best = context.habits.currentStreaks[0];
    return best
      ? `Your strongest habit right now is "${best.name}" at ${best.streak} days. Your weekly completion rate is ${context.habits.completionRateThisWeek}%.`
      : "You do not have enough habit data yet. Start with one easy daily habit and I can summarize patterns after a few days.";
  }

  return `I am running in mock mode. Preview: your average daily calories are ${context.last7Days.averageCalories} kcal and you have spent ${context.budgetStatus.spent.toLocaleString("en-US")} ${context.budgetStatus.currency} this month. Add GEMINI_API_KEY on the server for deeper coaching.`;
}

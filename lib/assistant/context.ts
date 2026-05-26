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
    averageProtein: number;
    caloriesVsGoal: number;
    loggedDays: number;
    topFoods: { name: string; count: number }[];
  };
  budgetStatus: {
    currency: string;
    spent: number;
    budget: number;
    remaining: number;
    pacePercent: number;
    safeToSpendToday: number;
    topCategory: string | null;
  };
  habits: {
    activeCount: number;
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
  const proteinByDay = dates.map((date) => sum(data.foodEntries.filter((entry) => entry.date === date).map((entry) => entry.protein ?? 0)));
  const loggedDays = caloriesByDay.filter((value) => value > 0).length;
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
      averageProtein: Math.round(average(proteinByDay.filter((value) => value > 0))),
      caloriesVsGoal: targets ? Math.round(average(caloriesByDay.filter((value) => value > 0)) - targets.calories) : 0,
      loggedDays,
      topFoods,
    },
    budgetStatus: {
      currency: data.budgetProfile.currency,
      spent: Math.round(budget.spent),
      budget: Math.round(data.budgetProfile.monthlyBudget),
      remaining: Math.round(budget.remaining),
      pacePercent: Math.round(budget.paceRatio * 100),
      safeToSpendToday: Math.round(budget.safeToSpendToday),
      topCategory: budget.topCategory?.category ?? null,
    },
    habits: {
      activeCount: activeHabits.length,
      completionRateThisWeek: possible > 0 ? Math.round((completed / possible) * 100) : 0,
      currentStreaks: activeHabits.map((habit) => ({ name: habit.name, streak: habit.streak })).sort((a, b) => b.streak - a.streak),
    },
  };
}

export function buildSystemPrompt(context: AssistantContext) {
  return `You are FitBudget Coach, a practical fitness, nutrition, budgeting, and habit coach inside the FitBudget app.

You can answer any budget, fitness, nutrition, food logging, meal planning, habit, or health-and-money tradeoff question. Be useful even when the user asks broadly: start with the likely goal, use the FitBudget data below, explain the tradeoff, and give a small next action. If data is missing, say what is missing and give a reasonable general plan instead of refusing.

Style:
- Warm, direct, and concise.
- Coach the whole situation, not only the literal wording of the question.
- Use numbers from the context when they help.
- Prefer practical steps, simple meal/spending ideas, and behavior changes the user can do today.
- Ask at most one clarifying question only when the answer would change the plan.
- Do not provide diagnosis, medical treatment, investment advice, or claim professional certainty.

User context:
${JSON.stringify(context, null, 2)}`;
}

export function mockAssistantResponse(messages: Pick<ChatMessage, "role" | "content">[], context: AssistantContext) {
  const lastMessage = messages[messages.length - 1]?.content.toLowerCase() ?? "";
  const topFood = context.last7Days.topFoods[0]?.name;
  const topHabit = context.habits.currentStreaks[0];
  const calorieLine =
    context.last7Days.loggedDays > 0
      ? `You logged ${context.last7Days.loggedDays} day(s) this week, averaging ${context.last7Days.averageCalories} kcal and ${context.last7Days.averageProtein} g protein.`
      : "You do not have much food logging data this week yet.";
  const budgetLine = `You have spent ${context.budgetStatus.spent.toLocaleString("en-US")} ${context.budgetStatus.currency} against a ${context.budgetStatus.budget.toLocaleString("en-US")} budget, with about ${context.budgetStatus.safeToSpendToday.toLocaleString("en-US")} ${context.budgetStatus.currency} safe to spend today.`;

  if (lastMessage.includes("calories") || lastMessage.includes("food") || lastMessage.includes("protein")) {
    return `${calorieLine} Your targets are ${context.profile.calorieTarget} kcal and ${context.profile.proteinTarget} g protein. Coach move: plan one protein anchor for the next meal, then adjust carbs or fats around your remaining calories.${topFood ? ` Your most repeated food lately is ${topFood}, so that is a good place to tune portions first.` : ""}`;
  }

  if (lastMessage.includes("budget") || lastMessage.includes("spending") || lastMessage.includes("spend")) {
    return `${budgetLine} Your spending pace is ${context.budgetStatus.pacePercent}% of target pace. Coach move: keep today's flexible purchases under that safe-spend number and check ${context.budgetStatus.topCategory ?? "your largest category"} before buying extras.`;
  }

  if (lastMessage.includes("habit") || lastMessage.includes("streak")) {
    return topHabit
      ? `Your strongest habit right now is "${topHabit.name}" at ${topHabit.streak} days. Weekly completion is ${context.habits.completionRateThisWeek}%. Coach move: protect that streak, then add one tiny supporting habit that takes under two minutes.`
      : "You do not have enough habit data yet. Start with one easy daily habit and I can summarize patterns after a few days.";
  }

  return `${calorieLine} ${budgetLine} Coach move for today: choose one food target and one money target, then keep both small enough to win before bedtime.`;
}

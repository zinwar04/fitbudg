import { differenceInCalendarDays, format, parseISO, subDays } from "date-fns";
import { AllUserData, FoodEntry, Habit, Insight, WeightEntry } from "@/lib/db/schema";
import { calculateNutritionTargets, estimateWeeksToGoal } from "@/lib/calculations/nutrition";
import { calculateBudgetSummary, compareWeekSpend, currentMonthRange, filterTransactionsByDate } from "@/lib/calculations/budget";
import { average, formatCurrency, formatDateKey, localDateKey, sum } from "@/lib/utils/formatting";

function totalCaloriesForDate(entries: FoodEntry[], date: string) {
  return sum(entries.filter((entry) => entry.date === date).map((entry) => entry.calories));
}

function proteinForDate(entries: FoodEntry[], date: string) {
  return sum(entries.filter((entry) => entry.date === date).map((entry) => entry.protein ?? 0));
}

function dateRange(days: number, reference = new Date()) {
  return Array.from({ length: days }, (_, index) => format(subDays(reference, days - index - 1), "yyyy-MM-dd"));
}

function loggingStreak(entries: FoodEntry[], reference = new Date()) {
  let streak = 0;
  for (const date of [...dateRange(90, reference)].reverse()) {
    if (entries.some((entry) => entry.date === date)) streak += 1;
    else if (date < localDateKey(reference)) break;
  }
  return streak;
}

function correlation(points: { x: number; y: number }[]) {
  if (points.length < 3) return 0;
  const avgX = average(points.map((point) => point.x));
  const avgY = average(points.map((point) => point.y));
  const numerator = sum(points.map((point) => (point.x - avgX) * (point.y - avgY)));
  const denominatorX = Math.sqrt(sum(points.map((point) => (point.x - avgX) ** 2)));
  const denominatorY = Math.sqrt(sum(points.map((point) => (point.y - avgY) ** 2)));
  if (denominatorX === 0 || denominatorY === 0) return 0;
  return numerator / (denominatorX * denominatorY);
}

function addInsight(insights: Insight[], insight: Omit<Insight, "id" | "date">) {
  insights.push({
    ...insight,
    id: `${insight.category}-${insight.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    date: new Date().toISOString(),
  });
}

function trendDelta(entries: WeightEntry[], days: number) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sorted.filter((entry) => entry.date >= format(subDays(new Date(), days), "yyyy-MM-dd"));
  if (recent.length < 2) return 0;
  return recent[recent.length - 1].weight - recent[0].weight;
}

function bestHabit(habits: Habit[]) {
  return habits.length > 0 ? [...habits].sort((a, b) => b.streak - a.streak)[0] : null;
}

export function generateInsights(data: AllUserData): Insight[] {
  const insights: Insight[] = [];
  const today = new Date();
  const todayKey = localDateKey(today);
  const targets = calculateNutritionTargets(data.profile);
  const weekDates = dateRange(7, today);
  const weekCalories = weekDates.map((date) => totalCaloriesForDate(data.foodEntries, date)).filter((value) => value > 0);
  const averageCalories = average(weekCalories);
  const calorieGoal = targets?.calories ?? 0;
  const profile = data.profile;

  if (targets && averageCalories > calorieGoal + 200) {
    addInsight(insights, {
      category: "fitness",
      severity: "warning",
      icon: "Flame",
      title: "Calories running high",
      description: `You have been eating an average of ${Math.round(averageCalories).toLocaleString("en-US")} kcal/day this week, about ${Math.round(averageCalories - calorieGoal).toLocaleString("en-US")} kcal over your goal.`,
      metric: `${Math.round(averageCalories)} kcal/day average`,
      actionLabel: "Review history",
      actionRoute: "/fitness/history",
    });
  }

  if (targets && averageCalories > 0 && averageCalories < calorieGoal - 300) {
    addInsight(insights, {
      category: "fitness",
      severity: "warning",
      icon: "Salad",
      title: "Calories running low",
      description: `You are averaging ${Math.round(calorieGoal - averageCalories).toLocaleString("en-US")} kcal below your goal this week. Make sure you are eating enough.`,
      metric: `${Math.round(averageCalories)} kcal/day`,
      actionLabel: "Log a meal",
      actionRoute: "/fitness/log",
    });
  }

  const streak = loggingStreak(data.foodEntries, today);
  if (streak >= 3) {
    addInsight(insights, {
      category: "celebration",
      severity: "positive",
      icon: "Trophy",
      title: `${streak}-day logging streak`,
      description: `${streak} days of food logging in a row. Consistency is how results happen.`,
      metric: `${streak} days`,
    });
  }

  const lastLog = [...data.foodEntries].sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!lastLog || differenceInCalendarDays(today, parseISO(`${lastLog.date}T00:00:00`)) > 2) {
    const days = lastLog ? differenceInCalendarDays(today, parseISO(`${lastLog.date}T00:00:00`)) : 999;
    addInsight(insights, {
      category: "fitness",
      severity: "neutral",
      icon: "CalendarPlus",
      title: "Food log needs a restart",
      description: lastLog ? `You have not logged a meal in ${days} days. Getting back on track starts with one entry.` : "You have not logged a meal yet. Getting started takes less than a minute.",
      actionLabel: "Open food log",
      actionRoute: "/fitness/log",
    });
  }

  if (profile?.fitnessGoal === "lose") {
    const delta = trendDelta(data.weightEntries, 7);
    if (delta > 0) {
      addInsight(insights, {
        category: "fitness",
        severity: "warning",
        icon: "TrendingUp",
        title: "Weight trend moved up",
        description: `Your weight has trended up by ${delta.toFixed(1)} kg over the last 7 days. Check if your calorie intake is on target.`,
        metric: `+${delta.toFixed(1)} kg`,
        actionLabel: "Open weight log",
        actionRoute: "/fitness/weight",
      });
    }
  }

  if (targets) {
    const proteinAverage = average(weekDates.map((date) => proteinForDate(data.foodEntries, date)).filter((value) => value > 0));
    if (proteinAverage > 0 && proteinAverage < targets.protein * 0.8) {
      addInsight(insights, {
        category: "fitness",
        severity: "neutral",
        icon: "Beef",
        title: "Protein target is slipping",
        description: `Your protein intake has been averaging ${Math.round(proteinAverage)} g/day, below your target of ${targets.protein} g. High protein helps preserve muscle.`,
        metric: `${Math.round(proteinAverage)} g/day`,
      });
    }
  }

  if (profile && data.weightEntries.length >= 5) {
    const sortedWeights = [...data.weightEntries].sort((a, b) => a.date.localeCompare(b.date));
    const first = sortedWeights[0];
    const last = sortedWeights[sortedWeights.length - 1];
    const days = Math.max(1, differenceInCalendarDays(parseISO(`${last.date}T00:00:00`), parseISO(`${first.date}T00:00:00`)));
    const weeklyTrend = ((last.weight - first.weight) / days) * 7;
    const actualWeeks = weeklyTrend === 0 ? Number.POSITIVE_INFINITY : Math.abs((last.weight - profile.goalWeight) / weeklyTrend);
    const originalWeeks = estimateWeeksToGoal(profile.weight, profile.goalWeight, profile.weeklyWeightDelta);
    if (Number.isFinite(actualWeeks) && Number.isFinite(originalWeeks)) {
      addInsight(insights, {
        category: "fitness",
        severity: actualWeeks <= originalWeeks ? "positive" : "neutral",
        icon: "LineChart",
        title: "Goal date estimate updated",
        description: `Based on actual weigh-ins, you are tracking toward your goal in about ${Math.round(actualWeeks)} weeks versus the original ${Math.round(originalWeeks)} week estimate.`,
        metric: `${weeklyTrend.toFixed(2)} kg/week`,
      });
    }
  }

  const recentFoodEntries = data.foodEntries.filter((entry) => weekDates.includes(entry.date));
  const foodCounts = new Map<string, { calories: number; count: number }>();
  recentFoodEntries.forEach((entry) => {
    const current = foodCounts.get(entry.name) ?? { calories: 0, count: 0 };
    foodCounts.set(entry.name, { calories: current.calories + entry.calories, count: current.count + 1 });
  });
  const topFood = Array.from(foodCounts.entries()).sort((a, b) => b[1].count - a[1].count)[0];
  if (topFood && averageCalories > 0) {
    addInsight(insights, {
      category: "fitness",
      severity: "neutral",
      icon: "UtensilsCrossed",
      title: "Most logged food",
      description: `Your most-eaten food this week is ${topFood[0]}. It contributes about ${Math.round((topFood[1].calories / 7 / averageCalories) * 100)}% of your daily calories.`,
      metric: `${topFood[1].count} logs`,
    });
  }

  const budgetSummary = calculateBudgetSummary(data.budgetProfile, data.transactions, today);
  if (budgetSummary.paceRatio > 1.15) {
    const projectedOverspend = Math.max(0, budgetSummary.spent / budgetSummary.dayOfMonth * budgetSummary.daysInMonth - data.budgetProfile.monthlyBudget);
    addInsight(insights, {
      category: "warning",
      severity: budgetSummary.paceRatio > 1.4 ? "danger" : "warning",
      icon: "AlertTriangle",
      title: "Budget pace is fast",
      description: `You have used ${Math.round((budgetSummary.spent / data.budgetProfile.monthlyBudget) * 100)}% of your budget but only ${Math.round((budgetSummary.dayOfMonth / budgetSummary.daysInMonth) * 100)}% of the month has passed. You may overspend by ${formatCurrency(projectedOverspend, data.budgetProfile.currency, data.budgetProfile.currencySymbol)}.`,
      metric: `${Math.round(budgetSummary.paceRatio * 100)}% pace`,
      actionLabel: "Open budget",
      actionRoute: "/budget/overview",
    });
  } else if (budgetSummary.paceRatio > 0 && budgetSummary.paceRatio < 0.85) {
    addInsight(insights, {
      category: "budget",
      severity: "positive",
      icon: "PiggyBank",
      title: "Spending below pace",
      description: `Great financial discipline. You are spending slower than your budget allows. Safe to spend ${formatCurrency(budgetSummary.safeDailySpend, data.budgetProfile.currency, data.budgetProfile.currencySymbol)} per day for the rest of the month.`,
      metric: formatCurrency(budgetSummary.safeDailySpend, data.budgetProfile.currency, data.budgetProfile.currencySymbol),
    });
  }

  budgetSummary.categorySpend
    .filter((category) => category.limit > 0 && category.spent > category.limit)
    .slice(0, 2)
    .forEach((category) => {
      addInsight(insights, {
        category: "budget",
        severity: "warning",
        icon: "Gauge",
        title: `${category.category} over budget`,
        description: `Your ${category.category} spending is ${Math.round(((category.spent - category.limit) / category.limit) * 100)}% over its budget limit.`,
        metric: formatCurrency(category.spent, data.budgetProfile.currency, data.budgetProfile.currencySymbol),
        actionLabel: "Edit limits",
        actionRoute: "/budget/categories",
      });
    });

  if (budgetSummary.largestExpense) {
    addInsight(insights, {
      category: "budget",
      severity: "neutral",
      icon: "Receipt",
      title: "Largest monthly expense",
      description: `Your biggest expense this month is "${budgetSummary.largestExpense.title}" at ${formatCurrency(budgetSummary.largestExpense.amount, data.budgetProfile.currency, data.budgetProfile.currencySymbol)} on ${formatDateKey(budgetSummary.largestExpense.date)}.`,
      metric: formatCurrency(budgetSummary.largestExpense.amount, data.budgetProfile.currency, data.budgetProfile.currencySymbol),
    });
  }

  const weekCompare = compareWeekSpend(data.transactions, today);
  if (weekCompare.current > 0 || weekCompare.previous > 0) {
    addInsight(insights, {
      category: "budget",
      severity: weekCompare.percentChange > 25 ? "warning" : weekCompare.percentChange < 0 ? "positive" : "neutral",
      icon: "BarChart3",
      title: "Weekly spending comparison",
      description: `You have spent ${formatCurrency(weekCompare.current, data.budgetProfile.currency, data.budgetProfile.currencySymbol)} this week, ${Math.abs(Math.round(weekCompare.percentChange))}% ${weekCompare.percentChange >= 0 ? "more" : "less"} than last week.`,
      metric: `${Math.round(weekCompare.percentChange)}%`,
    });
  }

  if (budgetSummary.topCategory?.category === "food" && budgetSummary.spent > 0) {
    addInsight(insights, {
      category: "budget",
      severity: "neutral",
      icon: "ShoppingBasket",
      title: "Food leads spending",
      description: `Food is your largest spending category this month at ${Math.round((budgetSummary.topCategory.spent / budgetSummary.spent) * 100)}% of your total expenses.`,
      metric: formatCurrency(budgetSummary.topCategory.spent, data.budgetProfile.currency, data.budgetProfile.currencySymbol),
    });
  }

  const activeHabits = data.habits.filter((habit) => habit.isActive);
  const todayHabitEntries = data.habitEntries.filter((entry) => entry.date === todayKey && entry.completed);
  if (activeHabits.length > 0 && todayHabitEntries.length / activeHabits.length < 0.5) {
    addInsight(insights, {
      category: "habits",
      severity: "neutral",
      icon: "CheckCircle2",
      title: "Habits still open today",
      description: `You have completed ${todayHabitEntries.length}/${activeHabits.length} habits today. The day is not over yet.`,
      metric: `${todayHabitEntries.length}/${activeHabits.length}`,
      actionLabel: "Open habits",
      actionRoute: "/habits",
    });
  }

  const habit = bestHabit(activeHabits);
  if (habit && habit.streak > 0) {
    addInsight(insights, {
      category: "celebration",
      severity: "positive",
      icon: "Flame",
      title: "Best habit streak",
      description: `Your best current habit streak is "${habit.name}" at ${habit.streak} days. Keep it going.`,
      metric: `${habit.streak} days`,
    });
  }

  const dailyCalorieSpendPoints = weekDates.map((date) => ({
    x: totalCaloriesForDate(data.foodEntries, date),
    y: sum(data.transactions.filter((transaction) => transaction.date === date && transaction.type === "expense").map((transaction) => transaction.amount)),
  })).filter((point) => point.x > 0 && point.y > 0);
  if (correlation(dailyCalorieSpendPoints) > 0.5) {
    addInsight(insights, {
      category: "correlation",
      severity: "neutral",
      icon: "Network",
      title: "Calories and spending move together",
      description: "Interesting: your highest-calorie days tend to also be your highest-spending days. This might reflect eating out.",
      metric: "Correlation detected",
    });
  }

  const foodSpend = sum(
    data.transactions
      .filter((transaction) => transaction.category === "food" && transaction.type === "expense" && weekDates.includes(transaction.date))
      .map((transaction) => transaction.amount),
  );
  const calories = sum(weekDates.map((date) => totalCaloriesForDate(data.foodEntries, date)));
  if (foodSpend > 0 && calories > 0) {
    addInsight(insights, {
      category: "correlation",
      severity: "neutral",
      icon: "Calculator",
      title: "Food cost per calorie",
      description: `Your food spending averages ${formatCurrency((foodSpend / calories) * 100, data.budgetProfile.currency, data.budgetProfile.currencySymbol)} per 100 kcal consumed.`,
      metric: `${formatCurrency((foodSpend / calories) * 100, data.budgetProfile.currency, data.budgetProfile.currencySymbol)} / 100 kcal`,
    });
  }

  const missedFoodLogs = data.transactions
    .filter((transaction) => transaction.category === "food" && transaction.type === "expense")
    .filter((transaction) => !data.foodEntries.some((entry) => entry.date === transaction.date));
  if (missedFoodLogs.length > 0) {
    const transaction = missedFoodLogs[0];
    addInsight(insights, {
      category: "correlation",
      severity: "neutral",
      icon: "ClipboardList",
      title: "Food spend without meal log",
      description: `You spent ${formatCurrency(transaction.amount, data.budgetProfile.currency, data.budgetProfile.currencySymbol)} on food on ${formatDateKey(transaction.date)} but did not log any meals. Consider logging what you ate.`,
      actionLabel: "Open food log",
      actionRoute: "/fitness/log",
    });
  }

  const exerciseHabit = data.habits.find((item) => item.name.toLowerCase().includes("exercise"));
  if (exerciseHabit && calorieGoal > 0) {
    const exerciseDays = data.habitEntries.filter((entry) => entry.habitId === exerciseHabit.id && entry.completed).map((entry) => entry.date);
    const hitRate = exerciseDays.length
      ? exerciseDays.filter((date) => Math.abs(totalCaloriesForDate(data.foodEntries, date) - calorieGoal) <= calorieGoal * 0.1).length / exerciseDays.length
      : 0;
    if (hitRate > 0) {
      addInsight(insights, {
        category: "correlation",
        severity: hitRate > 0.5 ? "positive" : "neutral",
        icon: "Dumbbell",
        title: "Exercise days improve calorie control",
        description: `Days you exercise, you are ${Math.round(hitRate * 100)}% likely to hit your calorie goal.`,
        metric: `${Math.round(hitRate * 100)}% hit rate`,
      });
    }
  }

  weekDates
    .map((date) => ({ date, calories: totalCaloriesForDate(data.foodEntries, date) }))
    .filter((day) => day.calories > 0 && day.calories < 1000)
    .slice(0, 1)
    .forEach((day) => {
      addInsight(insights, {
        category: "warning",
        severity: "warning",
        icon: "AlertCircle",
        title: "Very low calorie day",
        description: `A very low-calorie day was detected (${Math.round(day.calories)} kcal on ${formatDateKey(day.date)}). If this was intentional, no worries. Otherwise, make sure you are fueling your body.`,
        metric: `${Math.round(day.calories)} kcal`,
      });
    });

  if (budgetSummary.remaining <= 0 && budgetSummary.daysInMonth - budgetSummary.dayOfMonth >= 10) {
    addInsight(insights, {
      category: "warning",
      severity: "danger",
      icon: "OctagonAlert",
      title: "Monthly budget depleted",
      description: `You have used your entire monthly budget with ${budgetSummary.daysInMonth - budgetSummary.dayOfMonth} days remaining. Only log income or essentials from here.`,
      metric: formatCurrency(Math.abs(budgetSummary.remaining), data.budgetProfile.currency, data.budgetProfile.currencySymbol),
    });
  }

  if (targets && weekDates.every((date) => {
    const total = totalCaloriesForDate(data.foodEntries, date);
    return total > 0 && Math.abs(total - targets.calories) <= targets.calories * 0.1;
  })) {
    addInsight(insights, {
      category: "celebration",
      severity: "positive",
      icon: "Award",
      title: "Seven days on target",
      description: "You have hit your calorie goal 7 days in a row. That is an incredible streak.",
      metric: "7 days",
    });
  }

  const thisMonth = currentMonthRange(today);
  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  const lastMonth = currentMonthRange(lastMonthDate);
  const thisMonthSpend = sum(filterTransactionsByDate(data.transactions, thisMonth.start, thisMonth.end).filter((item) => item.type === "expense").map((item) => item.amount));
  const lastMonthSpend = sum(filterTransactionsByDate(data.transactions, lastMonth.start, lastMonth.end).filter((item) => item.type === "expense").map((item) => item.amount));
  if (lastMonthSpend > 0 && thisMonthSpend < lastMonthSpend) {
    addInsight(insights, {
      category: "celebration",
      severity: "positive",
      icon: "WalletCards",
      title: "Spending improved",
      description: `You spent ${formatCurrency(lastMonthSpend - thisMonthSpend, data.budgetProfile.currency, data.budgetProfile.currencySymbol)} less than last month. Great financial progress.`,
      metric: formatCurrency(lastMonthSpend - thisMonthSpend, data.budgetProfile.currency, data.budgetProfile.currencySymbol),
    });
  }

  const severityRank: Record<Insight["severity"], number> = {
    danger: 0,
    warning: 1,
    positive: 2,
    neutral: 3,
  };
  return insights.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}

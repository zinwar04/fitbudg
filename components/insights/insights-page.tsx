"use client";

import Link from "next/link";
import { createElement, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { CheckCircle2, Flame, RefreshCw, Sparkles, Target, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { getLucideIcon } from "@/components/shared/icon";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveBar, ResponsiveLine } from "@/components/shared/chart-frame";
import { calculateBudgetSummary } from "@/lib/calculations/budget";
import { generateInsights } from "@/lib/calculations/insights";
import { calculateNutritionTargets } from "@/lib/calculations/nutrition";
import { FoodEntry, HabitEntry, Insight, Transaction, WeightEntry } from "@/lib/db/schema";
import { useBudgetStore } from "@/lib/store/budget.store";
import { useFoodStore } from "@/lib/store/food.store";
import { useHabitsStore } from "@/lib/store/habits.store";
import { useProfileStore } from "@/lib/store/profile.store";
import { formatCurrency, formatKcal, localDateKey, percent, sum, titleCase } from "@/lib/utils/formatting";

type Filter = "all" | Insight["category"];

export function InsightsPage() {
  const profile = useProfileStore((state) => state.profile);
  const settings = useProfileStore((state) => state.settings);
  const logs = useFoodStore((state) => state.logs);
  const foodEntries = useFoodStore((state) => state.entries);
  const foodLibrary = useFoodStore((state) => state.library);
  const mealTemplates = useFoodStore((state) => state.mealTemplates);
  const weightEntries = useFoodStore((state) => state.weights);
  const budgetProfile = useBudgetStore((state) => state.profile);
  const transactions = useBudgetStore((state) => state.transactions);
  const habits = useHabitsStore((state) => state.habits);
  const habitEntries = useHabitsStore((state) => state.entries);
  const [filter, setFilter] = useState<Filter>("all");
  const [generatedAt, setGeneratedAt] = useState(new Date());
  const safeFoodEntries = useMemo(() => normalizeFoodEntries(foodEntries), [foodEntries]);
  const safeTransactions = useMemo(() => normalizeTransactions(transactions), [transactions]);
  const safeWeights = useMemo(() => normalizeWeightEntries(weightEntries), [weightEntries]);
  const safeHabits = useMemo(() => habits.filter((habit) => Boolean(habit?.id && habit?.name)), [habits]);
  const safeHabitEntries = useMemo(() => normalizeHabitEntries(habitEntries), [habitEntries]);

  const data = useMemo(
    () => ({
      profile,
      settings,
      budgetProfile,
      logs,
      foodEntries: safeFoodEntries,
      foodLibrary,
      mealTemplates,
      weightEntries: safeWeights,
      transactions: safeTransactions,
      habits: safeHabits,
      habitEntries: safeHabitEntries,
    }),
    [budgetProfile, foodLibrary, logs, mealTemplates, profile, safeFoodEntries, safeHabitEntries, safeHabits, safeTransactions, safeWeights, settings],
  );

  const insightResult = useMemo(() => {
    try {
      return { insights: generateInsights(data), error: null as string | null };
    } catch (error) {
      return {
        insights: [] as Insight[],
        error: error instanceof Error ? error.message : "Insights could not read part of your saved data.",
      };
    }
  }, [data]);
  const insights = insightResult.insights;
  const budget = useMemo(() => calculateBudgetSummary(budgetProfile, safeTransactions), [budgetProfile, safeTransactions]);
  const targets = calculateNutritionTargets(profile);
  const days = useMemo(() => lastDays(14, generatedAt), [generatedAt]);
  const nutritionTrend = useMemo(
    () =>
      days.map((date) => ({
        date: date.slice(5),
        calories: Math.round(sum(safeFoodEntries.filter((entry) => entry.date === date).map((entry) => entry.calories))),
      })),
    [days, safeFoodEntries],
  );
  const spendTrend = useMemo(
    () =>
      days.map((date) => ({
        date: date.slice(5),
        spent: Math.round(sum(safeTransactions.filter((transaction) => transaction.date === date && transaction.type === "expense").map((transaction) => transaction.amount))),
      })),
    [days, safeTransactions],
  );

  const filtered = filter === "all" ? insights : insights.filter((insight) => insight.category === filter);
  const priority = insights.find((insight) => insight.severity === "danger") ?? insights.find((insight) => insight.severity === "warning") ?? insights[0];
  const warnings = insights.filter((insight) => insight.severity === "warning" || insight.severity === "danger").length;
  const positives = insights.filter((insight) => insight.severity === "positive").length;
  const todayKey = localDateKey();
  const todayCalories = sum(safeFoodEntries.filter((entry) => entry.date === todayKey).map((entry) => entry.calories));
  const activeHabits = safeHabits.filter((habit) => habit.isActive);
  const completedToday = safeHabitEntries.filter((entry) => entry.date === todayKey && entry.completed).length;

  return (
    <>
      <PageHeader
        title="Insights"
        description="Patterns, risks, and wins from your food, body, habits, and spending data."
        action={
          <Button variant="outline" onClick={() => setGeneratedAt(new Date())}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      {insightResult.error && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-200">
          Some saved records had an unexpected shape, so the page loaded with the stable dashboard view. Refresh after editing or importing data to regenerate detailed insights.
        </div>
      )}

      <section className="mb-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge variant={warnings ? "destructive" : "secondary"}>{warnings ? "Needs attention" : "Looking steady"}</Badge>
              <h2 className="mt-3 text-2xl font-semibold tracking-normal">{priority?.title ?? "No major insight yet"}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {priority?.description ?? "Log a few meals, weights, transactions, and habits to unlock useful guidance."}
              </p>
            </div>
            {priority?.actionRoute && (
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href={priority.actionRoute}>{priority.actionLabel ?? "Open"}</Link>
              </Button>
            )}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InsightMetric icon={Flame} label="Today" value={formatKcal(todayCalories)} detail={targets ? `${Math.round(percent(todayCalories, targets.calories))}% of target` : undefined} />
            <InsightMetric icon={WalletCards} label="Safe spend" value={formatCurrency(budget.safeDailySpend, budgetProfile.currency, budgetProfile.currencySymbol)} detail={`Day ${budget.dayInCycle}/${budget.daysInCycle}`} />
            <InsightMetric icon={CheckCircle2} label="Habits" value={`${completedToday}/${activeHabits.length}`} detail="completed today" />
            <InsightMetric icon={Target} label="Wins" value={`${positives}`} detail={`${insights.length} total insights`} />
          </div>
        </div>

        <div className="rounded-lg border bg-muted/25 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Cycle pulse</p>
              <p className="mt-1 text-xs text-muted-foreground">Generated {generatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
            <Badge variant={budget.pacing === "onTrack" ? "secondary" : budget.pacing === "spendingFast" ? "outline" : "destructive"}>
              {budget.pacing === "onTrack" ? "On Track" : budget.pacing === "spendingFast" ? "Fast" : "Over"}
            </Badge>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <PulseRow label="Budget used" value={`${Math.round(percent(budget.spent, budgetProfile.monthlyBudget))}%`} />
            <PulseRow label="Remaining" value={formatCurrency(budget.remaining, budgetProfile.currency, budgetProfile.currencySymbol)} />
            <PulseRow label="Average daily spend" value={formatCurrency(budget.averageDailySpend, budgetProfile.currency, budgetProfile.currencySymbol)} />
          </div>
        </div>
      </section>

      <section className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Calories, Last 14 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveLine data={nutritionTrend} xKey="date" yKey="calories" goal={targets?.calories} height={300} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Daily Spending, Last 14 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveBar data={spendTrend} xKey="date" yKey="spent" goal={budget.daysInCycle > 0 ? budgetProfile.monthlyBudget / budget.daysInCycle : undefined} height={300} />
          </CardContent>
        </Card>
      </section>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {(["all", "fitness", "budget", "habits", "correlation", "warning", "celebration"] as Filter[]).map((item) => (
          <Button key={item} className="shrink-0" size="sm" variant={filter === item ? "default" : "outline"} onClick={() => setFilter(item)}>
            {item === "all" ? "All" : titleCase(item)}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Sparkles} title="Not enough data yet" description="Log meals, transactions, weights, and habits to turn this into a useful command center." />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {filtered.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </>
  );
}

function InsightMetric({ icon: Icon, label, value, detail }: { icon: typeof Flame; label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border bg-background/70 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 truncate text-lg font-semibold data-number">{value}</p>
      {detail && <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

function PulseRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium data-number">{value}</span>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const icon = getLucideIcon(insight.icon);
  const tone =
    insight.severity === "danger"
      ? "border-red-500/30 bg-red-500/5 text-red-500"
      : insight.severity === "warning"
        ? "border-amber-500/30 bg-amber-500/5 text-amber-500"
        : insight.severity === "positive"
          ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-500"
          : "border-primary/20 bg-primary/5 text-primary";

  return (
    <Card>
      <CardContent className="flex gap-4 p-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${tone}`}>
          {createElement(icon, { className: "h-5 w-5" })}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={insight.severity === "danger" || insight.severity === "warning" ? "destructive" : "secondary"}>{titleCase(insight.category)}</Badge>
            {insight.metric && <Badge variant="outline">{insight.metric}</Badge>}
          </div>
          <h3 className="mt-3 font-semibold">{insight.title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{insight.description}</p>
          {insight.actionRoute && (
            <Button asChild className="mt-3" size="sm" variant="outline">
              <Link href={insight.actionRoute}>{insight.actionLabel ?? "Open"}</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function lastDays(count: number, reference = new Date()) {
  return Array.from({ length: count }, (_, index) => format(subDays(reference, count - index - 1), "yyyy-MM-dd"));
}

function numberValue(value: unknown, fallback = 0) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function dateKeyValue(value: unknown) {
  if (value instanceof Date) return format(value, "yyyy-MM-dd");
  const text = String(value ?? "").trim();
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function normalizeFoodEntries(entries: FoodEntry[]): FoodEntry[] {
  return entries.flatMap((entry) => {
    const date = dateKeyValue(entry.date);
    if (!date || !entry.name) return [];
    return [{
      ...entry,
      date,
      calories: numberValue(entry.calories),
      servingSize: numberValue(entry.servingSize, 1),
      quantity: numberValue(entry.quantity, 1),
      protein: entry.protein === undefined ? undefined : numberValue(entry.protein),
      carbs: entry.carbs === undefined ? undefined : numberValue(entry.carbs),
      fat: entry.fat === undefined ? undefined : numberValue(entry.fat),
      fiber: entry.fiber === undefined ? undefined : numberValue(entry.fiber),
    }];
  });
}

function normalizeTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.flatMap((transaction) => {
    const date = dateKeyValue(transaction.date);
    if (!date || !transaction.title) return [];
    return [{
      ...transaction,
      date,
      amount: numberValue(transaction.amount),
      type: (transaction.type === "income" ? "income" : "expense") as Transaction["type"],
    }];
  });
}

function normalizeWeightEntries(entries: WeightEntry[]): WeightEntry[] {
  return entries.flatMap((entry) => {
    const date = dateKeyValue(entry.date);
    const weight = numberValue(entry.weight);
    if (!date || weight <= 0) return [];
    return [{
      ...entry,
      date,
      weight,
      bodyFatPercent: entry.bodyFatPercent === undefined ? undefined : numberValue(entry.bodyFatPercent),
    }];
  });
}

function normalizeHabitEntries(entries: HabitEntry[]): HabitEntry[] {
  return entries.flatMap((entry) => {
    const date = dateKeyValue(entry.date);
    if (!date || !entry.habitId) return [];
    return [{ ...entry, date, completed: Boolean(entry.completed) }];
  });
}

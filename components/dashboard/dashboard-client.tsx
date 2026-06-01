"use client";

import Link from "next/link";
import { useMemo } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { motion } from "framer-motion";
import { ArrowRight, Check, CircleDollarSign, Flame, Plus, ReceiptText, Scale, Sparkles, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveBar, ResponsiveLine } from "@/components/shared/chart-frame";
import { getLucideIcon } from "@/components/shared/icon";
import { calculateBudgetSummary } from "@/lib/calculations/budget";
import { generateInsights } from "@/lib/calculations/insights";
import { calculateNutritionTargets } from "@/lib/calculations/nutrition";
import { useBudgetStore } from "@/lib/store/budget.store";
import { useFoodStore } from "@/lib/store/food.store";
import { useHabitsStore } from "@/lib/store/habits.store";
import { useProfileStore } from "@/lib/store/profile.store";
import { useUiStore } from "@/lib/store/ui.store";
import { formatCurrency, formatKcal, formatRelativeDate, localDateKey, percent, sum, titleCase } from "@/lib/utils/formatting";
import { cn } from "@/lib/utils";

export function DashboardClient() {
  const profile = useProfileStore((state) => state.profile);
  const settings = useProfileStore((state) => state.settings);
  const logs = useFoodStore((state) => state.logs);
  const entries = useFoodStore((state) => state.entries);
  const library = useFoodStore((state) => state.library);
  const mealTemplates = useFoodStore((state) => state.mealTemplates);
  const weights = useFoodStore((state) => state.weights);
  const budgetProfile = useBudgetStore((state) => state.profile);
  const transactions = useBudgetStore((state) => state.transactions);
  const habits = useHabitsStore((state) => state.habits);
  const habitEntries = useHabitsStore((state) => state.entries);
  const toggleBoolean = useHabitsStore((state) => state.toggleBoolean);
  const adjustQuantitative = useHabitsStore((state) => state.adjustQuantitative);
  const openDialog = useUiStore((state) => state.openDialog);
  const today = localDateKey();
  const targets = useMemo(() => calculateNutritionTargets(profile), [profile]);
  const todayEntries = useMemo(() => entries.filter((entry) => entry.date === today), [entries, today]);
  const consumed = sum(todayEntries.map((entry) => entry.calories));
  const protein = sum(todayEntries.map((entry) => entry.protein ?? 0));
  const carbs = sum(todayEntries.map((entry) => entry.carbs ?? 0));
  const fat = sum(todayEntries.map((entry) => entry.fat ?? 0));
  const budgetSummary = useMemo(() => calculateBudgetSummary(budgetProfile, transactions), [budgetProfile, transactions]);
  const insights = useMemo(() => {
    try {
      return generateInsights({
        profile,
        settings,
        budgetProfile,
        logs,
        foodEntries: entries,
        foodLibrary: library,
        mealTemplates,
        weightEntries: weights,
        transactions,
        habits,
        habitEntries,
      });
    } catch {
      return [];
    }
  }, [budgetProfile, entries, habitEntries, habits, library, logs, mealTemplates, profile, settings, transactions, weights]);
  const insight = insights.find((item) => item.severity === "danger") ?? insights.find((item) => item.severity === "warning") ?? insights[0];
  const weekData = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: settings.firstDayOfWeek });
    return Array.from({ length: 7 }, (_, index) => {
      const date = format(addDays(start, index), "yyyy-MM-dd");
      return {
        day: format(addDays(start, index), "EEE"),
        calories: sum(entries.filter((entry) => entry.date === date).map((entry) => entry.calories)),
      };
    });
  }, [entries, settings.firstDayOfWeek]);
  const weightData = useMemo(
    () =>
      [...weights]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14)
        .map((entry) => ({ date: entry.date.slice(5), weight: entry.weight })),
    [weights],
  );
  const allActiveHabits = habits.filter((habit) => habit.isActive);
  const activeHabits = allActiveHabits.slice(0, 6);
  const completedHabits = allActiveHabits.filter((habit) => habitEntries.some((entry) => entry.habitId === habit.id && entry.date === today && entry.completed)).length;

  return (
    <>
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${profile?.name ?? "there"}`}
        description="One glance at food, money, habits, and momentum."
        action={
          <div className="hidden gap-2 sm:flex">
            <Button variant="outline" onClick={() => openDialog("transaction")}>
              <ReceiptText className="h-4 w-4" /> Add Transaction
            </Button>
            <Button onClick={() => openDialog("food")}>
              <Plus className="h-4 w-4" /> Add Food
            </Button>
          </div>
        }
      />

      <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DailyFocusCard
          icon={Flame}
          label="Calories left"
          value={formatKcal((targets?.calories ?? 0) - consumed)}
          detail={`${Math.round(percent(consumed, targets?.calories ?? 0))}% of daily target`}
          tone={consumed <= (targets?.calories ?? 0) ? "positive" : "danger"}
        />
        <DailyFocusCard
          icon={CircleDollarSign}
          label="Safe spend"
          value={formatCurrency(budgetSummary.safeToSpendToday, budgetProfile.currency, budgetProfile.currencySymbol)}
          detail={`${budgetSummary.daysLeftInCycle} days left in cycle`}
          tone={budgetSummary.pacing === "onTrack" ? "positive" : "warning"}
        />
        <DailyFocusCard
          icon={Check}
          label="Habits today"
          value={`${completedHabits}/${allActiveHabits.length}`}
          detail={allActiveHabits.length ? "completed" : "no active habits"}
          tone={completedHabits === allActiveHabits.length && allActiveHabits.length > 0 ? "positive" : "default"}
        />
        <DailyFocusCard
          icon={Sparkles}
          label="Next insight"
          value={insight?.title ?? "Log more data"}
          detail={insight ? `${insights.length} insights available` : "personalized guidance"}
          tone={insight?.severity === "danger" ? "danger" : insight?.severity === "warning" ? "warning" : "default"}
          numeric={false}
        />
      </section>

      <div className="space-y-7">
        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Widget index={0}>
            <Link href="/nutrition" className="block">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-primary" /> Daily Calorie Ring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center">
                  <CalorieRing value={consumed} goal={targets?.calories ?? 0} />
                  <p className={cn("mt-3 text-center text-sm", consumed <= (targets?.calories ?? 0) ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                    {formatKcal((targets?.calories ?? 0) - consumed)} remaining
                  </p>
                </div>
                <div className="mt-5 space-y-3">
                  <Macro label="Protein" value={protein} goal={targets?.protein ?? 0} />
                  <Macro label="Carbs" value={carbs} goal={targets?.carbs ?? 0} />
                  <Macro label="Fat" value={fat} goal={targets?.fat ?? 0} />
                </div>
              </CardContent>
            </Link>
          </Widget>

          <Widget index={1}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Today&apos;s Quick Log</CardTitle>
              <Button size="sm" onClick={() => openDialog("food")}>
                <Plus className="h-4 w-4" /> Add Food
              </Button>
            </CardHeader>
            <CardContent>
              {todayEntries.length === 0 ? (
                <EmptyState icon={UtensilsCrossed} title="No food logged today" description="Tap to add your first meal and the dashboard will update instantly." action={<Button onClick={() => openDialog("food")}>Add Food</Button>} />
              ) : (
                <div className="space-y-2">
                  {todayEntries.slice(-3).reverse().map((entry) => (
                    <div key={entry.id} className="interactive-row flex items-center justify-between rounded-lg p-2">
                      <div>
                        <p className="text-sm font-medium">{entry.name}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className={cn("h-2 w-2 rounded-full", mealDotClass(entry.mealType))} />
                          {titleCase(entry.mealType)}
                        </p>
                      </div>
                      <p className="data-number text-sm">{formatKcal(entry.calories)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Widget>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Widget index={2}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-primary" /> Budget Pulse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={percent(budgetSummary.spent, budgetProfile.monthlyBudget)} />
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span>{formatCurrency(budgetSummary.spent, budgetProfile.currency, budgetProfile.currencySymbol)} spent</span>
                <span>{formatCurrency(budgetSummary.remaining, budgetProfile.currency, budgetProfile.currencySymbol)} remaining</span>
                <span>{budgetSummary.daysLeftInCycle} days left in cycle</span>
              </div>
              <Badge className="mt-3" variant={budgetSummary.pacing === "onTrack" ? "secondary" : budgetSummary.pacing === "spendingFast" ? "outline" : "destructive"}>
                {budgetSummary.pacing === "onTrack" ? "On Track" : budgetSummary.pacing === "spendingFast" ? "Spending Fast" : "Over Budget"}
              </Badge>
              <p className="mt-4 text-sm text-muted-foreground">Safe to spend today</p>
              <p className="text-2xl font-semibold data-number">{formatCurrency(budgetSummary.safeToSpendToday, budgetProfile.currency, budgetProfile.currencySymbol)}</p>
            </CardContent>
          </Widget>

          <Widget index={3}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Habit Streak Board</CardTitle>
              <Button size="sm" variant="outline" onClick={() => openDialog("habit")}>
                <Plus className="h-4 w-4" /> Habit
              </Button>
            </CardHeader>
            <CardContent>
              {activeHabits.length === 0 ? (
                <EmptyState icon={Check} title="No active habits" description="Add a small daily habit to start building momentum." action={<Button onClick={() => openDialog("habit")}>Add Habit</Button>} />
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {activeHabits.map((habit) => {
                    const Icon = getLucideIcon(habit.icon);
                    const entry = habitEntries.find((item) => item.habitId === habit.id && item.date === today);
                    return (
                      <button
                        key={habit.id}
                        type="button"
                        onClick={() => (habit.type === "boolean" ? toggleBoolean(habit.id, today) : adjustQuantitative(habit, today, 1))}
                        className={cn("interactive-row rounded-lg p-3 text-center", entry?.completed && "border-primary bg-primary/5")}
                      >
                        <Icon className="mx-auto h-5 w-5" style={{ color: habit.color }} />
                        <p className="mt-2 break-words text-xs font-medium leading-snug">{habit.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{habit.type === "quantitative" ? `${entry?.value ?? 0}/${habit.targetValue ?? 1}` : entry?.completed ? "Done" : "Open"}</p>
                        <p className="mt-1 text-xs data-number">{habit.streak} day streak</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Widget>

          <Widget index={4}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Recent Transactions</CardTitle>
              <Button size="sm" onClick={() => openDialog("transaction")}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <EmptyState icon={ReceiptText} title="No transactions yet" description="Add one expense and your budget pace will come alive." action={<Button onClick={() => openDialog("transaction")}>Add Transaction</Button>} />
              ) : (
                <div className="space-y-2">
                  {transactions.slice(0, 4).map((transaction) => (
                    <div key={transaction.id} className="interactive-row flex items-center justify-between rounded-lg p-2">
                      <div>
                        <p className="text-sm font-medium">{transaction.title}</p>
                        <p className="text-xs text-muted-foreground">{titleCase(transaction.category)} · {formatRelativeDate(transaction.date)}</p>
                      </div>
                      <p className={cn("data-number text-sm", transaction.type === "income" ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                        {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount, transaction.currency, budgetProfile.currencySymbol)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Widget>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
        <Widget index={5}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Week at a Glance</CardTitle>
            <Button asChild size="sm" variant="outline">
              <Link href="/nutrition/history">Full History</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveBar data={weekData} xKey="day" yKey="calories" goal={targets?.calories} height={220} />
          </CardContent>
        </Widget>

        <Widget index={6}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Top Insight</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/insights">1 of {Math.max(insights.length, 1)}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {insight ? (
              <div className="soft-tile w-full rounded-lg p-4 text-left">
                <Badge variant={insight.severity === "danger" || insight.severity === "warning" ? "destructive" : "secondary"}>{titleCase(insight.category)}</Badge>
                <h3 className="mt-3 font-semibold">{insight.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{insight.description}</p>
                {insight.actionRoute && (
                  <Link href={insight.actionRoute} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {insight.actionLabel ?? "Open"} <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ) : (
              <EmptyState icon={Sparkles} title="Not enough data yet" description="Log a meal, transaction, or habit and insights will start to appear." />
            )}
          </CardContent>
        </Widget>

        <Widget index={7}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Weight Trend Spark</CardTitle>
            <Button size="sm" variant="outline" onClick={() => openDialog("weight")}>
              Log Today
            </Button>
          </CardHeader>
          <CardContent>
            {weights.length === 0 ? (
              <EmptyState icon={Scale} title="No weights logged" description="Log a first weigh-in to see trend and goal progress." action={<Button onClick={() => openDialog("weight")}>Log Weight</Button>} />
            ) : (
              <>
                <div className="mb-2 flex items-baseline justify-between">
                  <p className="text-2xl font-semibold data-number">{weights[weights.length - 1]?.weight.toFixed(1)} kg</p>
                  <p className="text-sm text-muted-foreground">
                    {weights.length > 1 ? `${(weights[weights.length - 1].weight - weights[0].weight).toFixed(1)} kg from start` : "First entry"}
                  </p>
                </div>
                <ResponsiveLine data={weightData} xKey="date" yKey="weight" goal={profile?.goalWeight} height={180} />
              </>
            )}
          </CardContent>
        </Widget>
        </section>
      </div>
    </>
  );
}

function Widget({ children, index, className }: { children: React.ReactNode; index: number; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <Card className={cn("h-full overflow-hidden bg-card/90", className)}>{children}</Card>
    </motion.div>
  );
}

function DailyFocusCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "default",
  numeric = true,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "positive" | "warning" | "danger";
  numeric?: boolean;
}) {
  const toneClass = {
    default: "bg-primary/10 text-primary",
    positive: "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]",
    warning: "bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] text-[var(--warning)]",
    danger: "bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] text-[var(--danger)]",
  }[tone];

  return (
    <Card className="overflow-hidden bg-card/90">
      <CardContent className="flex min-h-28 items-center gap-3 p-4">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-current/10", toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={cn("mt-1 truncate text-lg font-semibold", numeric && "data-number")}>{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CalorieRing({ value, goal }: { value: number; goal: number }) {
  const progress = Math.min(100, percent(value, goal));
  const circumference = 2 * Math.PI * 46;
  const offset = circumference - (progress / 100) * circumference;
  return (
    <div className="relative h-44 w-44">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r="46" stroke="var(--secondary)" strokeWidth="12" fill="none" />
        <motion.circle
          cx="60"
          cy="60"
          r="46"
          stroke="var(--primary)"
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-semibold data-number">{Math.round(value)}</span>
        <span className="text-xs text-muted-foreground">of {goal || "--"} kcal</span>
      </div>
    </div>
  );
}

function Macro({ label, value, goal }: { label: string; value: number; goal: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span>{label}</span>
        <span className="data-number">
          {Math.round(value)} / {goal || "--"} g
        </span>
      </div>
      <Progress value={percent(value, goal)} />
    </div>
  );
}

function mealDotClass(mealType: string) {
  const map: Record<string, string> = {
    breakfast: "bg-amber-500",
    lunch: "bg-blue-500",
    dinner: "bg-violet-500",
    snack: "bg-emerald-500",
    other: "bg-muted-foreground",
  };
  return map[mealType] ?? "bg-muted-foreground";
}

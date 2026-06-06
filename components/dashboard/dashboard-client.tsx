"use client";

import Link from "next/link";
import { useMemo } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Flame,
  Plus,
  ReceiptText,
  Scale,
  ScanBarcode,
  Sparkles,
  UtensilsCrossed,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
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
import { clamp, formatCurrency, formatKcal, formatRelativeDate, localDateKey, percent, sum, titleCase } from "@/lib/utils/formatting";
import { cn } from "@/lib/utils";

type Tone = "default" | "positive" | "warning" | "danger" | "energy" | "info";

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
  const activeHabits = habits.filter((habit) => habit.isActive);
  const visibleHabits = activeHabits.slice(0, 5);
  const completedHabits = activeHabits.filter((habit) => habitEntries.some((entry) => entry.habitId === habit.id && entry.date === today && entry.completed)).length;
  const latestWeight = useMemo(() => [...weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1), [weights]);

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

  const priorityInsight = insights.find((item) => item.severity === "danger") ?? insights.find((item) => item.severity === "warning") ?? insights[0];
  const calorieGoal = targets?.calories ?? 0;
  const calorieProgress = percent(consumed, calorieGoal);
  const caloriesRemaining = calorieGoal - consumed;
  const proteinProgress = percent(protein, targets?.protein ?? 0);
  const carbsProgress = percent(carbs, targets?.carbs ?? 0);
  const fatProgress = percent(fat, targets?.fat ?? 0);
  const macroBalance = Math.round((clamp(proteinProgress, 0, 100) + clamp(carbsProgress, 0, 100) + clamp(fatProgress, 0, 100)) / 3);
  const nutritionScore = calorieGoal > 0 ? clamp(100 - (Math.abs(consumed - calorieGoal) / calorieGoal) * 92, 0, 100) : todayEntries.length ? 64 : 34;
  const moneyScore = budgetSummary.pacing === "onTrack" ? clamp(96 - Math.max(0, budgetSummary.paceRatio - 1) * 45, 72, 96) : budgetSummary.pacing === "spendingFast" ? 58 : 24;
  const habitScore = activeHabits.length ? percent(completedHabits, activeHabits.length) : 58;
  const dailyScore = Math.round((nutritionScore + moneyScore + habitScore) / 3);
  const balanceLabel = dailyScore >= 82 ? "Steady day" : dailyScore >= 64 ? "Needs one move" : "Needs attention";
  const nextMove = getNextMove({
    consumed,
    calorieGoal,
    budgetPacing: budgetSummary.pacing,
    completedHabits,
    activeHabitCount: activeHabits.length,
    priorityInsight,
  });
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

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

  return (
    <>
      <PageHeader
        title={`${greeting}, ${profile?.name ?? "there"}`}
        description="Your food, money, habits, and momentum in one quiet daily view."
        action={
          <div className="hidden gap-2 sm:flex">
            <Button variant="outline" onClick={() => openDialog("foodScan")}>
              <ScanBarcode className="h-4 w-4" /> Scan Food
            </Button>
            <Button onClick={() => openDialog("food")}>
              <Plus className="h-4 w-4" /> Log Food
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Widget index={0} className="balance-band">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <Badge variant={dailyScore >= 82 ? "secondary" : dailyScore >= 64 ? "outline" : "destructive"}>{balanceLabel}</Badge>
                <h2 className="mt-3 text-2xl font-semibold leading-tight sm:text-3xl">Today should feel easy to understand.</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Vela keeps the next practical move close: log a meal, protect your safe spend, or close one tiny habit loop.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => openDialog("foodScan")}>
                    <ScanBarcode className="h-4 w-4" /> Scan
                  </Button>
                  <Button variant="outline" onClick={() => openDialog("transaction")}>
                    <ReceiptText className="h-4 w-4" /> Money
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href="/assistant">
                      <Bot className="h-4 w-4" /> Ask Vela
                    </Link>
                  </Button>
                </div>
              </div>
              <ScoreRing score={dailyScore} label="Daily balance" />
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <HeroMetric icon={Flame} label="Calories left" value={formatKcal(caloriesRemaining)} detail={`${Math.round(calorieProgress)}% of target`} tone={caloriesRemaining >= 0 ? "positive" : "danger"} />
              <HeroMetric icon={WalletCards} label="Safe spend" value={formatCurrency(budgetSummary.safeToSpendToday, budgetProfile.currency, budgetProfile.currencySymbol)} detail={`${budgetSummary.daysLeftInCycle} days left`} tone={budgetSummary.pacing === "onTrack" ? "positive" : "warning"} />
              <HeroMetric icon={CheckCircle2} label="Habits" value={`${completedHabits}/${activeHabits.length}`} detail={activeHabits.length ? "completed today" : "no active habits"} tone={completedHabits === activeHabits.length && activeHabits.length > 0 ? "positive" : "default"} />
              <HeroMetric icon={Scale} label="Weight" value={latestWeight ? `${latestWeight.weight.toFixed(1)} kg` : "--"} detail={latestWeight ? formatRelativeDate(latestWeight.date) : "log your first check-in"} tone="info" />
            </div>
          </CardContent>
        </Widget>

        <Widget index={1}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Next Best Move</CardTitle>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="soft-tile rounded-lg p-4">
              <Badge variant={nextMove.tone === "danger" ? "destructive" : nextMove.tone === "warning" ? "outline" : "secondary"}>{nextMove.label}</Badge>
              <h3 className="mt-3 text-lg font-semibold leading-tight">{nextMove.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{nextMove.description}</p>
              <Button className="mt-4 w-full justify-between" variant={nextMove.actionVariant} onClick={nextMove.onClick ? () => nextMove.onClick(openDialog) : undefined} asChild={Boolean(nextMove.href)}>
                {nextMove.href ? (
                  <Link href={nextMove.href}>
                    {nextMove.actionLabel} <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <>
                    {nextMove.actionLabel} <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <MiniStat label="Macros" value={`${macroBalance}%`} />
              <MiniStat label="Money" value={pacingLabel(budgetSummary.pacing)} />
              <MiniStat label="Insights" value={`${insights.length}`} />
            </div>
          </CardContent>
        </Widget>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Widget index={2}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Food Rhythm</CardTitle>
            <Button size="sm" onClick={() => openDialog("food")}>
              <Plus className="h-4 w-4" /> Food
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 sm:grid-cols-[12rem_1fr] sm:items-center">
              <CalorieGauge value={consumed} goal={calorieGoal} />
              <div className="space-y-3">
                <Macro label="Protein" value={protein} goal={targets?.protein ?? 0} />
                <Macro label="Carbs" value={carbs} goal={targets?.carbs ?? 0} />
                <Macro label="Fat" value={fat} goal={targets?.fat ?? 0} />
              </div>
            </div>
            <div className="mt-5">
              {todayEntries.length === 0 ? (
                <EmptyState icon={UtensilsCrossed} title="No food logged today" description="Scan a barcode, search your library, or add a manual entry." action={<Button onClick={() => openDialog("foodScan")}>Scan Food</Button>} />
              ) : (
                <div className="space-y-2">
                  {todayEntries.slice(-4).reverse().map((entry) => (
                    <div key={entry.id} className="interactive-row flex items-center justify-between gap-3 rounded-lg p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{entry.name}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className={cn("h-2 w-2 rounded-full", mealDotClass(entry.mealType))} />
                          {titleCase(entry.mealType)}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold data-number">{formatKcal(entry.calories)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Widget>

        <Widget index={3}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Money Pace</CardTitle>
            <Button size="sm" variant="outline" onClick={() => openDialog("transaction")}>
              <ReceiptText className="h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            <div className="soft-tile rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Safe to spend today</p>
                  <p className="mt-1 text-3xl font-semibold leading-tight data-number">{formatCurrency(budgetSummary.safeToSpendToday, budgetProfile.currency, budgetProfile.currencySymbol)}</p>
                </div>
                <Badge variant={budgetSummary.pacing === "onTrack" ? "secondary" : budgetSummary.pacing === "spendingFast" ? "outline" : "destructive"}>{pacingLabel(budgetSummary.pacing)}</Badge>
              </div>
              <Progress value={percent(budgetSummary.spent, budgetProfile.monthlyBudget)} className="mt-4 h-3" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <MiniStat label="Spent" value={formatCurrency(budgetSummary.spent, budgetProfile.currency, budgetProfile.currencySymbol)} />
                <MiniStat label="Remaining" value={formatCurrency(budgetSummary.remaining, budgetProfile.currency, budgetProfile.currencySymbol)} />
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {transactions.length === 0 ? (
                <EmptyState icon={ReceiptText} title="No transactions yet" description="Add one expense and Vela will start pacing the cycle." action={<Button onClick={() => openDialog("transaction")}>Add Transaction</Button>} />
              ) : (
                transactions.slice(0, 4).map((transaction) => (
                  <div key={transaction.id} className="interactive-row flex items-center justify-between gap-3 rounded-lg p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{transaction.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{titleCase(transaction.category)} · {formatRelativeDate(transaction.date)}</p>
                    </div>
                    <p className={cn("shrink-0 text-sm font-semibold data-number", transaction.type === "income" ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                      {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount, transaction.currency, budgetProfile.currencySymbol)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Widget>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Widget index={4}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Habit Loop</CardTitle>
            <Button size="sm" variant="outline" onClick={() => openDialog("habit")}>
              <Plus className="h-4 w-4" /> Habit
            </Button>
          </CardHeader>
          <CardContent>
            {visibleHabits.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="No active habits" description="Add a tiny daily action that supports your food and money goals." action={<Button onClick={() => openDialog("habit")}>Add Habit</Button>} />
            ) : (
              <div className="space-y-2">
                {visibleHabits.map((habit) => {
                  const Icon = getLucideIcon(habit.icon);
                  const entry = habitEntries.find((item) => item.habitId === habit.id && item.date === today);
                  const done = Boolean(entry?.completed);
                  return (
                    <button
                      key={habit.id}
                      type="button"
                      onClick={() => (habit.type === "boolean" ? toggleBoolean(habit.id, today) : adjustQuantitative(habit, today, 1))}
                      className={cn("interactive-row flex w-full items-center justify-between gap-3 rounded-lg p-3 text-left", done && "border-primary bg-primary/5")}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: habit.color }}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{habit.name}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">{habit.type === "quantitative" ? `${entry?.value ?? 0}/${habit.targetValue ?? 1} ${habit.unit ?? ""}` : done ? "Completed" : "Open"}</span>
                        </span>
                      </span>
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{habit.streak}d</span>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Widget>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-2">
          <Widget index={5}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Week View</CardTitle>
              <Button asChild size="sm" variant="ghost">
                <Link href="/nutrition/history">History</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveBar data={weekData} xKey="day" yKey="calories" goal={calorieGoal} height={220} />
            </CardContent>
          </Widget>

          <Widget index={6}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Body Trend</CardTitle>
              <Button size="sm" variant="outline" onClick={() => openDialog("weight")}>
                Log
              </Button>
            </CardHeader>
            <CardContent>
              {weights.length === 0 ? (
                <EmptyState icon={Scale} title="No weights logged" description="Log a first weigh-in to see trend and goal progress." action={<Button onClick={() => openDialog("weight")}>Log Weight</Button>} />
              ) : (
                <>
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <p className="text-2xl font-semibold data-number">{latestWeight?.weight.toFixed(1)} kg</p>
                    <p className="text-right text-xs text-muted-foreground">{profile?.goalWeight ? `Goal ${profile.goalWeight.toFixed(1)} kg` : "Trend"}</p>
                  </div>
                  <ResponsiveLine data={weightData} xKey="date" yKey="weight" goal={profile?.goalWeight} height={180} />
                </>
              )}
            </CardContent>
          </Widget>
        </div>
      </section>

      <section className="mt-4">
        <Widget index={7}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <Badge variant={priorityInsight?.severity === "danger" || priorityInsight?.severity === "warning" ? "destructive" : "secondary"}>Coach note</Badge>
                <h2 className="mt-3 text-xl font-semibold leading-tight">{priorityInsight?.title ?? "Log a little more to unlock guidance"}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {priorityInsight?.description ?? "Food, transactions, habits, and weight entries give Vela enough context to surface useful daily advice."}
                </p>
              </div>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href={priorityInsight?.actionRoute ?? "/insights"}>
                  {priorityInsight?.actionLabel ?? "Open Insights"} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Widget>
      </section>
    </>
  );
}

function Widget({ children, index, className }: { children: React.ReactNode; index: number; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }}>
      <Card className={cn("h-full overflow-hidden bg-card/95", className)}>{children}</Card>
    </motion.div>
  );
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  return (
    <div className="mx-auto flex w-full max-w-[12rem] flex-col items-center md:mx-0">
      <div
        className="grid aspect-square w-40 place-items-center rounded-full p-3 shadow-[var(--shadow-control)]"
        style={{
          background: `conic-gradient(var(--primary) ${score * 3.6}deg, color-mix(in srgb, var(--primary) 12%, transparent) 0deg)`,
        }}
      >
        <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-border/70 bg-card text-center">
          <span className="text-4xl font-semibold leading-none data-number">{score}</span>
          <span className="mt-1 text-xs text-muted-foreground">{label}</span>
        </div>
      </div>
    </div>
  );
}

function HeroMetric({ icon: Icon, label, value, detail, tone = "default" }: { icon: LucideIcon; label: string; value: string; detail: string; tone?: Tone }) {
  return (
    <div className="rounded-lg border border-border/70 bg-card/70 p-3 shadow-[var(--shadow-control)]">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", toneClass(tone))}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        {label}
      </div>
      <p className="mt-3 truncate text-lg font-semibold data-number">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-card/70 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold data-number">{value}</p>
    </div>
  );
}

function CalorieGauge({ value, goal }: { value: number; goal: number }) {
  const progress = clamp(percent(value, goal), 0, 100);
  return (
    <div className="mx-auto grid aspect-square w-40 place-items-center rounded-full p-3" style={{ background: `conic-gradient(var(--energy) ${progress * 3.6}deg, var(--secondary) 0deg)` }}>
      <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-card text-center shadow-inner">
        <span className="text-3xl font-semibold data-number">{Math.round(value)}</span>
        <span className="text-xs text-muted-foreground">of {goal || "--"} kcal</span>
      </div>
    </div>
  );
}

function Macro({ label, value, goal }: { label: string; value: number; goal: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-xs">
        <span>{label}</span>
        <span className="data-number">
          {Math.round(value)} / {goal || "--"} g
        </span>
      </div>
      <Progress value={percent(value, goal)} />
    </div>
  );
}

function getNextMove({
  consumed,
  calorieGoal,
  budgetPacing,
  completedHabits,
  activeHabitCount,
  priorityInsight,
}: {
  consumed: number;
  calorieGoal: number;
  budgetPacing: "onTrack" | "spendingFast" | "overBudget";
  completedHabits: number;
  activeHabitCount: number;
  priorityInsight?: { title: string; description: string; actionRoute?: string; actionLabel?: string };
}) {
  if (consumed === 0) {
    return {
      label: "Start here",
      title: "Log your first meal",
      description: "A single food entry makes the calorie, macro, and insight panels useful for the rest of the day.",
      actionLabel: "Scan food",
      tone: "positive" as Tone,
      actionVariant: "default" as const,
      onClick: (openDialog: ReturnType<typeof useUiStore.getState>["openDialog"]) => openDialog("foodScan"),
    };
  }

  if (calorieGoal > 0 && consumed > calorieGoal) {
    return {
      label: "Food",
      title: "Plan the next meal lighter",
      description: "You are above today’s calorie target. Prioritize protein and vegetables, then let tomorrow reset cleanly.",
      actionLabel: "Open food log",
      tone: "warning" as Tone,
      actionVariant: "outline" as const,
      href: "/nutrition",
    };
  }

  if (budgetPacing !== "onTrack") {
    return {
      label: "Money",
      title: "Protect the rest of the cycle",
      description: "Your spending pace is running hot. Review the next purchase before adding anything new today.",
      actionLabel: "Review money",
      tone: budgetPacing === "overBudget" ? ("danger" as Tone) : ("warning" as Tone),
      actionVariant: "outline" as const,
      href: "/budget",
    };
  }

  if (activeHabitCount > 0 && completedHabits < activeHabitCount) {
    return {
      label: "Habits",
      title: "Close one small loop",
      description: "Pick the easiest unfinished habit and mark it now. Momentum is cheaper when it stays small.",
      actionLabel: "Open habits",
      tone: "default" as Tone,
      actionVariant: "outline" as const,
      href: "/habits",
    };
  }

  return {
    label: "Coach",
    title: priorityInsight?.title ?? "Keep the day simple",
    description: priorityInsight?.description ?? "Your core signals are calm. Keep logging lightly and avoid over-managing the day.",
    actionLabel: priorityInsight?.actionLabel ?? "Open insights",
    tone: "positive" as Tone,
    actionVariant: "outline" as const,
    href: priorityInsight?.actionRoute ?? "/insights",
  };
}

function pacingLabel(pacing: "onTrack" | "spendingFast" | "overBudget") {
  if (pacing === "onTrack") return "On track";
  if (pacing === "spendingFast") return "Fast";
  return "Over";
}

function toneClass(tone: Tone) {
  const classes: Record<Tone, string> = {
    default: "bg-primary/10 text-primary",
    positive: "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]",
    warning: "bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] text-[var(--warning)]",
    danger: "bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] text-[var(--danger)]",
    energy: "bg-[color-mix(in_srgb,var(--energy)_16%,transparent)] text-[var(--energy)]",
    info: "bg-[color-mix(in_srgb,var(--info)_14%,transparent)] text-[var(--info)]",
  };
  return classes[tone];
}

function mealDotClass(mealType: string) {
  const map: Record<string, string> = {
    breakfast: "bg-amber-500",
    lunch: "bg-[var(--info)]",
    dinner: "bg-[var(--plum)]",
    snack: "bg-[var(--success)]",
    other: "bg-muted-foreground",
  };
  return map[mealType] ?? "bg-muted-foreground";
}

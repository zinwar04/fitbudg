"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { getLucideIcon } from "@/components/shared/icon";
import { PageHeader } from "@/components/shared/page-header";
import { generateInsights } from "@/lib/calculations/insights";
import { Insight } from "@/lib/db/schema";
import { useBudgetStore } from "@/lib/store/budget.store";
import { useFoodStore } from "@/lib/store/food.store";
import { useHabitsStore } from "@/lib/store/habits.store";
import { useProfileStore } from "@/lib/store/profile.store";
import { titleCase } from "@/lib/utils/formatting";

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
  const insights = useMemo(
    () =>
      generateInsights({
        profile,
        settings,
        budgetProfile,
        logs,
        foodEntries,
        foodLibrary,
        mealTemplates,
        weightEntries,
        transactions,
        habits,
        habitEntries,
      }),
    [budgetProfile, foodEntries, foodLibrary, habitEntries, habits, logs, mealTemplates, profile, settings, transactions, weightEntries],
  );
  const filtered = filter === "all" ? insights : insights.filter((insight) => insight.category === filter);
  const warnings = insights.filter((insight) => insight.severity === "warning" || insight.severity === "danger").length;
  const celebrations = insights.filter((insight) => insight.category === "celebration").length;

  return (
    <>
      <PageHeader
        title="Insights"
        description="Generated from your food, budget, habit, and weight data."
        action={
          <Button variant="outline" onClick={() => setGeneratedAt(new Date())}>
            <RefreshCw className="h-4 w-4" /> Refresh Insights
          </Button>
        }
      />
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Badge>{insights.length} active insights</Badge>
            <Badge variant={warnings ? "destructive" : "secondary"}>{warnings} warnings</Badge>
            <Badge variant="secondary">{celebrations} celebrations</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Generated {generatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
        </CardContent>
      </Card>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "fitness", "budget", "habits", "correlation", "warning", "celebration"] as Filter[]).map((item) => (
          <Button key={item} size="sm" variant={filter === item ? "default" : "outline"} onClick={() => setFilter(item)}>
            {item === "all" ? "All" : titleCase(item)}
          </Button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={Sparkles} title="Not enough data yet to generate insights" description="Log a few meals, transactions, and habits to unlock useful patterns." />
      ) : (
        <div className="space-y-3">
          {filtered.map((insight) => {
            const Icon = getLucideIcon(insight.icon);
            return (
              <Card key={insight.id}>
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${insight.severity === "danger" ? "bg-red-500/10 text-red-500" : insight.severity === "warning" ? "bg-amber-500/10 text-amber-500" : insight.severity === "positive" ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={insight.severity === "danger" || insight.severity === "warning" ? "destructive" : "secondary"}>{titleCase(insight.category)}</Badge>
                      {insight.metric && <Badge variant="outline">{insight.metric}</Badge>}
                    </div>
                    <h3 className="mt-3 font-semibold">{insight.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{insight.description}</p>
                    {insight.actionRoute && (
                      <Button asChild className="mt-3" size="sm" variant="outline">
                        <Link href={insight.actionRoute}>{insight.actionLabel ?? "Open"}</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

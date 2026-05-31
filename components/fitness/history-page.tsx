"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { addDays, eachDayOfInterval, endOfMonth, format, parseISO, startOfMonth, subDays, subMonths } from "date-fns";
import { BarChart3, CalendarDays, ListChecks, Target, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveBar, ResponsiveLine } from "@/components/shared/chart-frame";
import { calculateNutritionTargets } from "@/lib/calculations/nutrition";
import { useFoodStore } from "@/lib/store/food.store";
import { useProfileStore } from "@/lib/store/profile.store";
import { average, formatDateKey, formatKcal, localDateKey, sum } from "@/lib/utils/formatting";
import { cn } from "@/lib/utils";

type HistoryView = "calendar" | "list" | "chart";
type Preset = "7" | "30" | "thisMonth" | "lastMonth" | "all";

export function HistoryPage() {
  const entries = useFoodStore((state) => state.entries);
  const profile = useProfileStore((state) => state.profile);
  const targets = useMemo(() => calculateNutritionTargets(profile), [profile]);
  const [view, setView] = useState<HistoryView>("calendar");
  const [preset, setPreset] = useState<Preset>("30");
  const range = useMemo(() => rangeFromPreset(preset), [preset]);
  const dayRows = useMemo(() => {
    const days = eachDayOfInterval({ start: parseISO(`${range.start}T00:00:00`), end: parseISO(`${range.end}T00:00:00`) });
    return days.map((day) => {
      const date = format(day, "yyyy-MM-dd");
      const dayEntries = entries.filter((entry) => entry.date === date);
      return {
        date,
        calories: sum(dayEntries.map((entry) => entry.calories)),
        protein: sum(dayEntries.map((entry) => entry.protein ?? 0)),
        carbs: sum(dayEntries.map((entry) => entry.carbs ?? 0)),
        fat: sum(dayEntries.map((entry) => entry.fat ?? 0)),
        count: dayEntries.length,
      };
    });
  }, [entries, range.end, range.start]);
  const loggedDays = dayRows.filter((day) => day.count > 0);
  const averageCalories = average(loggedDays.map((day) => day.calories));
  const goal = targets?.calories ?? 0;
  const daysOnTarget = loggedDays.filter((day) => goal > 0 && Math.abs(day.calories - goal) <= goal * 0.1).length;
  const daysOver = loggedDays.filter((day) => goal > 0 && day.calories > goal * 1.1).length;
  const bestStreak = calculateBestStreak(dayRows.map((day) => day.count > 0));
  const rolling = dayRows.map((day, index) => ({
    date: day.date.slice(5),
    average: Math.round(average(dayRows.slice(Math.max(0, index - 6), index + 1).filter((item) => item.count > 0).map((item) => item.calories))),
  }));

  return (
    <>
      <PageHeader
        title="Calorie History"
        description={`${loggedDays.length} logged days · ${formatKcal(averageCalories)} average · ${bestStreak} day best streak`}
        action={
          <Button asChild>
            <Link href="/nutrition">Log Food</Link>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard icon={UtensilsCrossed} label="Average calories" value={formatKcal(averageCalories)} />
        <MetricCard icon={Target} label="Days on target" value={`${daysOnTarget}`} detail="Within 10%" tone="positive" />
        <MetricCard icon={BarChart3} label="Days over" value={`${daysOver}`} tone={daysOver > 3 ? "warning" : "default"} />
        <MetricCard icon={ListChecks} label="Best streak" value={`${bestStreak} days`} />
        <MetricCard icon={CalendarDays} label="Total entries" value={`${sum(loggedDays.map((day) => day.count))}`} />
      </div>

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["7", "30", "thisMonth", "lastMonth", "all"] as Preset[]).map((item) => (
              <Button key={item} variant={preset === item ? "default" : "outline"} size="sm" onClick={() => setPreset(item)}>
                {presetLabel(item)}
              </Button>
            ))}
          </div>
          <Tabs value={view} onValueChange={(value) => setView(value as HistoryView)}>
            <TabsList>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="chart">Chart</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {view === "calendar" && (
        <Card>
          <CardHeader>
            <CardTitle>{formatDateKey(range.end, "MMMM yyyy")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {calendarDays(range.end).map((date) => {
                const row = dayRows.find((day) => day.date === date);
                const tone = goal > 0 && row?.calories ? Math.abs(row.calories - goal) / goal : 0;
                return (
                  <Link
                    key={date}
                    href={`/nutrition?date=${date}`}
                    className={cn("min-h-20 rounded-lg border p-2 text-left hover:border-primary", row?.count ? "bg-card" : "bg-muted/30")}
                  >
                    <p className="text-xs text-muted-foreground">{Number(date.slice(-2))}</p>
                    {row?.count ? (
                      <>
                        <span className={cn("mt-2 block h-2 w-2 rounded-full", tone <= 0.1 ? "bg-emerald-500" : tone <= 0.2 ? "bg-amber-500" : "bg-red-500")} />
                        <p className="mt-2 text-xs data-number">{Math.round(row.calories)} kcal</p>
                      </>
                    ) : (
                      <p className="mt-5 text-xs text-muted-foreground">No log</p>
                    )}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {view === "list" && (
        <Card>
          <CardContent className="p-4">
            {loggedDays.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No logged days in this range" description="Pick a wider range or add food entries to see history." action={<Button asChild><Link href="/nutrition">Log Food</Link></Button>} />
            ) : (
              <div className="space-y-2">
                {[...loggedDays].reverse().map((day) => (
                  <Link key={day.date} href={`/nutrition?date=${day.date}`} className="flex flex-col gap-2 rounded-lg border p-3 hover:border-primary sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{formatDateKey(day.date)}</p>
                      <p className="text-sm text-muted-foreground">{day.count} entries</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{formatKcal(day.calories)}</Badge>
                      <Badge variant="secondary">P {Math.round(day.protein)}g</Badge>
                      <Badge variant="secondary">C {Math.round(day.carbs)}g</Badge>
                      <Badge variant="secondary">F {Math.round(day.fat)}g</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {view === "chart" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Daily calories</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveBar data={dayRows.map((day) => ({ date: day.date.slice(5), calories: day.calories }))} xKey="date" yKey="calories" goal={goal} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>7-day rolling average</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveLine data={rolling} xKey="date" yKey="average" goal={goal} />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

function rangeFromPreset(preset: Preset) {
  const now = new Date();
  if (preset === "7") return { start: format(subDays(now, 6), "yyyy-MM-dd"), end: localDateKey(now) };
  if (preset === "30") return { start: format(subDays(now, 29), "yyyy-MM-dd"), end: localDateKey(now) };
  if (preset === "thisMonth") return { start: format(startOfMonth(now), "yyyy-MM-dd"), end: format(endOfMonth(now), "yyyy-MM-dd") };
  if (preset === "lastMonth") {
    const lastMonth = subMonths(now, 1);
    return { start: format(startOfMonth(lastMonth), "yyyy-MM-dd"), end: format(endOfMonth(lastMonth), "yyyy-MM-dd") };
  }
  return { start: format(subDays(now, 365), "yyyy-MM-dd"), end: localDateKey(now) };
}

function presetLabel(preset: Preset) {
  const labels: Record<Preset, string> = {
    "7": "Last 7 days",
    "30": "Last 30 days",
    thisMonth: "This month",
    lastMonth: "Last month",
    all: "All time",
  };
  return labels[preset];
}

function calendarDays(referenceDate: string) {
  const monthStart = startOfMonth(parseISO(`${referenceDate}T00:00:00`));
  const start = addDays(monthStart, -monthStart.getDay());
  return Array.from({ length: 42 }, (_, index) => format(addDays(start, index), "yyyy-MM-dd"));
}

function calculateBestStreak(values: boolean[]) {
  let best = 0;
  let current = 0;
  values.forEach((value) => {
    if (value) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  });
  return best;
}

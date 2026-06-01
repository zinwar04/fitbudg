"use client";

import { useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { Edit, Plus, Scale, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveLine } from "@/components/shared/chart-frame";
import { WeightDialog } from "@/components/shared/entity-dialogs";
import { WeightEntry } from "@/lib/db/schema";
import { kgToLb } from "@/lib/calculations/nutrition";
import { useFoodStore } from "@/lib/store/food.store";
import { useProfileStore } from "@/lib/store/profile.store";
import { formatDateKey, formatWeight } from "@/lib/utils/formatting";

export function WeightPage() {
  const profile = useProfileStore((state) => state.profile);
  const weights = useFoodStore((state) => state.weights);
  const deleteWeight = useFoodStore((state) => state.deleteWeight);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WeightEntry | null>(null);
  const sorted = useMemo(() => weights.filter(isChartableWeight).sort((a, b) => a.date.localeCompare(b.date)), [weights]);
  const current = sorted[sorted.length - 1];
  const first = sorted[0];
  const change = current && first ? current.weight - first.weight : 0;
  const weightUnit = profile?.unitSystem === "imperial" ? "lb" : "kg";
  const displayWeight = (value: number | undefined | null) => {
    if (!Number.isFinite(value)) return undefined;
    return profile?.unitSystem === "imperial" ? kgToLb(value as number) : (value as number);
  };
  const projectedDate = useMemo(() => {
    if (!profile || sorted.length < 2 || !current) return "Need more data";
    const firstEntry = sorted[0];
    const currentDate = parseDateKey(current.date);
    const firstDate = parseDateKey(firstEntry.date);
    if (!currentDate || !firstDate) return "Need more data";
    const days = Math.max(1, differenceInCalendarDays(currentDate, firstDate));
    const dailyTrend = (current.weight - firstEntry.weight) / days;
    if (!Number.isFinite(dailyTrend) || Math.abs(dailyTrend) < 0.001) return "Stable trend";
    const remaining = profile.goalWeight - current.weight;
    if (Math.sign(remaining) !== Math.sign(dailyTrend)) return "Trend away from goal";
    const daysToGoal = Math.abs(Math.round(remaining / dailyTrend));
    if (!Number.isFinite(daysToGoal) || daysToGoal > 3650) return "Long-term trend";
    return format(addDays(currentDate, daysToGoal), "MMM d, yyyy");
  }, [current, profile, sorted]);

  const chartData = sorted.map((entry) => {
    const weight = displayWeight(entry.weight);
    return { date: entry.date.slice(5), weight: Number(weight?.toFixed(1) ?? 0) };
  });
  const goalLine = Number.isFinite(profile?.goalWeight) ? displayWeight(profile?.goalWeight) ?? undefined : undefined;

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (entry: WeightEntry) => {
    setEditing(entry);
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Weight Tracker"
        description={`${current ? `Current ${formatWeight(displayWeight(current.weight), weightUnit)}` : "No weigh-ins yet"} · Goal ${formatWeight(displayWeight(profile?.goalWeight), weightUnit)} · ${projectedDate}`}
        action={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Log Weight
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard icon={Scale} label="Starting weight" value={formatWeight(displayWeight(first?.weight), weightUnit)} />
        <MetricCard icon={Scale} label="Current weight" value={formatWeight(displayWeight(current?.weight), weightUnit)} />
        <MetricCard icon={Scale} label="Goal weight" value={formatWeight(displayWeight(profile?.goalWeight), weightUnit)} />
        <MetricCard
          icon={change <= 0 ? TrendingDown : TrendingUp}
          label="Change so far"
          value={formatWeight(displayWeight(change), weightUnit)}
          tone={change <= 0 ? "positive" : "warning"}
        />
        <MetricCard icon={TrendingDown} label="Projected goal date" value={projectedDate} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Weight trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveLine data={chartData} xKey="date" yKey="weight" goal={goalLine} height={320} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Entry history</CardTitle>
          </CardHeader>
          <CardContent>
            {sorted.length === 0 ? (
              <EmptyState icon={Scale} title="No weigh-ins yet" description="Add your first weight entry to start trend tracking." action={<Button onClick={openAdd}>Log Weight</Button>} />
            ) : (
              <div className="space-y-2">
                {[...sorted].reverse().map((entry) => {
                  const bodyFatPercent = Number.isFinite(entry.bodyFatPercent) ? entry.bodyFatPercent : undefined;

                  return (
                    <div key={entry.id} className="interactive-row rounded-lg p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium data-number">{formatWeight(displayWeight(entry.weight), weightUnit)}</p>
                          <p className="text-sm text-muted-foreground">{formatDateKey(entry.date)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {bodyFatPercent !== undefined && <Badge variant="secondary">{bodyFatPercent.toFixed(1)}% fat</Badge>}
                          <Button variant="ghost" size="icon" onClick={() => openEdit(entry)} aria-label={`Edit weight from ${formatDateKey(entry.date)}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteWeight(entry.id)} aria-label={`Delete weight from ${formatDateKey(entry.date)}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {entry.notes && <p className="mt-2 text-sm text-muted-foreground">{entry.notes}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <WeightDialog open={dialogOpen} onOpenChange={setDialogOpen} entry={editing} />
    </>
  );
}

function parseDateKey(date: string) {
  const parsed = parseISO(`${date}T00:00:00`);
  return isValid(parsed) ? parsed : null;
}

function isChartableWeight(entry: WeightEntry) {
  return Number.isFinite(entry.weight) && Boolean(parseDateKey(entry.date));
}

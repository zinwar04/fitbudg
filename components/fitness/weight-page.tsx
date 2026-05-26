"use client";

import { useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
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
import { useFoodStore } from "@/lib/store/food.store";
import { useProfileStore } from "@/lib/store/profile.store";
import { formatDateKey, formatWeight } from "@/lib/utils/formatting";

export function WeightPage() {
  const profile = useProfileStore((state) => state.profile);
  const weights = useFoodStore((state) => state.weights);
  const deleteWeight = useFoodStore((state) => state.deleteWeight);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WeightEntry | null>(null);
  const sorted = useMemo(() => [...weights].sort((a, b) => a.date.localeCompare(b.date)), [weights]);
  const current = sorted[sorted.length - 1];
  const first = sorted[0];
  const change = current && first ? current.weight - first.weight : 0;
  const projectedDate = useMemo(() => {
    if (!profile || sorted.length < 2 || !current) return "Need more data";
    const firstEntry = sorted[0];
    const days = Math.max(1, differenceInCalendarDays(parseISO(`${current.date}T00:00:00`), parseISO(`${firstEntry.date}T00:00:00`)));
    const dailyTrend = (current.weight - firstEntry.weight) / days;
    if (dailyTrend === 0) return "Stable trend";
    const remaining = profile.goalWeight - current.weight;
    if (Math.sign(remaining) !== Math.sign(dailyTrend)) return "Trend away from goal";
    const daysToGoal = Math.abs(Math.round(remaining / dailyTrend));
    return format(addDays(parseISO(`${current.date}T00:00:00`), daysToGoal), "MMM d, yyyy");
  }, [current, profile, sorted]);

  const chartData = sorted.map((entry) => ({ date: entry.date.slice(5), weight: entry.weight }));

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
        description="Log weigh-ins, body fat, notes, and trend toward your goal."
        action={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Log Weight
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-5">
        <MetricCard icon={Scale} label="Starting weight" value={formatWeight(first?.weight)} />
        <MetricCard icon={Scale} label="Current weight" value={formatWeight(current?.weight)} />
        <MetricCard icon={Scale} label="Goal weight" value={formatWeight(profile?.goalWeight)} />
        <MetricCard icon={change <= 0 ? TrendingDown : TrendingUp} label="Change so far" value={`${change.toFixed(1)} kg`} tone={change <= 0 ? "positive" : "warning"} />
        <MetricCard icon={TrendingDown} label="Projected goal date" value={projectedDate} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Weight trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveLine data={chartData} xKey="date" yKey="weight" goal={profile?.goalWeight} height={320} />
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
                {[...sorted].reverse().map((entry) => (
                  <div key={entry.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium data-number">{formatWeight(entry.weight)}</p>
                        <p className="text-sm text-muted-foreground">{formatDateKey(entry.date)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {entry.bodyFatPercent !== undefined && <Badge variant="secondary">{entry.bodyFatPercent.toFixed(1)}% fat</Badge>}
                        <Button variant="ghost" size="icon" onClick={() => openEdit(entry)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteWeight(entry.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {entry.notes && <p className="mt-2 text-sm text-muted-foreground">{entry.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <WeightDialog open={dialogOpen} onOpenChange={setDialogOpen} entry={editing} />
    </>
  );
}


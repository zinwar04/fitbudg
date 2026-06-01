"use client";

import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Archive, CheckCircle2, Edit, Plus, RotateCcw, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { HabitDialog } from "@/components/shared/entity-dialogs";
import { EmptyState } from "@/components/shared/empty-state";
import { getLucideIcon } from "@/components/shared/icon";
import { PageHeader } from "@/components/shared/page-header";
import { Habit } from "@/lib/db/schema";
import { useHabitsStore } from "@/lib/store/habits.store";
import { localDateKey, titleCase } from "@/lib/utils/formatting";

const suggestions = [
  { name: "Drink 8 glasses of water", icon: "Droplets", type: "quantitative" as const, targetValue: 8, unit: "glasses", category: "nutrition" as const, color: "#3478f6", isActive: true },
  { name: "Eat 5 servings of vegetables", icon: "Apple", type: "quantitative" as const, targetValue: 5, unit: "servings", category: "nutrition" as const, color: "#0f9f8a", isActive: true },
  { name: "Log all meals", icon: "ClipboardList", type: "boolean" as const, category: "nutrition" as const, color: "#0f9f8a", isActive: true },
  { name: "Exercise today", icon: "Dumbbell", type: "boolean" as const, category: "fitness" as const, color: "#d98d18", isActive: true },
  { name: "Log all expenses", icon: "ReceiptText", type: "boolean" as const, category: "finance" as const, color: "#7c5cff", isActive: true },
  { name: "Sleep 7+ hours", icon: "Moon", type: "boolean" as const, category: "lifestyle" as const, color: "#6366f1", isActive: true },
  { name: "No impulse purchases", icon: "ShieldCheck", type: "boolean" as const, category: "finance" as const, color: "#dd4b6a", isActive: true },
];

export function HabitsPage() {
  const habits = useHabitsStore((state) => state.habits);
  const entries = useHabitsStore((state) => state.entries);
  const addHabit = useHabitsStore((state) => state.addHabit);
  const updateHabit = useHabitsStore((state) => state.updateHabit);
  const deleteHabit = useHabitsStore((state) => state.deleteHabit);
  const toggleBoolean = useHabitsStore((state) => state.toggleBoolean);
  const adjustQuantitative = useHabitsStore((state) => state.adjustQuantitative);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const today = localDateKey();
  const activeHabits = habits.filter((habit) => habit.isActive);
  const inactiveHabits = habits.filter((habit) => !habit.isActive);
  const completedToday = activeHabits.filter((habit) => entries.some((entry) => entry.habitId === habit.id && entry.date === today && entry.completed)).length;
  const bestStreak = activeHabits.reduce((best, habit) => Math.max(best, habit.streak), 0);
  const monthCompletionRate = useMemo(() => {
    const last30 = new Set(Array.from({ length: 30 }, (_, index) => format(subDays(new Date(), index), "yyyy-MM-dd")));
    const possible = activeHabits.length * 30;
    const completed = entries.filter((entry) => last30.has(entry.date) && entry.completed && activeHabits.some((habit) => habit.id === entry.habitId)).length;
    return possible > 0 ? Math.round((completed / possible) * 100) : 0;
  }, [activeHabits, entries]);

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        title={format(new Date(), "EEEE, MMMM d")}
        description={`${activeHabits.length} active habits · ${completedToday} completed today · Best streak: ${bestStreak} days · ${monthCompletionRate}% monthly completion`}
        action={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add Habit
          </Button>
        }
      />

      {habits.length === 0 && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <p className="mb-3 font-semibold">Start with a suggested habit</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {suggestions.map((suggestion) => {
                const Icon = getLucideIcon(suggestion.icon);
                return (
                  <button key={suggestion.name} type="button" onClick={() => addHabit(suggestion)} className="interactive-row rounded-lg p-3 text-left">
                    <Icon className="h-5 w-5" style={{ color: suggestion.color }} />
                    <p className="mt-2 text-sm font-medium">{suggestion.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{titleCase(suggestion.category)}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {activeHabits.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No active habits" description="Add a habit to build a daily loop that supports your food and budget goals." action={<Button onClick={openAdd}>Add Habit</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {activeHabits.map((habit) => {
            const Icon = getLucideIcon(habit.icon);
            const todayEntry = entries.find((entry) => entry.habitId === habit.id && entry.date === today);
            const progress = habit.type === "quantitative" ? ((todayEntry?.value ?? 0) / (habit.targetValue ?? 1)) * 100 : todayEntry?.completed ? 100 : 0;
            return (
              <motion.div key={habit.id} animate={todayEntry?.completed ? { scale: [1, 1.03, 1] } : { scale: 1 }} transition={{ duration: 0.25 }}>
                <Card className="bg-card/90">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg text-white" style={{ background: habit.color }}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{habit.name}</p>
                          <Badge variant="secondary">{habit.type === "boolean" ? "Boolean" : `${todayEntry?.value ?? 0} / ${habit.targetValue ?? 1} ${habit.unit ?? ""}`}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(habit); setDialogOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => updateHabit(habit.id, { isActive: false })} aria-label={`Archive ${habit.name}`}>
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4">
                      {habit.type === "boolean" ? (
                        <Button className="w-full" variant={todayEntry?.completed ? "secondary" : "default"} onClick={() => toggleBoolean(habit.id, today)}>
                          <CheckCircle2 className="h-4 w-4" /> {todayEntry?.completed ? "Completed" : "Mark Complete"}
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" onClick={() => adjustQuantitative(habit, today, -1)}>-</Button>
                          <Progress value={progress} className="h-3 flex-1" />
                          <Button variant="outline" size="icon" onClick={() => adjustQuantitative(habit, today, 1)}>+</Button>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Current streak</span>
                      <span className="font-semibold data-number">{habit.streak} days</span>
                    </div>
                    <div className="mt-4 grid grid-cols-7 gap-1.5">
                      {Array.from({ length: 14 }, (_, index) => {
                        const date = format(subDays(new Date(), 13 - index), "yyyy-MM-dd");
                        const entry = entries.find((item) => item.habitId === habit.id && item.date === date);
                        return <span key={date} className={`h-5 rounded-md ${entry?.completed ? "bg-primary" : "bg-muted ring-1 ring-border"}`} title={`${date}${entry?.completed ? " completed" : " open"}`} />;
                      })}
                    </div>
                    <div className="mt-1 grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted-foreground">
                      {Array.from({ length: 7 }, (_, index) => (
                        <span key={index}>{format(subDays(new Date(), 6 - index), "EEE").slice(0, 1)}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {inactiveHabits.length > 0 && (
        <details className="mt-6 rounded-lg border bg-card/90 p-4 shadow-[var(--shadow-card)]">
          <summary className="cursor-pointer text-sm font-semibold">Archived habits ({inactiveHabits.length})</summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {inactiveHabits.map((habit) => {
              const Icon = getLucideIcon(habit.icon);
              return (
                <div key={habit.id} className="interactive-row flex items-center justify-between gap-3 rounded-lg p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: habit.color }}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{habit.name}</p>
                      <p className="text-xs text-muted-foreground">{habit.streak} day streak before archive</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => updateHabit(habit.id, { isActive: true })} aria-label={`Reactivate ${habit.name}`}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteHabit(habit.id)} aria-label={`Delete ${habit.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}

      <HabitDialog open={dialogOpen} onOpenChange={setDialogOpen} habit={editing} />
    </>
  );
}

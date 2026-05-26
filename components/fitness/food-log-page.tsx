"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { addDays, format, isFuture, parseISO, subDays } from "date-fns";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Copy, Edit, MoreHorizontal, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FoodEntryDialog } from "@/components/shared/entity-dialogs";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { calculateNutritionTargets } from "@/lib/calculations/nutrition";
import { FoodEntry, MealType } from "@/lib/db/schema";
import { useFoodStore } from "@/lib/store/food.store";
import { useProfileStore } from "@/lib/store/profile.store";
import { localDateKey, formatKcal, percent, sum, titleCase } from "@/lib/utils/formatting";
import { mealTypes } from "@/lib/utils/constants";
import { cn } from "@/lib/utils";

export function FoodLogPage() {
  const searchParams = useSearchParams();
  const [date, setDate] = useState(searchParams.get("date") ?? localDateKey());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMealType, setDialogMealType] = useState<MealType>("lunch");
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const [collapsed, setCollapsed] = useState<MealType[]>([]);
  const profile = useProfileStore((state) => state.profile);
  const entries = useFoodStore((state) => state.entries);
  const deleteEntry = useFoodStore((state) => state.deleteEntry);
  const duplicateEntry = useFoodStore((state) => state.duplicateEntry);
  const moveEntry = useFoodStore((state) => state.moveEntry);
  const selectedEntries = useMemo(() => entries.filter((entry) => entry.date === date), [date, entries]);
  const targets = useMemo(() => calculateNutritionTargets(profile), [profile]);
  const consumed = sum(selectedEntries.map((entry) => entry.calories));
  const protein = sum(selectedEntries.map((entry) => entry.protein ?? 0));
  const carbs = sum(selectedEntries.map((entry) => entry.carbs ?? 0));
  const fat = sum(selectedEntries.map((entry) => entry.fat ?? 0));

  const openAdd = (mealType: MealType) => {
    setEditing(null);
    setDialogMealType(mealType);
    setDialogOpen(true);
  };

  const openEdit = (entry: FoodEntry) => {
    setEditing(entry);
    setDialogMealType(entry.mealType);
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Food Diary"
        description="Fast daily logging with meal groups, macros, date navigation, and undo-friendly actions."
        action={
          <Button onClick={() => openAdd("lunch")}>
            <Plus className="h-4 w-4" /> Quick Add
          </Button>
        }
      />
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setDate(format(subDays(parseISO(`${date}T00:00:00`), 1), "yyyy-MM-dd"))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <input className="bg-transparent text-sm outline-none" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
              <Button variant="outline" size="icon" onClick={() => setDate(format(addDays(parseISO(`${date}T00:00:00`), 1), "yyyy-MM-dd"))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={() => setDate(localDateKey())}>
                Today
              </Button>
            </div>
            {isFuture(parseISO(`${date}T00:00:00`)) && (
              <Badge variant="outline">Logging future meals. Calories will not count toward today.</Badge>
            )}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <SummaryTile label="Consumed" value={formatKcal(consumed)} />
            <SummaryTile label="Remaining" value={formatKcal((targets?.calories ?? 0) - consumed)} tone={consumed <= (targets?.calories ?? 0) ? "positive" : "danger"} />
            <SummaryTile label="Goal" value={formatKcal(targets?.calories)} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Macro label="Protein" value={protein} goal={targets?.protein ?? 0} />
            <Macro label="Carbs" value={carbs} goal={targets?.carbs ?? 0} />
            <Macro label="Fat" value={fat} goal={targets?.fat ?? 0} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {mealTypes.filter((mealType) => mealType !== "other").map((mealType) => {
          const mealEntries = selectedEntries.filter((entry) => entry.mealType === mealType);
          const total = sum(mealEntries.map((entry) => entry.calories));
          const isCollapsed = collapsed.includes(mealType);
          return (
            <Card key={mealType}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <button
                  type="button"
                  className="flex items-center gap-2 text-left"
                  onClick={() => setCollapsed((current) => (current.includes(mealType) ? current.filter((item) => item !== mealType) : [...current, mealType]))}
                >
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isCollapsed && "-rotate-90")} />
                  <CardTitle>{titleCase(mealType)}</CardTitle>
                  <Badge variant="secondary">{mealEntries.length} items</Badge>
                  <Badge>{formatKcal(total)}</Badge>
                </button>
                <Button size="sm" onClick={() => openAdd(mealType)}>
                  <Plus className="h-4 w-4" /> Add to {titleCase(mealType)}
                </Button>
              </CardHeader>
              {!isCollapsed && (
                <CardContent>
                  {mealEntries.length === 0 ? (
                    <EmptyState icon={UtensilsCrossed} title={`No ${mealType} logged`} description={`Add foods to ${mealType} and this section will calculate its subtotal.`} action={<Button onClick={() => openAdd(mealType)}>Add Food</Button>} />
                  ) : (
                    <div className="space-y-2">
                      {mealEntries.map((entry) => (
                        <div key={entry.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-medium">{entry.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {entry.quantity} x {entry.servingSize} {entry.servingUnit}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {entry.protein !== undefined && <Badge variant="secondary">P {entry.protein}g</Badge>}
                              {entry.carbs !== undefined && <Badge variant="secondary">C {entry.carbs}g</Badge>}
                              {entry.fat !== undefined && <Badge variant="secondary">F {entry.fat}g</Badge>}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-3 sm:justify-end">
                            <p className="text-lg font-semibold data-number">{formatKcal(entry.calories)}</p>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(entry)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteEntry(entry.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => duplicateEntry(entry.id)}>
                                  <Copy className="mr-2 h-4 w-4" /> Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => duplicateEntry(entry.id, format(addDays(parseISO(`${date}T00:00:00`), 1), "yyyy-MM-dd"))}>
                                  Copy to tomorrow
                                </DropdownMenuItem>
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>Move to meal</DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    {mealTypes.map((type) => (
                                      <DropdownMenuItem key={type} onClick={() => moveEntry(entry.id, type)}>
                                        {titleCase(type)}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuItem onClick={() => deleteEntry(entry.id)}>Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <FoodEntryDialog open={dialogOpen} onOpenChange={setDialogOpen} date={date} mealType={dialogMealType} entry={editing} />
    </>
  );
}

function SummaryTile({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "positive" | "danger" }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold data-number", tone === "positive" && "text-emerald-500", tone === "danger" && "text-red-500")}>{value}</p>
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

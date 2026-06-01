"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { Download, Edit, FileUp, Grid2X2, List, Plus, Search, Star, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FoodEntryDialog, FoodLibraryDialog } from "@/components/shared/entity-dialogs";
import { ExternalFoodSearch } from "@/components/food/external-food-search";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { FoodCategory, FoodLibraryItem, MealType } from "@/lib/db/schema";
import { useFoodStore } from "@/lib/store/food.store";
import { foodCategories, mealTypes } from "@/lib/utils/constants";
import { formatKcal, localDateKey, titleCase } from "@/lib/utils/formatting";
import { downloadTextFile, foodsToCsv, parseFoodRows, readSpreadsheetRows, removeDuplicateFoodInputs, validateFoodImportFile } from "@/lib/utils/import-export";
import { cn } from "@/lib/utils";

type SortOption = "name" | "calHigh" | "calLow" | "proteinHigh" | "proteinLow" | "mostUsed" | "recent" | "favorites";

export function FoodLibraryPage() {
  const library = useFoodStore((state) => state.library);
  const addEntry = useFoodStore((state) => state.addEntry);
  const importFoods = useFoodStore((state) => state.importFoods);
  const cleanupDuplicateFoods = useFoodStore((state) => state.cleanupDuplicateFoods);
  const deleteFood = useFoodStore((state) => state.deleteFood);
  const toggleFavorite = useFoodStore((state) => state.toggleFavorite);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("favorites");
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FoodLibraryItem | null>(null);
  const [quickFood, setQuickFood] = useState<FoodLibraryItem | null>(null);
  const [quickMealType, setQuickMealType] = useState<MealType>("lunch");
  const [quickQuantity, setQuickQuantity] = useState(1);
  const [manualOpen, setManualOpen] = useState(false);
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...library]
      .filter((food) => (!normalized ? true : `${food.name} ${food.brand ?? ""}`.toLowerCase().includes(normalized)))
      .filter((food) => (categories.length === 0 ? true : categories.includes(food.category)))
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "calHigh") return b.caloriesPerServing - a.caloriesPerServing;
        if (sort === "calLow") return a.caloriesPerServing - b.caloriesPerServing;
        if (sort === "proteinHigh") return (b.protein ?? 0) - (a.protein ?? 0);
        if (sort === "proteinLow") return (a.protein ?? 0) - (b.protein ?? 0);
        if (sort === "mostUsed") return b.useCount - a.useCount;
        if (sort === "recent") return b.createdAt.localeCompare(a.createdAt);
        if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
        return b.useCount - a.useCount;
      });
  }, [categories, library, query, sort]);

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (food: FoodLibraryItem) => {
    setEditing(food);
    setDialogOpen(true);
  };

  const quickAdd = async () => {
    if (!quickFood) return;
    await addEntry({
      date: localDateKey(),
      foodLibraryId: quickFood.id,
      name: quickFood.name,
      calories: Math.round(quickFood.caloriesPerServing * quickQuantity),
      servingSize: quickFood.servingSize,
      servingUnit: quickFood.servingUnit,
      quantity: quickQuantity,
      protein: quickFood.protein ? Math.round(quickFood.protein * quickQuantity) : undefined,
      carbs: quickFood.carbs ? Math.round(quickFood.carbs * quickQuantity) : undefined,
      fat: quickFood.fat ? Math.round(quickFood.fat * quickQuantity) : undefined,
      fiber: quickFood.fiber ? Math.round(quickFood.fiber * quickQuantity) : undefined,
      mealType: quickMealType,
    });
    setQuickFood(null);
    setQuickQuantity(1);
  };

  const exportFoods = () => {
    downloadTextFile("fitbudget-food-library.csv", foodsToCsv(library));
  };

  const importFoodFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      validateFoodImportFile(file);
      const rows = await readSpreadsheetRows(file);
      const foods = parseFoodRows(rows);
      if (foods.length === 0) {
        toast.error("No valid foods found. Include name, calories, serving size, and unit columns.");
        return;
      }
      const { accepted, skipped } = removeDuplicateFoodInputs(library, foods);
      if (skipped.length > 0) toast.warning(`${skipped.length} duplicate foods skipped.`);
      if (accepted.length === 0) {
        toast.error("Every row matched an existing or repeated food.");
        return;
      }
      await importFoods(accepted);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Food import failed.");
    }
  };

  const removeDuplicates = async () => {
    setCleaningDuplicates(true);
    try {
      await cleanupDuplicateFoods();
    } finally {
      setCleaningDuplicates(false);
    }
  };

  return (
    <>
      <PageHeader
        title="My Foods"
        description={`${library.length} saved foods · ${filtered.length} visible · duplicates are checked before imports`}
        action={
          <div className="flex flex-wrap gap-2">
            <input ref={fileInputRef} className="hidden" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={importFoodFile} />
            <Button variant="outline" onClick={exportFoods}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <FileUp className="h-4 w-4" /> Import
            </Button>
            <Button variant="outline" disabled={cleaningDuplicates} onClick={() => void removeDuplicates()}>
              <Trash2 className="h-4 w-4" /> {cleaningDuplicates ? "Scanning..." : "Remove Duplicates"}
            </Button>
            <Button variant="outline" onClick={() => setManualOpen(true)}>
              Log Manual Food
            </Button>
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Food
            </Button>
          </div>
        }
      />

      <ExternalFoodSearch library={library} />

      <Card className="mb-4">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or brand" />
            </div>
            <select className="h-11 w-full rounded-lg border px-3 text-sm lg:w-auto" value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
              <option value="favorites">Favorites First</option>
              <option value="name">Name A-Z</option>
              <option value="calHigh">Calories High</option>
              <option value="calLow">Calories Low</option>
              <option value="proteinHigh">Protein High</option>
              <option value="proteinLow">Protein Low</option>
              <option value="mostUsed">Most Used</option>
              <option value="recent">Recently Added</option>
            </select>
            <div className="flex rounded-lg border bg-card/80 p-1 shadow-[var(--shadow-control)]">
              <Button variant={view === "grid" ? "default" : "ghost"} size="icon" onClick={() => setView("grid")}>
                <Grid2X2 className="h-4 w-4" />
              </Button>
              <Button variant={view === "list" ? "default" : "ghost"} size="icon" onClick={() => setView("list")}>
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={categories.length === 0 ? "default" : "outline"} onClick={() => setCategories([])}>
              All
            </Button>
            {foodCategories.map((category) => (
              <Button
                key={category}
                size="sm"
                variant={categories.includes(category) ? "default" : "outline"}
                onClick={() => setCategories((current) => (current.includes(category) ? current.filter((item) => item !== category) : [...current, category]))}
              >
                {titleCase(category)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="Your food library is empty" description="Add the foods you eat regularly to log meals in seconds." action={<Button onClick={openAdd}>Add Food</Button>} />
      ) : (
        <div className={cn(view === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "space-y-3")}>
          {filtered.map((food) => (
            <Card key={food.id} className="bg-card/90">
              <CardContent className={cn("p-4", view === "list" && "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between")}>
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{food.name}</h3>
                      <p className="text-sm text-muted-foreground">{food.brand ?? titleCase(food.category)}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => toggleFavorite(food.id)}>
                      <Star className={cn("h-4 w-4", food.isFavorite && "fill-primary text-primary")} />
                    </Button>
                  </div>
                  <p className="mt-3 text-2xl font-semibold data-number">{formatKcal(food.caloriesPerServing)}</p>
                  <p className="text-sm text-muted-foreground">
                    per {food.servingSize} {food.servingUnit}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary">P {food.protein ?? 0}g</Badge>
                    <Badge variant="secondary">C {food.carbs ?? 0}g</Badge>
                    <Badge variant="secondary">F {food.fat ?? 0}g</Badge>
                    <Badge variant="outline">{titleCase(food.category)}</Badge>
                    {food.source && food.source !== "manual" && (
                      <Badge variant="outline">{food.source === "usda" ? "USDA" : "Open Food Facts"}</Badge>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setQuickFood(food)}>Quick Add Today</Button>
                  <Button size="icon" variant="outline" onClick={() => openEdit(food)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => deleteFood(food.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FoodLibraryDialog open={dialogOpen} onOpenChange={setDialogOpen} item={editing} />
      <FoodEntryDialog open={manualOpen} onOpenChange={setManualOpen} />
      <Dialog open={Boolean(quickFood)} onOpenChange={(open) => (!open ? setQuickFood(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick add {quickFood?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Meal</label>
              <select className="h-11 w-full rounded-lg border px-3 text-sm" value={quickMealType} onChange={(event) => setQuickMealType(event.target.value as MealType)}>
                {mealTypes.map((mealType) => (
                  <option key={mealType} value={mealType}>
                    {titleCase(mealType)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Quantity</label>
              <Input type="number" step="0.25" value={quickQuantity} onChange={(event) => setQuickQuantity(Number(event.target.value))} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Calories: {quickFood ? formatKcal(quickFood.caloriesPerServing * quickQuantity) : "--"}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickFood(null)}>Cancel</Button>
            <Button onClick={quickAdd}>Add to Today</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

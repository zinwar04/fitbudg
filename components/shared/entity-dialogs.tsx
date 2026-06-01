"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Minus, PackageSearch, Plus, ScanBarcode, Search, Star, UtensilsCrossed } from "lucide-react";
import { Resolver, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { searchExternalFoods } from "@/lib/db/external-food.service";
import { FoodEntry, FoodLibraryItem, Habit, MealTemplate, MealType, Transaction, WeightEntry } from "@/lib/db/schema";
import { NormalizedExternalFood, dataQualityLabel, externalSourceLabel } from "@/lib/food/external";
import { useBudgetStore } from "@/lib/store/budget.store";
import { useFoodStore } from "@/lib/store/food.store";
import { useHabitsStore } from "@/lib/store/habits.store";
import { useProfileStore } from "@/lib/store/profile.store";
import { foodCategories, mealTypes, servingUnits, transactionCategories } from "@/lib/utils/constants";
import { formatKcal, formatNumber, localDateKey, titleCase } from "@/lib/utils/formatting";
import {
  FoodEntryFormValues,
  FoodLibraryFormValues,
  HabitFormValues,
  TransactionFormValues,
  WeightFormValues,
  foodEntrySchema,
  foodLibrarySchema,
  habitSchema,
  transactionSchema,
  weightSchema,
} from "@/lib/utils/validation";
import { cn } from "@/lib/utils";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} <span className="text-muted-foreground">*</span>
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function OptionalField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function MealTargetControl({
  locked,
  target,
  value,
  onChange,
  className,
}: {
  locked: boolean;
  target: MealType;
  value: MealType;
  onChange: (value: MealType) => void;
  className?: string;
}) {
  if (locked) {
    return (
      <div className={cn("flex h-11 min-w-32 items-center justify-center rounded-lg border bg-muted/30 px-3 text-sm font-medium shadow-[var(--shadow-control)]", className)} aria-label={`Meal: ${titleCase(target)}`}>
        {titleCase(target)}
      </div>
    );
  }

  return (
    <select className={cn("h-11 min-w-32 rounded-lg border px-3 text-sm", className)} value={value} onChange={(event) => onChange(event.target.value as MealType)}>
      {mealTypes.map((type) => (
        <option key={type} value={type}>
          {titleCase(type)}
        </option>
      ))}
    </select>
  );
}

export function FoodEntryDialog({
  open,
  onOpenChange,
  date = localDateKey(),
  mealType = "lunch",
  lockMealType = false,
  entry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date?: string;
  mealType?: MealType;
  lockMealType?: boolean;
  entry?: FoodEntry | null;
}) {
  const library = useFoodStore((state) => state.library);
  const mealTemplates = useFoodStore((state) => state.mealTemplates);
  const addEntry = useFoodStore((state) => state.addEntry);
  const updateEntry = useFoodStore((state) => state.updateEntry);
  const addFood = useFoodStore((state) => state.addFood);
  const addTemplateToLog = useFoodStore((state) => state.addTemplateToLog);
  const importExternalFood = useFoodStore((state) => state.importExternalFood);
  const [query, setQuery] = useState("");
  const [mealQuery, setMealQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodLibraryItem | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MealTemplate | null>(null);
  const [selectedExternalFood, setSelectedExternalFood] = useState<NormalizedExternalFood | null>(null);
  const [libraryQuantity, setLibraryQuantity] = useState(1);
  const [externalQuantity, setExternalQuantity] = useState(1);
  const [libraryMealType, setLibraryMealType] = useState<MealType>(mealType);
  const [templateMealType, setTemplateMealType] = useState<MealType>(mealType);
  const [externalMealType, setExternalMealType] = useState<MealType>(mealType);
  const [externalResults, setExternalResults] = useState<NormalizedExternalFood[]>([]);
  const [externalWarnings, setExternalWarnings] = useState<string[]>([]);
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalQuery, setExternalQuery] = useState("");
  const [barcodeOpen, setBarcodeOpen] = useState(false);

  const form = useForm<FoodEntryFormValues>({
    resolver: zodResolver(foodEntrySchema) as unknown as Resolver<FoodEntryFormValues>,
    mode: "onBlur",
    defaultValues: {
      name: entry?.name ?? "",
      calories: entry?.calories ?? 300,
      servingSize: entry?.servingSize ?? 1,
      servingUnit: entry?.servingUnit ?? "serving",
      quantity: entry?.quantity ?? 1,
      protein: entry?.protein,
      carbs: entry?.carbs,
      fat: entry?.fat,
      fiber: entry?.fiber,
      mealType: entry?.mealType ?? mealType,
      notes: entry?.notes ?? "",
      saveToLibrary: false,
    },
  });

  const filteredLibrary = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const items = normalized
      ? library.filter((food) => `${food.name} ${food.brand ?? ""}`.toLowerCase().includes(normalized))
      : library;
    return [...items].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? "");
    });
  }, [library, query]);

  const filteredTemplates = useMemo(() => {
    const normalized = mealQuery.trim().toLowerCase();
    const items = normalized
      ? mealTemplates.filter((template) => `${template.name} ${template.description ?? ""}`.toLowerCase().includes(normalized))
      : mealTemplates;
    return [...items].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return b.useCount - a.useCount;
    });
  }, [mealQuery, mealTemplates]);

  const libraryCalories = selectedFood ? Math.round(selectedFood.caloriesPerServing * libraryQuantity) : 0;
  const libraryProtein = selectedFood?.protein ? Math.round(selectedFood.protein * libraryQuantity) : undefined;
  const libraryCarbs = selectedFood?.carbs ? Math.round(selectedFood.carbs * libraryQuantity) : undefined;
  const libraryFat = selectedFood?.fat ? Math.round(selectedFood.fat * libraryQuantity) : undefined;
  const libraryFiber = selectedFood?.fiber ? Math.round(selectedFood.fiber * libraryQuantity) : undefined;
  const externalCalories = selectedExternalFood?.caloriesPerServing ? Math.round(selectedExternalFood.caloriesPerServing * externalQuantity) : 0;
  const externalProtein = selectedExternalFood?.protein !== null && selectedExternalFood?.protein !== undefined ? Math.round(selectedExternalFood.protein * externalQuantity) : undefined;
  const externalCarbs = selectedExternalFood?.carbs !== null && selectedExternalFood?.carbs !== undefined ? Math.round(selectedExternalFood.carbs * externalQuantity) : undefined;
  const externalFat = selectedExternalFood?.fat !== null && selectedExternalFood?.fat !== undefined ? Math.round(selectedExternalFood.fat * externalQuantity) : undefined;
  const externalFiber = selectedExternalFood?.fiber !== null && selectedExternalFood?.fiber !== undefined ? Math.round(selectedExternalFood.fiber * externalQuantity) : undefined;
  const mealLocked = lockMealType && !entry;
  const resolvedLibraryMealType = mealLocked ? mealType : libraryMealType;
  const resolvedTemplateMealType = mealLocked ? mealType : templateMealType;
  const resolvedExternalMealType = mealLocked ? mealType : externalMealType;

  useEffect(() => {
    if (!open) return;
    const activeMealType = entry?.mealType ?? mealType;
    setLibraryMealType(activeMealType);
    setTemplateMealType(activeMealType);
    setExternalMealType(activeMealType);
    setLibraryQuantity(1);
    setExternalQuantity(1);
    setQuery("");
    setMealQuery("");
    setSelectedFood(null);
    setSelectedTemplate(null);
    setSelectedExternalFood(null);
    setExternalResults([]);
    setExternalWarnings([]);
    setExternalQuery("");
    setExternalLoading(false);
    form.reset({
      name: entry?.name ?? "",
      calories: entry?.calories ?? 300,
      servingSize: entry?.servingSize ?? 1,
      servingUnit: entry?.servingUnit ?? "serving",
      quantity: entry?.quantity ?? 1,
      protein: entry?.protein,
      carbs: entry?.carbs,
      fat: entry?.fat,
      fiber: entry?.fiber,
      mealType: activeMealType,
      notes: entry?.notes ?? "",
      saveToLibrary: false,
    });
  }, [entry, form, mealType, open]);

  useEffect(() => {
    if (!open || entry) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setExternalResults([]);
      setExternalWarnings([]);
      setExternalQuery("");
      setExternalLoading(false);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setExternalLoading(true);
      setExternalWarnings([]);
      try {
        const response = await searchExternalFoods("all", trimmed);
        if (cancelled) return;
        setExternalResults(response.foods);
        setExternalWarnings(response.warnings);
        setExternalQuery(trimmed);
      } catch (error) {
        if (cancelled) return;
        setExternalResults([]);
        setExternalWarnings([error instanceof Error ? error.message : "External food search failed."]);
        setExternalQuery(trimmed);
      } finally {
        if (!cancelled) setExternalLoading(false);
      }
    }, 700);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [entry, open, query]);

  const addSelectedFood = async () => {
    if (!selectedFood) return;
    await addEntry({
      date,
      foodLibraryId: selectedFood.id,
      name: selectedFood.name,
      calories: libraryCalories,
      servingSize: selectedFood.servingSize,
      servingUnit: selectedFood.servingUnit,
      quantity: libraryQuantity,
      protein: libraryProtein,
      carbs: libraryCarbs,
      fat: libraryFat,
      fiber: libraryFiber,
      mealType: resolvedLibraryMealType,
    });
    onOpenChange(false);
  };

  const addSelectedTemplate = async () => {
    if (!selectedTemplate) return;
    await addTemplateToLog(selectedTemplate.id, date, resolvedTemplateMealType);
    onOpenChange(false);
  };

  const addSelectedExternalFood = async (saveToLibrary: boolean) => {
    if (!selectedExternalFood || !selectedExternalFood.caloriesPerServing || selectedExternalFood.caloriesPerServing <= 0) return;

    let libraryId: string | undefined;
    if (saveToLibrary) {
      const result = await importExternalFood(selectedExternalFood);
      if (!result) return;
      libraryId = result.item.id;
      toast.success(result.created ? "Added to your food library." : "Already in your library.");
    }

    await addEntry({
      date,
      foodLibraryId: libraryId,
      name: selectedExternalFood.name,
      calories: externalCalories,
      servingSize: selectedExternalFood.servingSize,
      servingUnit: selectedExternalFood.servingUnit,
      quantity: externalQuantity,
      protein: externalProtein,
      carbs: externalCarbs,
      fat: externalFat,
      fiber: externalFiber,
      mealType: resolvedExternalMealType,
      notes: selectedExternalFood.notes,
    });
    onOpenChange(false);
  };

  const onBarcodeFoodFound = (food: NormalizedExternalFood) => {
    setQuery(food.name);
    setExternalResults([food]);
    setExternalWarnings([]);
    setExternalQuery(food.name);
    setSelectedExternalFood(food);
    setSelectedFood(null);
    setBarcodeOpen(false);
  };

  const submitManual: SubmitHandler<FoodEntryFormValues> = async (values) => {
    const resolvedManualMealType = mealLocked ? mealType : values.mealType;
    let libraryId: string | undefined;
    if (values.saveToLibrary) {
      const item = await addFood({
        name: values.name,
        caloriesPerServing: values.calories,
        servingSize: values.servingSize,
        servingUnit: values.servingUnit,
        protein: values.protein,
        carbs: values.carbs,
        fat: values.fat,
        fiber: values.fiber,
        category: "other",
        isFavorite: false,
        notes: values.notes,
      });
      libraryId = item?.id;
    }

    if (entry) {
      await updateEntry(entry.id, {
        name: values.name,
        calories: values.calories,
        servingSize: values.servingSize,
        servingUnit: values.servingUnit,
        quantity: values.quantity,
        protein: values.protein,
        carbs: values.carbs,
        fat: values.fat,
        fiber: values.fiber,
        mealType: resolvedManualMealType,
        notes: values.notes,
        date,
      });
    } else {
      await addEntry({
        date,
        foodLibraryId: libraryId,
        name: values.name,
        calories: values.calories,
        servingSize: values.servingSize,
        servingUnit: values.servingUnit,
        quantity: values.quantity,
        protein: values.protein,
        carbs: values.carbs,
        fat: values.fat,
        fiber: values.fiber,
        mealType: resolvedManualMealType,
        notes: values.notes,
      });
    }
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit food entry" : "Add food"}</DialogTitle>
          <DialogDescription>Log saved foods, saved meals, external database foods, or a manual entry.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue={entry ? "manual" : "library"}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="library" disabled={Boolean(entry)}>
              Foods
            </TabsTrigger>
            <TabsTrigger value="meals" disabled={Boolean(entry)}>
              Meals
            </TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>
          <TabsContent value="library" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9 pr-12" placeholder="Search foods or external databases" />
              <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0" onClick={() => setBarcodeOpen(true)} aria-label="Scan barcode">
                <ScanBarcode className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
              {filteredLibrary.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => setSelectedFood(food)}
                  className={cn(
                    "interactive-row rounded-lg p-3 text-left",
                    selectedFood?.id === food.id && "border-primary bg-primary/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{food.name}</p>
                      <p className="text-xs text-muted-foreground">{food.brand ?? titleCase(food.category)}</p>
                    </div>
                    {food.isFavorite && <Star className="h-4 w-4 fill-primary text-primary" />}
                  </div>
                  <p className="mt-2 text-sm data-number">{formatKcal(food.caloriesPerServing)}</p>
                </button>
              ))}
              {filteredLibrary.length === 0 && (
                <div className="soft-tile rounded-lg p-3 text-sm text-muted-foreground sm:col-span-2">
                  No saved foods match. External results will appear below when available.
                </div>
              )}
            </div>
            {selectedFood && (
              <div className="soft-tile rounded-lg p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">{selectedFood.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedFood.servingSize} {selectedFood.servingUnit} per serving
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="icon" onClick={() => setLibraryQuantity(Math.max(0.25, libraryQuantity - 0.25))}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input className="w-24 text-center data-number" type="number" step="0.25" value={libraryQuantity} onChange={(event) => setLibraryQuantity(Number(event.target.value))} />
                    <Button type="button" variant="outline" size="icon" onClick={() => setLibraryQuantity(libraryQuantity + 0.25)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                    <MealTargetControl locked={mealLocked} target={mealType} value={libraryMealType} onChange={setLibraryMealType} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{formatKcal(libraryCalories)}</Badge>
                  {libraryProtein !== undefined && <Badge variant="secondary">P {libraryProtein}g</Badge>}
                  {libraryCarbs !== undefined && <Badge variant="secondary">C {libraryCarbs}g</Badge>}
                  {libraryFat !== undefined && <Badge variant="secondary">F {libraryFat}g</Badge>}
                  {libraryFiber !== undefined && <Badge variant="secondary">Fiber {libraryFiber}g</Badge>}
                </div>
                <Button className="mt-3 w-full" onClick={addSelectedFood}>
                  Add to Log
                </Button>
              </div>
            )}

            {(externalLoading || externalResults.length > 0 || externalWarnings.length > 0 || externalQuery) && (
              <div className="soft-tile rounded-lg p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">External databases</p>
                    <p className="text-xs text-muted-foreground">USDA and Open Food Facts results can be logged once or saved to your library.</p>
                  </div>
                  {externalLoading && <Badge variant="secondary">Searching...</Badge>}
                </div>
                {externalWarnings.map((warning) => (
                  <div key={warning} className="mt-3 flex items-start gap-2 rounded-lg border bg-background/70 p-2 text-xs text-muted-foreground">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <p>{warning}</p>
                  </div>
                ))}
                {!externalLoading && externalQuery && externalResults.length === 0 && externalWarnings.length === 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">No external foods found for {externalQuery}.</p>
                )}
                {externalResults.length > 0 && (
                  <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">
                    {externalResults.map((food) => (
                      <button
                        key={`${food.source}:${food.external_id}`}
                        type="button"
                        onClick={() => {
                          setSelectedExternalFood(food);
                          setSelectedFood(null);
                        }}
                        className={cn(
                          "interactive-row rounded-lg p-3 text-left",
                          selectedExternalFood?.source === food.source && selectedExternalFood.external_id === food.external_id && "border-primary bg-primary/5",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="break-words font-medium leading-snug">{food.name}</p>
                            <p className="break-words text-xs leading-snug text-muted-foreground">{food.brand ?? titleCase(food.category)}</p>
                          </div>
                          <Badge variant={food.source === "usda" ? "default" : "secondary"}>{externalSourceLabel(food.source)}</Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline">{formatKcal(food.caloriesPerServing)}</Badge>
                          <Badge variant="secondary">{dataQualityLabel(food.data_quality)}</Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedExternalFood && (
              <div className="rounded-lg border bg-primary/5 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">{selectedExternalFood.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {externalSourceLabel(selectedExternalFood.source)} · per {selectedExternalFood.servingSize} {selectedExternalFood.servingUnit}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="icon" onClick={() => setExternalQuantity(Math.max(0.25, externalQuantity - 0.25))}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input className="w-24 text-center data-number" type="number" step="0.25" value={externalQuantity} onChange={(event) => setExternalQuantity(Number(event.target.value))} />
                    <Button type="button" variant="outline" size="icon" onClick={() => setExternalQuantity(externalQuantity + 0.25)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                    <MealTargetControl locked={mealLocked} target={mealType} value={externalMealType} onChange={setExternalMealType} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{formatKcal(externalCalories)}</Badge>
                  {externalProtein !== undefined && <Badge variant="secondary">P {externalProtein}g</Badge>}
                  {externalCarbs !== undefined && <Badge variant="secondary">C {externalCarbs}g</Badge>}
                  {externalFat !== undefined && <Badge variant="secondary">F {externalFat}g</Badge>}
                  {externalFiber !== undefined && <Badge variant="secondary">Fiber {externalFiber}g</Badge>}
                </div>
                {(!selectedExternalFood.caloriesPerServing || selectedExternalFood.caloriesPerServing <= 0) && (
                  <p className="mt-3 text-xs text-destructive">Calories are missing, so this item cannot be logged yet.</p>
                )}
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Button variant="outline" disabled={!selectedExternalFood.caloriesPerServing || selectedExternalFood.caloriesPerServing <= 0} onClick={() => void addSelectedExternalFood(false)}>
                    Log Once
                  </Button>
                  <Button disabled={!selectedExternalFood.caloriesPerServing || selectedExternalFood.caloriesPerServing <= 0} onClick={() => void addSelectedExternalFood(true)}>
                    Save & Log
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="meals" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input value={mealQuery} onChange={(event) => setMealQuery(event.target.value)} className="pl-9" placeholder="Search saved meal templates" />
            </div>
            <div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplate(template)}
                  className={cn(
                    "interactive-row rounded-lg p-3 text-left",
                    selectedTemplate?.id === template.id && "border-primary bg-primary/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-medium leading-snug">{template.name}</p>
                      <p className="text-xs text-muted-foreground">{template.items.length} foods</p>
                    </div>
                    {template.isFavorite && <Star className="h-4 w-4 fill-primary text-primary" />}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge>{formatKcal(template.totalCalories)}</Badge>
                    <Badge variant="secondary">P {formatNumber(template.totalProtein, 0)}g</Badge>
                    <Badge variant="outline">{template.useCount} uses</Badge>
                  </div>
                </button>
              ))}
              {filteredTemplates.length === 0 && (
                <div className="soft-tile flex items-start gap-3 rounded-lg p-4 text-sm text-muted-foreground sm:col-span-2">
                  <UtensilsCrossed className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>No saved meals yet. Create reusable meals from the Meals page, then log them here.</p>
                </div>
              )}
            </div>
            {selectedTemplate && (
              <div className="soft-tile rounded-lg p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">{selectedTemplate.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedTemplate.items.length} foods · {formatKcal(selectedTemplate.totalCalories)}
                    </p>
                  </div>
                  <MealTargetControl locked={mealLocked} target={mealType} value={templateMealType} onChange={setTemplateMealType} className="w-full sm:w-auto" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{formatKcal(selectedTemplate.totalCalories)}</Badge>
                  <Badge variant="secondary">P {selectedTemplate.totalProtein}g</Badge>
                  <Badge variant="secondary">C {selectedTemplate.totalCarbs}g</Badge>
                  <Badge variant="secondary">F {selectedTemplate.totalFat}g</Badge>
                </div>
                <Button className="mt-3 w-full" onClick={addSelectedTemplate}>
                  Add Meal to Log
                </Button>
              </div>
            )}
          </TabsContent>
          <TabsContent value="manual">
            <form className="space-y-4" onSubmit={form.handleSubmit(submitManual)}>
              <Field label="Name" error={form.formState.errors.name?.message}>
                <Input {...form.register("name")} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Calories" error={form.formState.errors.calories?.message}>
                  <Input type="number" {...form.register("calories")} />
                </Field>
                <Field label="Serving size" error={form.formState.errors.servingSize?.message}>
                  <Input type="number" step="0.01" {...form.register("servingSize")} />
                </Field>
                <Field label="Unit" error={form.formState.errors.servingUnit?.message}>
                  <ServingUnitSelect value={form.watch("servingUnit")} onChange={(value) => form.setValue("servingUnit", value, { shouldValidate: true })} />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Quantity" error={form.formState.errors.quantity?.message}>
                  <Input type="number" step="0.01" {...form.register("quantity")} />
                </Field>
                <OptionalField label="Protein" error={form.formState.errors.protein?.message}>
                  <Input type="number" step="0.1" {...form.register("protein")} />
                </OptionalField>
                <OptionalField label="Carbs" error={form.formState.errors.carbs?.message}>
                  <Input type="number" step="0.1" {...form.register("carbs")} />
                </OptionalField>
                <OptionalField label="Fat" error={form.formState.errors.fat?.message}>
                  <Input type="number" step="0.1" {...form.register("fat")} />
                </OptionalField>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Meal" error={form.formState.errors.mealType?.message}>
                  <MealTargetControl locked={mealLocked} target={mealType} value={form.watch("mealType")} onChange={(value) => form.setValue("mealType", value, { shouldValidate: true })} className="w-full" />
                </Field>
                <OptionalField label="Fiber" error={form.formState.errors.fiber?.message}>
                  <Input type="number" step="0.1" {...form.register("fiber")} />
                </OptionalField>
              </div>
              <OptionalField label="Notes" error={form.formState.errors.notes?.message}>
                <Textarea {...form.register("notes")} />
              </OptionalField>
              {!entry && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.watch("saveToLibrary")} onCheckedChange={(checked) => form.setValue("saveToLibrary", Boolean(checked))} />
                  Save this food to my library
                </label>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">{entry ? "Save Changes" : "Add Food"}</Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
        <BarcodeScannerDialog open={barcodeOpen} onOpenChange={setBarcodeOpen} onFoodFound={onBarcodeFoodFound} />
      </DialogContent>
    </Dialog>
  );
}

type ScannerControls = {
  stop: () => void;
};

function extractBarcodeCandidate(value: string) {
  const trimmed = value.trim();
  const groups = trimmed.match(/\d{8,14}/g);
  if (groups?.length) {
    return groups.sort((a, b) => b.length - a.length)[0];
  }

  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length >= 8 && digitsOnly.length <= 14) return digitsOnly;
  return trimmed;
}

function BarcodeScannerDialog({
  open,
  onOpenChange,
  onFoodFound,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFoodFound: (food: NormalizedExternalFood) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlsRef = useRef<ScannerControls | null>(null);
  const lookupInFlightRef = useRef(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;

    const stream = videoRef.current?.srcObject;
    if (typeof MediaStream !== "undefined" && stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const lookupBarcode = useCallback(
    async (rawValue: string) => {
      const barcode = extractBarcodeCandidate(rawValue);
      if (!barcode || barcode.length < 6 || lookupInFlightRef.current) return;

      lookupInFlightRef.current = true;
      setLookupLoading(true);
      setError(null);
      setMessage(`Looking up ${barcode}...`);

      try {
        const response = await searchExternalFoods("barcode", barcode);
        const food = response.foods[0];
        if (!food) {
          setError(response.warnings[0] ?? "No product was found for that barcode.");
          setMessage(null);
          return;
        }

        toast.success("Barcode found.");
        onFoodFound(food);
        onOpenChange(false);
      } catch (lookupError) {
        setError(lookupError instanceof Error ? lookupError.message : "Barcode lookup failed.");
        setMessage(null);
      } finally {
        lookupInFlightRef.current = false;
        setLookupLoading(false);
      }
    },
    [onFoodFound, onOpenChange],
  );

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    let active = true;
    setManualBarcode("");
    setCameraReady(false);
    setLookupLoading(false);
    setMessage("Starting camera...");
    setError(null);

    const startScanner = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage("Camera scanning is not available in this browser. Type or paste the barcode below.");
        return;
      }

      try {
        const { BarcodeFormat, BrowserMultiFormatReader } = await import("@zxing/browser");
        const video = videoRef.current;
        if (!video) return;

        const reader = new BrowserMultiFormatReader(undefined, {
          delayBetweenScanAttempts: 350,
          delayBetweenScanSuccess: 1000,
          tryPlayVideoTimeout: 5000,
        });
        reader.possibleFormats = [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.ITF,
          BarcodeFormat.QR_CODE,
        ];

        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: { facingMode: { ideal: "environment" } },
          },
          video,
          (result) => {
            if (!active || lookupInFlightRef.current || !result) return;
            const rawValue = result.getText();
            if (rawValue) void lookupBarcode(rawValue);
          },
        );

        if (!active) {
          controls.stop();
          return;
        }

        scannerControlsRef.current = controls;
        setCameraReady(true);
        setMessage("Point the camera at the package barcode or a QR code with a product code.");
      } catch {
        setMessage("Camera permission is needed to scan. You can still type or paste the barcode below.");
      }
    };

    void startScanner();

    return () => {
      active = false;
      stopCamera();
    };
  }, [lookupBarcode, open, stopCamera]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scan barcode</DialogTitle>
          <DialogDescription>Use the camera for packaged foods, then log the Open Food Facts result.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />
            {!cameraReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-5 text-center text-sm text-muted-foreground">
                <ScanBarcode className="h-8 w-8" />
                <p>{message ?? "Starting camera..."}</p>
              </div>
            )}
            {cameraReady && (
              <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-lg border-2 border-primary/80 shadow-[0_0_0_999px_rgba(0,0,0,0.25)]" />
            )}
          </div>
          <div className="soft-tile flex items-start gap-2 rounded-lg p-3 text-xs text-muted-foreground">
            <PackageSearch className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Open Food Facts is community-provided. Verify the package label if needed.</p>
          </div>
          {(message || error || lookupLoading) && (
            <div className={cn("flex items-start gap-2 rounded-lg border p-3 text-sm", error ? "border-destructive/30 bg-destructive/10 text-destructive" : "bg-muted/20 text-muted-foreground")}>
              {lookupLoading ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
              <p>{error ?? message}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="manual-barcode">Barcode</Label>
            <div className="flex gap-2">
              <Input
                id="manual-barcode"
                inputMode="numeric"
                value={manualBarcode}
                onChange={(event) => setManualBarcode(event.target.value)}
                placeholder="Type or paste barcode"
              />
              <Button type="button" onClick={() => void lookupBarcode(manualBarcode)} disabled={lookupLoading || manualBarcode.trim().length < 6}>
                {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Look Up"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FoodLibraryDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: FoodLibraryItem | null;
}) {
  const addFood = useFoodStore((state) => state.addFood);
  const updateFood = useFoodStore((state) => state.updateFood);
  const form = useForm<FoodLibraryFormValues>({
    resolver: zodResolver(foodLibrarySchema) as unknown as Resolver<FoodLibraryFormValues>,
    mode: "onBlur",
    defaultValues: {
      name: item?.name ?? "",
      brand: item?.brand ?? "",
      caloriesPerServing: item?.caloriesPerServing ?? 200,
      servingSize: item?.servingSize ?? 1,
      servingUnit: item?.servingUnit ?? "serving",
      protein: item?.protein,
      carbs: item?.carbs,
      fat: item?.fat,
      fiber: item?.fiber,
      category: item?.category ?? "other",
      notes: item?.notes ?? "",
      isFavorite: item?.isFavorite ?? false,
    },
  });

  const submit: SubmitHandler<FoodLibraryFormValues> = async (values) => {
    if (item) await updateFood(item.id, values);
    else await addFood(values);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit food" : "Add food to library"}</DialogTitle>
          <DialogDescription>Foods saved here can be logged in seconds from the diary.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <Field label="Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} />
          </Field>
          <OptionalField label="Brand" error={form.formState.errors.brand?.message}>
            <Input {...form.register("brand")} />
          </OptionalField>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Calories" error={form.formState.errors.caloriesPerServing?.message}>
              <Input type="number" {...form.register("caloriesPerServing")} />
            </Field>
            <Field label="Serving" error={form.formState.errors.servingSize?.message}>
              <Input type="number" step="0.01" {...form.register("servingSize")} />
            </Field>
            <Field label="Unit" error={form.formState.errors.servingUnit?.message}>
              <ServingUnitSelect value={form.watch("servingUnit")} onChange={(value) => form.setValue("servingUnit", value, { shouldValidate: true })} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <OptionalField label="Protein" error={form.formState.errors.protein?.message}>
              <Input type="number" step="0.1" {...form.register("protein")} />
            </OptionalField>
            <OptionalField label="Carbs" error={form.formState.errors.carbs?.message}>
              <Input type="number" step="0.1" {...form.register("carbs")} />
            </OptionalField>
            <OptionalField label="Fat" error={form.formState.errors.fat?.message}>
              <Input type="number" step="0.1" {...form.register("fat")} />
            </OptionalField>
            <OptionalField label="Fiber" error={form.formState.errors.fiber?.message}>
              <Input type="number" step="0.1" {...form.register("fiber")} />
            </OptionalField>
          </div>
          <Field label="Category" error={form.formState.errors.category?.message}>
            <select className="h-11 w-full rounded-lg border px-3 text-sm" {...form.register("category")}>
              {foodCategories.map((category) => (
                <option key={category} value={category}>
                  {titleCase(category)}
                </option>
              ))}
            </select>
          </Field>
          <OptionalField label="Notes" error={form.formState.errors.notes?.message}>
            <Textarea {...form.register("notes")} />
          </OptionalField>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.watch("isFavorite")} onCheckedChange={(checked) => form.setValue("isFavorite", Boolean(checked))} />
            Set as favorite
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Food</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ServingUnitSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [custom, setCustom] = useState(!servingUnits.includes(value as (typeof servingUnits)[number]));
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
      <select
        className="h-11 w-full rounded-lg border px-3 text-sm"
        value={custom ? "custom" : value}
        onChange={(event) => {
          if (event.target.value === "custom") {
            setCustom(true);
            onChange("");
          } else {
            setCustom(false);
            onChange(event.target.value);
          }
        }}
      >
        {servingUnits.map((unit) => (
          <option key={unit} value={unit}>
            {unit}
          </option>
        ))}
        <option value="custom">Custom</option>
      </select>
      {custom && <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Unit" />}
    </div>
  );
}

export function TransactionDialog({
  open,
  onOpenChange,
  transaction,
  defaultDate = localDateKey(),
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  defaultDate?: string;
}) {
  const profile = useBudgetStore((state) => state.profile);
  const addTransaction = useBudgetStore((state) => state.addTransaction);
  const updateTransaction = useBudgetStore((state) => state.updateTransaction);
  const categoryOptions = useMemo(
    () => Array.from(new Set([...transactionCategories, ...profile.categoryBudgets.map((budget) => budget.category), ...(transaction?.category ? [transaction.category] : [])])),
    [profile.categoryBudgets, transaction?.category],
  );
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema) as unknown as Resolver<TransactionFormValues>,
    mode: "onBlur",
    defaultValues: {
      type: transaction?.type ?? "expense",
      amount: transaction?.amount ?? 10000,
      category: transaction?.category ?? "food",
      paymentMethod: transaction?.paymentMethod ?? "cash",
      date: transaction?.date ?? defaultDate,
      title: transaction?.title ?? "",
      notes: transaction?.notes ?? "",
      isRecurring: transaction?.isRecurring ?? false,
    },
  });
  const type = form.watch("type");

  const submit: SubmitHandler<TransactionFormValues> = async (values) => {
    const payload = { ...values, currency: profile.currency };
    if (transaction) await updateTransaction(transaction.id, payload);
    else await addTransaction(payload);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{transaction ? "Edit transaction" : "Add transaction"}</DialogTitle>
          <DialogDescription>Log income, expenses, recurring payments, and retroactive entries.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <div className="grid grid-cols-2 gap-2 rounded-lg border bg-card/80 p-1 shadow-[var(--shadow-control)]">
            {(["expense", "income"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => form.setValue("type", value)}
                className={cn("rounded-md px-3 py-2 text-sm font-semibold transition-colors", type === value ? "bg-primary text-primary-foreground shadow-[var(--shadow-control)]" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
              >
                {titleCase(value)}
              </button>
            ))}
          </div>
          <Field label="Amount" error={form.formState.errors.amount?.message}>
            <Input type="number" step="1" {...form.register("amount")} />
          </Field>
          <Field label="Title" error={form.formState.errors.title?.message}>
            <Input {...form.register("title")} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category" error={form.formState.errors.category?.message}>
              <select className="h-11 w-full rounded-lg border px-3 text-sm" {...form.register("category")}>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {titleCase(category)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date" error={form.formState.errors.date?.message}>
              <Input type="date" {...form.register("date")} />
            </Field>
          </div>
          <Field label="Payment method" error={form.formState.errors.paymentMethod?.message}>
            <div className="grid grid-cols-4 gap-2">
              {(["cash", "card", "bank", "other"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => form.setValue("paymentMethod", method)}
                  className={cn("interactive-row rounded-lg px-3 py-2 text-sm", form.watch("paymentMethod") === method && "border-primary bg-primary/10 text-primary")}
                >
                  {titleCase(method)}
                </button>
              ))}
            </div>
          </Field>
          <OptionalField label="Notes" error={form.formState.errors.notes?.message}>
            <Textarea {...form.register("notes")} />
          </OptionalField>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.watch("isRecurring")} onCheckedChange={(checked) => form.setValue("isRecurring", Boolean(checked))} />
            Recurring monthly transaction
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Transaction</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function HabitDialog({
  open,
  onOpenChange,
  habit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit?: Habit | null;
}) {
  const addHabit = useHabitsStore((state) => state.addHabit);
  const updateHabit = useHabitsStore((state) => state.updateHabit);
  const form = useForm<HabitFormValues>({
    resolver: zodResolver(habitSchema) as unknown as Resolver<HabitFormValues>,
    mode: "onBlur",
    defaultValues: {
      name: habit?.name ?? "",
      icon: habit?.icon ?? "CheckCircle2",
      type: habit?.type ?? "boolean",
      targetValue: habit?.targetValue,
      unit: habit?.unit ?? "",
      category: habit?.category ?? "lifestyle",
      color: habit?.color ?? "#0f9488",
      isActive: habit?.isActive ?? true,
    },
  });

  const submit: SubmitHandler<HabitFormValues> = async (values) => {
    if (habit) await updateHabit(habit.id, values);
    else await addHabit(values);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{habit ? "Edit habit" : "Add habit"}</DialogTitle>
          <DialogDescription>Create simple daily loops that connect fitness, money, and lifestyle.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <Field label="Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Icon" error={form.formState.errors.icon?.message}>
              <select className="h-11 w-full rounded-lg border px-3 text-sm" {...form.register("icon")}>
                {["CheckCircle2", "Droplets", "Apple", "ClipboardList", "Dumbbell", "ReceiptText", "Moon", "ShieldCheck"].map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Type" error={form.formState.errors.type?.message}>
              <select className="h-11 w-full rounded-lg border px-3 text-sm" {...form.register("type")}>
                <option value="boolean">Done or not done</option>
                <option value="quantitative">Quantitative</option>
              </select>
            </Field>
          </div>
          {form.watch("type") === "quantitative" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Target" error={form.formState.errors.targetValue?.message}>
                <Input type="number" {...form.register("targetValue")} />
              </Field>
              <OptionalField label="Unit" error={form.formState.errors.unit?.message}>
                <Input {...form.register("unit")} />
              </OptionalField>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category" error={form.formState.errors.category?.message}>
              <select className="h-11 w-full rounded-lg border px-3 text-sm" {...form.register("category")}>
                {["fitness", "nutrition", "finance", "lifestyle"].map((category) => (
                  <option key={category} value={category}>
                    {titleCase(category)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Color" error={form.formState.errors.color?.message}>
              <Input type="color" {...form.register("color")} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.watch("isActive")} onCheckedChange={(checked) => form.setValue("isActive", Boolean(checked))} />
            Active habit
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Habit</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function WeightDialog({
  open,
  onOpenChange,
  entry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: WeightEntry | null;
}) {
  const profile = useProfileStore((state) => state.profile);
  const addWeight = useFoodStore((state) => state.addWeight);
  const updateWeight = useFoodStore((state) => state.updateWeight);
  const form = useForm<WeightFormValues>({
    resolver: zodResolver(weightSchema) as unknown as Resolver<WeightFormValues>,
    mode: "onBlur",
    defaultValues: {
      date: entry?.date ?? localDateKey(),
      weight: entry?.weight ?? profile?.weight ?? 80,
      bodyFatPercent: entry?.bodyFatPercent,
      notes: entry?.notes ?? "",
    },
  });

  useEffect(() => {
    if (!open) return;

    form.reset({
      date: entry?.date ?? localDateKey(),
      weight: entry?.weight ?? profile?.weight ?? 80,
      bodyFatPercent: entry?.bodyFatPercent,
      notes: entry?.notes ?? "",
    });
  }, [entry, form, open, profile?.weight]);

  const submit: SubmitHandler<WeightFormValues> = async (values) => {
    if (entry) await updateWeight(entry.id, values);
    else await addWeight(values);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entry ? "Edit weight" : "Log weight"}</DialogTitle>
          <DialogDescription>Weights are stored in kilograms so future sync stays precise.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date" error={form.formState.errors.date?.message}>
              <Input type="date" {...form.register("date")} />
            </Field>
            <Field label="Weight (kg)" error={form.formState.errors.weight?.message}>
              <Input type="number" step="0.1" {...form.register("weight")} />
            </Field>
          </div>
          <OptionalField label="Body fat percent" error={form.formState.errors.bodyFatPercent?.message}>
            <Input type="number" step="0.1" {...form.register("bodyFatPercent")} />
          </OptionalField>
          <OptionalField label="Notes" error={form.formState.errors.notes?.message}>
            <Textarea {...form.register("notes")} />
          </OptionalField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Weight</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

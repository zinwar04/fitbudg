"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Plus, Search, Star } from "lucide-react";
import { Resolver, SubmitHandler, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FoodEntry, FoodLibraryItem, Habit, MealType, Transaction, WeightEntry } from "@/lib/db/schema";
import { useBudgetStore } from "@/lib/store/budget.store";
import { useFoodStore } from "@/lib/store/food.store";
import { useHabitsStore } from "@/lib/store/habits.store";
import { useProfileStore } from "@/lib/store/profile.store";
import { foodCategories, mealTypes, servingUnits, transactionCategories } from "@/lib/utils/constants";
import { formatKcal, localDateKey, titleCase } from "@/lib/utils/formatting";
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

export function FoodEntryDialog({
  open,
  onOpenChange,
  date = localDateKey(),
  mealType = "lunch",
  entry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date?: string;
  mealType?: MealType;
  entry?: FoodEntry | null;
}) {
  const library = useFoodStore((state) => state.library);
  const addEntry = useFoodStore((state) => state.addEntry);
  const updateEntry = useFoodStore((state) => state.updateEntry);
  const addFood = useFoodStore((state) => state.addFood);
  const [query, setQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodLibraryItem | null>(null);
  const [libraryQuantity, setLibraryQuantity] = useState(1);
  const [libraryMealType, setLibraryMealType] = useState<MealType>(mealType);

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

  const libraryCalories = selectedFood ? Math.round(selectedFood.caloriesPerServing * libraryQuantity) : 0;
  const libraryProtein = selectedFood?.protein ? Math.round(selectedFood.protein * libraryQuantity) : undefined;
  const libraryCarbs = selectedFood?.carbs ? Math.round(selectedFood.carbs * libraryQuantity) : undefined;
  const libraryFat = selectedFood?.fat ? Math.round(selectedFood.fat * libraryQuantity) : undefined;

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
      fiber: selectedFood.fiber,
      mealType: libraryMealType,
    });
    onOpenChange(false);
  };

  const submitManual: SubmitHandler<FoodEntryFormValues> = async (values) => {
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
        mealType: values.mealType,
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
        mealType: values.mealType,
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
          <DialogDescription>Log from your library or enter a food manually. Calories update before saving.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue={entry ? "manual" : "library"}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library" disabled={Boolean(entry)}>
              From Library
            </TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>
          <TabsContent value="library" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search foods" />
            </div>
            <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
              {filteredLibrary.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => setSelectedFood(food)}
                  className={cn(
                    "rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary",
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
            </div>
            {selectedFood && (
              <div className="rounded-xl border bg-muted/30 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">{selectedFood.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedFood.servingSize} {selectedFood.servingUnit} per serving
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon" onClick={() => setLibraryQuantity(Math.max(0.25, libraryQuantity - 0.25))}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input className="w-24 text-center data-number" type="number" step="0.25" value={libraryQuantity} onChange={(event) => setLibraryQuantity(Number(event.target.value))} />
                    <Button type="button" variant="outline" size="icon" onClick={() => setLibraryQuantity(libraryQuantity + 0.25)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                    <select className="h-10 rounded-lg border bg-background px-3 text-sm" value={libraryMealType} onChange={(event) => setLibraryMealType(event.target.value as MealType)}>
                      {mealTypes.map((type) => (
                        <option key={type} value={type}>
                          {titleCase(type)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{formatKcal(libraryCalories)}</Badge>
                  {libraryProtein !== undefined && <Badge variant="secondary">P {libraryProtein}g</Badge>}
                  {libraryCarbs !== undefined && <Badge variant="secondary">C {libraryCarbs}g</Badge>}
                  {libraryFat !== undefined && <Badge variant="secondary">F {libraryFat}g</Badge>}
                </div>
                <Button className="mt-3 w-full" onClick={addSelectedFood}>
                  Add to Log
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
                  <select className="h-10 w-full rounded-lg border bg-background px-3 text-sm" {...form.register("mealType")}>
                    {mealTypes.map((type) => (
                      <option key={type} value={type}>
                        {titleCase(type)}
                      </option>
                    ))}
                  </select>
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
            <select className="h-10 w-full rounded-lg border bg-background px-3 text-sm" {...form.register("category")}>
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
        className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
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
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            {(["expense", "income"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => form.setValue("type", value)}
                className={cn("rounded-md px-3 py-2 text-sm font-medium transition-colors", type === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
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
              <select className="h-10 w-full rounded-lg border bg-background px-3 text-sm" {...form.register("category")}>
                {transactionCategories.map((category) => (
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
                  className={cn("rounded-lg border px-3 py-2 text-sm", form.watch("paymentMethod") === method && "border-primary bg-primary/10 text-primary")}
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
      color: habit?.color ?? "#10b981",
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
              <select className="h-10 w-full rounded-lg border bg-background px-3 text-sm" {...form.register("icon")}>
                {["CheckCircle2", "Droplets", "Apple", "ClipboardList", "Dumbbell", "ReceiptText", "Moon", "ShieldCheck"].map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Type" error={form.formState.errors.type?.message}>
              <select className="h-10 w-full rounded-lg border bg-background px-3 text-sm" {...form.register("type")}>
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
              <select className="h-10 w-full rounded-lg border bg-background px-3 text-sm" {...form.register("category")}>
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

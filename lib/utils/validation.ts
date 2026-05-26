import { z } from "zod";
import { foodCategories, mealTypes, transactionCategories } from "@/lib/utils/constants";

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  age: z.coerce.number().int().min(13, "Age must be at least 13").max(100, "Age must be 100 or less"),
  sex: z.enum(["male", "female", "other"]),
  height: z.coerce.number().min(90, "Height is too low").max(250, "Height is too high"),
  weight: z.coerce.number().min(25, "Weight is too low").max(350, "Weight is too high"),
  goalWeight: z.coerce.number().min(25, "Goal weight is too low").max(350, "Goal weight is too high"),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "veryActive"]),
  fitnessGoal: z.enum(["lose", "maintain", "gain", "recomp"]),
  weeklyWeightDelta: z.coerce.number().min(0).max(1.5),
  unitSystem: z.enum(["metric", "imperial"]),
  bodyFatPercent: z.coerce.number().min(3).max(70).optional().or(z.literal("").transform(() => undefined)),
  targetProteinOverride: z.coerce.number().min(40).max(350).optional().or(z.literal("").transform(() => undefined)),
});

export const foodLibrarySchema = z.object({
  name: z.string().trim().min(1, "Food name is required"),
  brand: z.string().trim().optional(),
  caloriesPerServing: z.coerce.number().min(1, "Calories must be greater than 0"),
  servingSize: z.coerce.number().min(0.01, "Serving size must be greater than 0"),
  servingUnit: z.string().trim().min(1, "Serving unit is required"),
  protein: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  carbs: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  fat: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  fiber: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  category: z.enum(foodCategories),
  notes: z.string().trim().optional(),
  isFavorite: z.boolean().default(false),
});

export const foodEntrySchema = z.object({
  name: z.string().trim().min(1, "Food name is required"),
  calories: z.coerce.number().min(1, "Calories must be greater than 0"),
  servingSize: z.coerce.number().min(0.01, "Serving size must be greater than 0"),
  servingUnit: z.string().trim().min(1, "Serving unit is required"),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  protein: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  carbs: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  fat: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  fiber: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  mealType: z.enum(mealTypes),
  notes: z.string().trim().optional(),
  saveToLibrary: z.boolean().default(false),
});

export const transactionSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  category: z.enum(transactionCategories),
  paymentMethod: z.enum(["cash", "card", "bank", "other"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date"),
  title: z.string().trim().min(1, "Title is required"),
  notes: z.string().trim().optional(),
  isRecurring: z.boolean().default(false),
});

export const habitSchema = z.object({
  name: z.string().trim().min(1, "Habit name is required"),
  icon: z.string().trim().min(1, "Choose an icon"),
  type: z.enum(["boolean", "quantitative"]),
  targetValue: z.coerce.number().min(1).optional().or(z.literal("").transform(() => undefined)),
  unit: z.string().trim().optional(),
  category: z.enum(["fitness", "nutrition", "finance", "lifestyle"]),
  color: z.string().trim().min(1),
  isActive: z.boolean().default(true),
});

export const weightSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date"),
  weight: z.coerce.number().min(25, "Weight is too low").max(350, "Weight is too high"),
  bodyFatPercent: z.coerce.number().min(3).max(70).optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().optional(),
});

export const budgetProfileSchema = z.object({
  monthlyIncome: z.coerce.number().min(0, "Income cannot be negative"),
  monthlyBudget: z.coerce.number().min(1, "Budget must be greater than 0"),
  currency: z.string().trim().min(1, "Currency is required"),
  currencySymbol: z.string().trim().min(1, "Currency symbol is required"),
});

export const settingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  accentColor: z.enum(["emerald", "blue", "violet", "amber", "rose"]),
  unitSystem: z.enum(["metric", "imperial"]),
  currency: z.string().trim().min(1),
  firstDayOfWeek: z.union([z.literal(0), z.literal(1)]),
  showDecimalCalories: z.boolean(),
  calorieDisplayRounding: z.enum(["none", "5", "10"]),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type FoodLibraryFormValues = z.infer<typeof foodLibrarySchema>;
export type FoodEntryFormValues = z.infer<typeof foodEntrySchema>;
export type TransactionFormValues = z.infer<typeof transactionSchema>;
export type HabitFormValues = z.infer<typeof habitSchema>;
export type WeightFormValues = z.infer<typeof weightSchema>;
export type BudgetProfileFormValues = z.infer<typeof budgetProfileSchema>;
export type SettingsFormValues = z.infer<typeof settingsSchema>;


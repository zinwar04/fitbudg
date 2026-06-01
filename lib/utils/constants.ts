import {
  ActivityLevel,
  AccentColor,
  AppSettings,
  BudgetProfile,
  FoodCategory,
  FitnessGoal,
  MealType,
  TransactionCategory,
} from "@/lib/db/schema";

export const dashboardWidgetOrder = [
  "calories",
  "quick-log",
  "budget-pulse",
  "habits",
  "transactions",
  "week",
  "insight",
  "weight",
];

export const accentColorMap: Record<AccentColor, string> = {
  emerald: "#0f9f8a",
  blue: "#3478f6",
  violet: "#7c5cff",
  amber: "#d98d18",
  rose: "#dd4b6a",
};

export const accentOptions: { value: AccentColor; label: string }[] = [
  { value: "emerald", label: "Emerald" },
  { value: "blue", label: "Blue" },
  { value: "violet", label: "Violet" },
  { value: "amber", label: "Amber" },
  { value: "rose", label: "Rose" },
];

export const activityLabels: Record<ActivityLevel, { title: string; description: string }> = {
  sedentary: { title: "Sedentary", description: "Desk job, little planned exercise" },
  light: { title: "Light", description: "Light movement or 1-3 training days weekly" },
  moderate: { title: "Moderate", description: "Training 3-5 days each week" },
  active: { title: "Active", description: "Training 6-7 days each week" },
  veryActive: { title: "Very Active", description: "Physical job plus training" },
};

export const fitnessGoalLabels: Record<FitnessGoal, { title: string; description: string }> = {
  lose: { title: "Lose Weight", description: "Reduce body fat at a sustainable pace" },
  maintain: { title: "Maintain Weight", description: "Eat at maintenance and stay balanced" },
  gain: { title: "Gain Muscle", description: "Build mass with a controlled surplus" },
  recomp: { title: "Body Recomposition", description: "Lose fat and gain muscle together" },
};

export const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack", "other"];

export const servingUnits = [
  "g",
  "kg",
  "ml",
  "l",
  "serving",
  "piece",
  "slice",
  "cup",
  "tbsp",
  "tsp",
  "oz",
  "lb",
  "egg",
  "wrap",
  "date",
  "medium",
  "small",
  "large",
  "scoop",
  "can",
  "bottle",
] as const;

export const foodCategories: FoodCategory[] = [
  "protein",
  "carbs",
  "vegetables",
  "fruits",
  "dairy",
  "fats",
  "drinks",
  "snacks",
  "meals",
  "other",
];

export const transactionCategories: TransactionCategory[] = [
  "food",
  "transport",
  "rent",
  "bills",
  "internet",
  "shopping",
  "health",
  "education",
  "entertainment",
  "family",
  "savings",
  "income",
  "other",
];

export const defaultSettings: AppSettings = {
  id: "1",
  theme: "system",
  accentColor: "emerald",
  unitSystem: "metric",
  currency: "IQD",
  firstDayOfWeek: 1,
  showDecimalCalories: false,
  calorieDisplayRounding: "none",
  dashboardWidgetOrder,
  updatedAt: new Date().toISOString(),
};

export const defaultBudgetProfile: BudgetProfile = {
  id: "1",
  monthlyIncome: 0,
  monthlyBudget: 750000,
  monthStartDay: 1,
  currency: "IQD",
  currencySymbol: "IQD",
  categoryBudgets: transactionCategories
    .filter((category) => category !== "income")
    .map((category) => ({ category, limit: category === "rent" ? 250000 : category === "food" ? 180000 : 40000 })),
  updatedAt: new Date().toISOString(),
};

export const healthDisclaimer =
  "FitBudget provides general fitness and nutrition information for educational purposes only. Calorie calculations are estimates and vary by individual. This app is not a substitute for professional medical advice. Consult a qualified healthcare provider before making significant changes to your diet or exercise routine, especially if you have any health conditions.";

export const financialDisclaimer =
  "FitBudget is a personal budgeting tool and does not constitute financial advice. Budget calculations and projections are estimates only. Consult a qualified financial advisor for personalized financial guidance.";

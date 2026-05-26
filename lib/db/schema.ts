export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "veryActive";

export type FitnessGoal = "lose" | "maintain" | "gain" | "recomp";

export type UnitSystem = "metric" | "imperial";

export type Sex = "male" | "female" | "other";

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  sex: Sex;
  height: number;
  weight: number;
  goalWeight: number;
  activityLevel: ActivityLevel;
  fitnessGoal: FitnessGoal;
  weeklyWeightDelta: number;
  unitSystem: UnitSystem;
  bodyFatPercent?: number;
  targetProteinOverride?: number;
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyCalorieLog {
  id: string;
  date: string;
  calorieGoalOverride?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "other";

export interface FoodEntry {
  id: string;
  date: string;
  logId: string;
  foodLibraryId?: string;
  mealTemplateId?: string;
  name: string;
  calories: number;
  servingSize: number;
  servingUnit: string;
  quantity: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  mealType: MealType;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type FoodCategory =
  | "protein"
  | "carbs"
  | "vegetables"
  | "fruits"
  | "dairy"
  | "fats"
  | "drinks"
  | "snacks"
  | "meals"
  | "other";

export interface FoodLibraryItem {
  id: string;
  name: string;
  brand?: string;
  caloriesPerServing: number;
  servingSize: number;
  servingUnit: string;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  category: FoodCategory;
  isFavorite: boolean;
  useCount: number;
  lastUsedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MealTemplate {
  id: string;
  name: string;
  description?: string;
  items: MealTemplateItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  isFavorite: boolean;
  useCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MealTemplateItem {
  foodLibraryId: string;
  name: string;
  quantity: number;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface WeightEntry {
  id: string;
  date: string;
  weight: number;
  bodyFatPercent?: number;
  notes?: string;
  createdAt: string;
}

export interface BudgetProfile {
  id: string;
  monthlyIncome: number;
  monthlyBudget: number;
  currency: string;
  currencySymbol: string;
  categoryBudgets: CategoryBudget[];
  updatedAt: string;
}

export interface CategoryBudget {
  category: TransactionCategory;
  limit: number;
}

export type TransactionCategory =
  | "food"
  | "transport"
  | "rent"
  | "bills"
  | "internet"
  | "shopping"
  | "health"
  | "education"
  | "entertainment"
  | "family"
  | "savings"
  | "income"
  | "other";

export interface Transaction {
  id: string;
  type: "expense" | "income";
  amount: number;
  currency: string;
  category: TransactionCategory;
  paymentMethod: "cash" | "card" | "bank" | "other";
  date: string;
  title: string;
  notes?: string;
  isRecurring: boolean;
  recurringId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HabitEntry {
  id: string;
  date: string;
  habitId: string;
  completed: boolean;
  value?: number;
  notes?: string;
  createdAt: string;
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  type: "boolean" | "quantitative";
  targetValue?: number;
  unit?: string;
  category: "fitness" | "nutrition" | "finance" | "lifestyle";
  color: string;
  isActive: boolean;
  streak: number;
  createdAt: string;
}

export interface AppSettings {
  id: string;
  theme: "light" | "dark" | "system";
  accentColor: AccentColor;
  unitSystem: UnitSystem;
  currency: string;
  firstDayOfWeek: 0 | 1;
  showDecimalCalories: boolean;
  calorieDisplayRounding: "none" | "5" | "10";
  dashboardWidgetOrder: string[];
  updatedAt: string;
}

export type AccentColor = "emerald" | "blue" | "violet" | "amber" | "rose";

export interface Insight {
  id: string;
  category: "fitness" | "budget" | "habits" | "correlation" | "warning" | "celebration";
  severity: "positive" | "neutral" | "warning" | "danger";
  icon: string;
  title: string;
  description: string;
  metric?: string;
  actionLabel?: string;
  actionRoute?: string;
  date: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface AssistantSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AppExport {
  userProfiles: UserProfile[];
  dailyCalorieLogs: DailyCalorieLog[];
  foodEntries: FoodEntry[];
  foodLibraryItems: FoodLibraryItem[];
  mealTemplates: MealTemplate[];
  weightEntries: WeightEntry[];
  budgetProfiles: BudgetProfile[];
  transactions: Transaction[];
  habits: Habit[];
  habitEntries: HabitEntry[];
  appSettings: AppSettings[];
  assistantSessions: AssistantSession[];
}

export function emptyExport(): AppExport {
  return {
    userProfiles: [],
    dailyCalorieLogs: [],
    foodEntries: [],
    foodLibraryItems: [],
    mealTemplates: [],
    weightEntries: [],
    budgetProfiles: [],
    transactions: [],
    habits: [],
    habitEntries: [],
    appSettings: [],
    assistantSessions: [],
  };
}

export interface AllUserData {
  profile: UserProfile | null;
  settings: AppSettings;
  budgetProfile: BudgetProfile;
  logs: DailyCalorieLog[];
  foodEntries: FoodEntry[];
  foodLibrary: FoodLibraryItem[];
  mealTemplates: MealTemplate[];
  weightEntries: WeightEntry[];
  transactions: Transaction[];
  habits: Habit[];
  habitEntries: HabitEntry[];
}

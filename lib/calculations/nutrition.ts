import { ActivityLevel, FitnessGoal, Sex, UserProfile } from "@/lib/db/schema";

export interface MacroTargets {
  protein: number;
  fat: number;
  carbs: number;
}

export interface NutritionTargets {
  bmr: number;
  tdee: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  bmi: {
    value: number;
    category: string;
  };
  warnings: string[];
}

export const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

export function sexForCalculations(sex: Sex): "male" | "female" {
  return sex === "male" ? "male" : "female";
}

export function calculateBMR(weight: number, height: number, age: number, sex: "male" | "female"): number {
  if (sex === "male") return 10 * weight + 6.25 * height - 5 * age + 5;
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * activityMultipliers[activityLevel]);
}

export function calculateCalorieTarget(tdee: number, goal: FitnessGoal, weeklyDelta: number): number {
  const dailyDelta = (weeklyDelta * 7700) / 7;
  if (goal === "lose") return Math.max(Math.round(tdee - dailyDelta), 1200);
  if (goal === "gain") return Math.round(tdee + dailyDelta);
  return Math.round(tdee);
}

export function calorieTargetWarnings(
  target: number,
  sex: "male" | "female",
  goal: FitnessGoal,
  weeklyDelta: number,
): string[] {
  const warnings: string[] = [];
  const floor = sex === "male" ? 1500 : 1200;
  if (target < floor) warnings.push(`Your target is below the safe minimum of ${floor} kcal/day.`);
  if (goal === "lose" && weeklyDelta > 1) {
    warnings.push("Losing more than 1 kg/week is not recommended for most people. Consider a slower pace to preserve muscle mass.");
  }
  return warnings;
}

export function calculateMacroTargets(calories: number, goal: FitnessGoal, weight: number): MacroTargets {
  const protein = goal === "gain" || goal === "recomp" ? Math.round(weight * 2.2) : Math.round(weight * 1.6);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { protein, fat, carbs };
}

export function estimateWeeksToGoal(currentWeight: number, goalWeight: number, weeklyDelta: number): number {
  if (weeklyDelta <= 0) return Number.POSITIVE_INFINITY;
  return Math.abs((currentWeight - goalWeight) / weeklyDelta);
}

export function calculateBMI(weight: number, height: number): { value: number; category: string } {
  const heightM = height / 100;
  const value = parseFloat((weight / (heightM * heightM)).toFixed(1));
  const category = value < 18.5 ? "Underweight" : value < 25 ? "Normal weight" : value < 30 ? "Overweight" : "Obese";
  return { value, category };
}

export function calculateNutritionTargets(profile: UserProfile | null): NutritionTargets | null {
  if (!profile) return null;
  const calcSex = sexForCalculations(profile.sex);
  const bmr = Math.round(calculateBMR(profile.weight, profile.height, profile.age, calcSex));
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  const calories = calculateCalorieTarget(tdee, profile.fitnessGoal, profile.weeklyWeightDelta);
  const macros = calculateMacroTargets(calories, profile.fitnessGoal, profile.weight);
  return {
    bmr,
    tdee,
    calories,
    protein: profile.targetProteinOverride ?? macros.protein,
    fat: macros.fat,
    carbs: macros.carbs,
    bmi: calculateBMI(profile.weight, profile.height),
    warnings: calorieTargetWarnings(calories, calcSex, profile.fitnessGoal, profile.weeklyWeightDelta),
  };
}

export function kgToLb(kg: number) {
  return kg * 2.2046226218;
}

export function lbToKg(lb: number) {
  return lb / 2.2046226218;
}

export function cmToIn(cm: number) {
  return cm / 2.54;
}

export function inToCm(value: number) {
  return value * 2.54;
}


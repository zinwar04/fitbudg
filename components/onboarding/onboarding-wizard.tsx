"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, CircleDollarSign, Dumbbell, Flame, LogOut, Scale, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { calculateNutritionTargets, cmToIn, inToCm, kgToLb, lbToKg } from "@/lib/calculations/nutrition";
import { useAuthStore } from "@/lib/store/auth.store";
import { useProfileStore } from "@/lib/store/profile.store";
import { ActivityLevel, AppSettings, BudgetProfile, FitnessGoal, Sex, UnitSystem, UserProfile } from "@/lib/db/schema";
import { accentColorMap, activityLabels, accentOptions, defaultBudgetProfile, defaultSettings, financialDisclaimer, fitnessGoalLabels, healthDisclaimer } from "@/lib/utils/constants";
import { formatCurrency, formatKcal, formatOrdinalDay } from "@/lib/utils/formatting";
import { cn } from "@/lib/utils";

const goalIcons: Record<FitnessGoal, typeof Flame> = {
  lose: Flame,
  maintain: Scale,
  gain: Dumbbell,
  recomp: Sparkles,
};

export function OnboardingWizard() {
  const router = useRouter();
  const signOut = useAuthStore((state) => state.signOut);
  const user = useAuthStore((state) => state.user);
  const finishOnboarding = useProfileStore((state) => state.finishOnboarding);
  const [step, setStep] = useState(0);
  const [heightDisplay, setHeightDisplay] = useState(178);
  const [weightDisplay, setWeightDisplay] = useState(82);
  const [goalWeightDisplay, setGoalWeightDisplay] = useState(82);
  const [profile, setProfile] = useState<Omit<UserProfile, "id" | "createdAt" | "updatedAt" | "onboardingComplete">>({
    name: typeof user?.user_metadata?.name === "string" ? user.user_metadata.name : "",
    age: 25,
    sex: "other",
    height: 178,
    weight: 82,
    goalWeight: 82,
    activityLevel: "light",
    fitnessGoal: "maintain",
    weeklyWeightDelta: 0.25,
    unitSystem: "metric",
  });
  const [budget, setBudget] = useState<BudgetProfile>(defaultBudgetProfile);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [complete, setComplete] = useState(false);
  const totalSteps = 6;
  const targets = useMemo(() => calculateNutritionTargets({ ...profile, id: "preview", onboardingComplete: false, createdAt: "", updatedAt: "" }), [profile]);
  const weeksToGoal = profile.weeklyWeightDelta > 0 ? Math.ceil(Math.abs(profile.weight - profile.goalWeight) / profile.weeklyWeightDelta) : 0;
  const remainingBudget = budget.monthlyBudget - budget.categoryBudgets.reduce((total, category) => total + category.limit, 0);

  const updateUnitSystem = (unitSystem: UnitSystem) => {
    if (unitSystem === profile.unitSystem) return;
    if (unitSystem === "imperial") {
      setHeightDisplay(Math.round(cmToIn(profile.height)));
      setWeightDisplay(Math.round(kgToLb(profile.weight)));
      setGoalWeightDisplay(Math.round(kgToLb(profile.goalWeight)));
    } else {
      setHeightDisplay(Math.round(profile.height));
      setWeightDisplay(Math.round(profile.weight));
      setGoalWeightDisplay(Math.round(profile.goalWeight));
    }
    setProfile((current) => ({ ...current, unitSystem }));
    setSettings((current) => ({ ...current, unitSystem }));
  };

  const updateBodyMetric = (key: "height" | "weight" | "goalWeight", value: number) => {
    if (key === "height") setHeightDisplay(value);
    if (key === "weight") setWeightDisplay(value);
    if (key === "goalWeight") setGoalWeightDisplay(value);
    setProfile((current) => ({
      ...current,
      [key]: current.unitSystem === "metric" ? value : key === "height" ? inToCm(value) : lbToKg(value),
    }));
  };

  const next = () => setStep((current) => Math.min(totalSteps - 1, current + 1));
  const back = () => setStep((current) => Math.max(0, current - 1));

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  const completeSetup = async () => {
    await finishOnboarding(profile, budget, settings);
    setComplete(true);
    setTimeout(() => router.replace("/dashboard"), 900);
  };

  if (complete) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-semibold">Your FitBudget is ready</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Calorie goal: {formatKcal(targets?.calories)}. Budget: {formatCurrency(budget.monthlyBudget, budget.currency, budget.currencySymbol)} per cycle.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ rotate: -10, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-control)]"
            >
              FB
            </motion.div>
            <div>
              <p className="text-sm font-semibold">FitBudget</p>
              <p className="text-xs text-muted-foreground">A few quick questions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && <Badge variant="secondary">Step {step + 1} of {totalSteps}</Badge>}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
        <Progress value={((step + 1) / totalSteps) * 100} className="mb-6" />

        <Card className="flex-1">
          <CardContent className="p-5 sm:p-8">
            {step === 0 && (
              <StepShell
                title="Build a daily rhythm for your body and money."
                description="FitBudget brings meals, weight, habits, and spending into one clear daily view."
                icon={Sparkles}
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  {["Food logging", "Budget pacing", "Habit streaks"].map((item) => (
                    <div key={item} className="soft-tile rounded-lg p-4 text-sm font-medium">
                      {item}
                    </div>
                  ))}
                </div>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" onClick={next}>
                    Get Started <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </StepShell>
            )}

            {step === 1 && (
              <StepShell title="About you" description="These values drive calorie, macro, and weight trend calculations." icon={Scale}>
                <div className="grid gap-4 sm:grid-cols-3">
                  <InputBlock label="Name" value={profile.name} onChange={(value) => setProfile((current) => ({ ...current, name: value }))} />
                  <InputBlock label="Age" type="number" value={profile.age} onChangeNumber={(value) => setProfile((current) => ({ ...current, age: value }))} />
                  <SelectBlock label="Sex" value={profile.sex} onChange={(value) => setProfile((current) => ({ ...current, sex: value as Sex }))} options={["male", "female", "other"]} />
                </div>
                <div className="mt-4 flex rounded-lg bg-muted p-1">
                  {(["metric", "imperial"] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => updateUnitSystem(unit)}
                      className={cn("flex-1 rounded-md px-3 py-2 text-sm font-medium", profile.unitSystem === unit && "bg-card shadow-sm")}
                    >
                      {unit === "metric" ? "Metric" : "Imperial"}
                    </button>
                  ))}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <InputBlock label={`Height (${profile.unitSystem === "metric" ? "cm" : "in"})`} type="number" value={heightDisplay} onChangeNumber={(value) => updateBodyMetric("height", value)} />
                  <InputBlock label={`Weight (${profile.unitSystem === "metric" ? "kg" : "lb"})`} type="number" value={weightDisplay} onChangeNumber={(value) => updateBodyMetric("weight", value)} />
                  <InputBlock label={`Goal weight (${profile.unitSystem === "metric" ? "kg" : "lb"})`} type="number" value={goalWeightDisplay} onChangeNumber={(value) => updateBodyMetric("goalWeight", value)} />
                </div>
              </StepShell>
            )}

            {step === 2 && (
              <StepShell title="Your fitness goal" description="Choose the direction. You can adjust it later in settings." icon={Flame}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(Object.keys(fitnessGoalLabels) as FitnessGoal[]).map((goal) => {
                    const Icon = goalIcons[goal];
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => setProfile((current) => ({ ...current, fitnessGoal: goal }))}
                        className={cn("interactive-row rounded-lg p-4 text-left", profile.fitnessGoal === goal && "border-primary bg-primary/5")}
                      >
                        <Icon className="mb-3 h-5 w-5 text-primary" />
                        <p className="font-semibold">{fitnessGoalLabels[goal].title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{fitnessGoalLabels[goal].description}</p>
                      </button>
                    );
                  })}
                </div>
                {(profile.fitnessGoal === "lose" || profile.fitnessGoal === "gain") && (
                  <div className="mt-5 rounded-lg border bg-muted/30 p-4 shadow-[var(--shadow-control)]">
                    <div className="flex items-center justify-between">
                      <Label>Weekly rate</Label>
                      <span className="data-number text-sm">{profile.weeklyWeightDelta.toFixed(2)} kg/week</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1.5}
                      step={0.05}
                      value={profile.weeklyWeightDelta}
                      onChange={(event) => setProfile((current) => ({ ...current, weeklyWeightDelta: Number(event.target.value) }))}
                      className="mt-3 w-full accent-[var(--primary)]"
                    />
                    <p className={cn("mt-2 text-sm", profile.weeklyWeightDelta > 1 ? "text-amber-600 dark:text-amber-300" : "text-muted-foreground")}>
                      At this rate, you would reach your goal in approximately {weeksToGoal} weeks.
                    </p>
                  </div>
                )}
              </StepShell>
            )}

            {step === 3 && (
              <StepShell title="Activity level" description="This converts BMR into TDEE and your daily calorie target." icon={Dumbbell}>
                <div className="grid gap-3">
                  {(Object.keys(activityLabels) as ActivityLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setProfile((current) => ({ ...current, activityLevel: level }))}
                      className={cn("interactive-row rounded-lg p-4 text-left", profile.activityLevel === level && "border-primary bg-primary/5")}
                    >
                      <p className="font-semibold">{activityLabels[level].title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{activityLabels[level].description}</p>
                    </button>
                  ))}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <PreviewStat label="BMR" value={formatKcal(targets?.bmr)} detail="Energy at rest" />
                  <PreviewStat label="TDEE" value={formatKcal(targets?.tdee)} detail="BMR plus activity" />
                  <PreviewStat label="Target" value={formatKcal(targets?.calories)} detail="Your daily goal" />
                </div>
              </StepShell>
            )}

            {step === 4 && (
              <StepShell title="Budget setup" description="Set the amount available for each pay cycle. Category limits can be edited anytime." icon={CircleDollarSign}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <InputBlock label="Monthly income" type="number" value={budget.monthlyIncome} onChangeNumber={(value) => setBudget((current) => ({ ...current, monthlyIncome: value }))} />
                  <InputBlock label="Monthly budget" type="number" value={budget.monthlyBudget} onChangeNumber={(value) => setBudget((current) => ({ ...current, monthlyBudget: value }))} />
                  <InputBlock label="Budget cycle start day" type="number" min={1} max={31} value={budget.monthStartDay} onChangeNumber={(value) => setBudget((current) => ({ ...current, monthStartDay: Math.min(31, Math.max(1, Math.round(value || 1))) }))} />
                  <SelectBlock
                    label="Currency"
                    value={budget.currency}
                    onChange={(value) => {
                      setBudget((current) => ({ ...current, currency: value, currencySymbol: value }));
                      setSettings((current) => ({ ...current, currency: value }));
                    }}
                    options={["IQD", "USD", "EUR", "TRY"]}
                  />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  If your salary arrives on the 19th, set the cycle start to the {formatOrdinalDay(19)} so budgeting follows your real pay period instead of the calendar month.
                </p>
                <div className="mt-5 space-y-3">
                  {budget.categoryBudgets.slice(0, 5).map((category, index) => (
                    <div key={category.category}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{category.category}</span>
                        <span className="data-number">{formatCurrency(category.limit, budget.currency, budget.currencySymbol)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={budget.monthlyBudget}
                        step={5000}
                        value={category.limit}
                        className="w-full accent-[var(--primary)]"
                        onChange={(event) => {
                          const limit = Number(event.target.value);
                          setBudget((current) => ({
                            ...current,
                            categoryBudgets: current.categoryBudgets.map((item, itemIndex) => (itemIndex === index ? { ...item, limit } : item)),
                          }));
                        }}
                      />
                    </div>
                  ))}
                  <Badge variant={remainingBudget >= 0 ? "secondary" : "destructive"}>
                    Remaining unallocated: {formatCurrency(remainingBudget, budget.currency, budget.currencySymbol)}
                  </Badge>
                </div>
              </StepShell>
            )}

            {step === 5 && (
              <StepShell title="Customize" description="Choose how the app should look before you start logging your own data." icon={Sparkles}>
                <div className="space-y-5">
                  <div>
                    <Label>Accent color</Label>
                    <div className="mt-2 grid grid-cols-5 gap-2">
                      {accentOptions.map((accent) => (
                        <button
                          key={accent.value}
                          type="button"
                          onClick={() => setSettings((current) => ({ ...current, accentColor: accent.value }))}
                          className={cn("rounded-lg border p-2 text-xs", settings.accentColor === accent.value && "border-primary")}
                        >
                          <span className="mx-auto mb-2 block h-6 w-6 rounded-full" style={{ background: accentColorMap[accent.value] }} />
                          {accent.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <SelectBlock label="Theme" value={settings.theme} onChange={(value) => setSettings((current) => ({ ...current, theme: value as AppSettings["theme"] }))} options={["light", "dark", "system"]} />
                  <div className="soft-tile rounded-lg p-4 text-sm text-muted-foreground">
                    Your account starts clean. The app will only show data you create yourself after setup.
                  </div>
                  <div className="soft-tile rounded-lg p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Health Disclaimer</p>
                    <p className="mt-1">{healthDisclaimer}</p>
                    <p className="mt-4 font-medium text-foreground">Financial Disclaimer</p>
                    <p className="mt-1">{financialDisclaimer}</p>
                  </div>
                </div>
              </StepShell>
            )}
          </CardContent>
        </Card>

        {step > 0 && (
          <div className="mt-5 flex justify-between">
            <Button variant="outline" onClick={back}>
              Back
            </Button>
            {step < totalSteps - 1 ? (
              <Button onClick={next}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={completeSetup}>Go to Dashboard</Button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function StepShell({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof Sparkles;
  children: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

function InputBlock({
  label,
  value,
  type = "text",
  min,
  max,
  onChange,
  onChangeNumber,
}: {
  label: string;
  value: string | number;
  type?: "text" | "number";
  min?: number;
  max?: number;
  onChange?: (value: string) => void;
  onChangeNumber?: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        min={min}
        max={max}
        onChange={(event) => {
          if (type === "number") onChangeNumber?.(Number(event.target.value));
          else onChange?.(event.target.value);
        }}
      />
    </div>
  );
}

function SelectBlock({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select className="h-11 w-full rounded-lg border px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function PreviewStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="soft-tile rounded-lg p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold data-number">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Activity, ArrowDown, ArrowUp, CalendarDays, Dumbbell, Palette, Save, UserRound, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shared/page-header";
import { calculateNutritionTargets } from "@/lib/calculations/nutrition";
import { AppSettings, BudgetProfile, FitnessGoal, UserProfile } from "@/lib/db/schema";
import { useBudgetStore } from "@/lib/store/budget.store";
import { useProfileStore } from "@/lib/store/profile.store";
import { accentColorMap, accentOptions, activityLabels, dashboardWidgetOrder, financialDisclaimer, fitnessGoalLabels, healthDisclaimer } from "@/lib/utils/constants";
import { formatCurrency, formatKcal, formatOrdinalDay, titleCase } from "@/lib/utils/formatting";
import { cn } from "@/lib/utils";

type SettingsSection = "profile" | "fitness" | "budget" | "appearance";

const sections: { id: SettingsSection; label: string; icon: typeof UserRound }[] = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "fitness", label: "Body Goals", icon: Dumbbell },
  { id: "budget", label: "Budget", icon: WalletCards },
  { id: "appearance", label: "Appearance", icon: Palette },
];

function sectionFromPath(pathname: string): SettingsSection {
  if (pathname.includes("/settings/fitness")) return "fitness";
  if (pathname.includes("/settings/budget")) return "budget";
  if (pathname.includes("/settings/appearance")) return "appearance";
  return "profile";
}

export function ProfileSettingsPage() {
  const pathname = usePathname();
  const profile = useProfileStore((state) => state.profile);
  const settings = useProfileStore((state) => state.settings);
  const saveProfile = useProfileStore((state) => state.saveProfile);
  const saveSettings = useProfileStore((state) => state.saveSettings);
  const budgetProfile = useBudgetStore((state) => state.profile);
  const saveBudgetProfile = useBudgetStore((state) => state.saveProfile);
  const [active, setActive] = useState<SettingsSection>(() => sectionFromPath(pathname));
  const [profileDraft, setProfileDraft] = useState(profile);
  const [settingsDraft, setSettingsDraft] = useState(settings);
  const [budgetDraft, setBudgetDraft] = useState(budgetProfile);
  const targets = useMemo(() => calculateNutritionTargets(profileDraft), [profileDraft]);
  const dirty = useMemo(
    () => JSON.stringify(profileDraft) !== JSON.stringify(profile) || JSON.stringify(settingsDraft) !== JSON.stringify(settings) || JSON.stringify(budgetDraft) !== JSON.stringify(budgetProfile),
    [budgetDraft, budgetProfile, profile, profileDraft, settings, settingsDraft],
  );

  if (!profileDraft) return <MissingProfile />;

  const saveAll = async () => {
    await Promise.all([
      saveProfile(profileDraft),
      saveSettings(settingsDraft),
      saveBudgetProfile({
        monthlyIncome: budgetDraft.monthlyIncome,
        monthlyBudget: budgetDraft.monthlyBudget,
        monthStartDay: budgetDraft.monthStartDay,
        currency: budgetDraft.currency,
        currencySymbol: budgetDraft.currencySymbol,
        categoryBudgets: budgetDraft.categoryBudgets,
      }),
    ]);
  };

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your body, goals, budget, and app preferences in one place."
        action={
          <div className="flex items-center gap-2">
            {dirty && <Badge variant="outline">Unsaved changes</Badge>}
            <Button onClick={() => void saveAll()} disabled={!dirty}>
              <Save className="h-4 w-4" /> Save All
            </Button>
          </div>
        }
      />

      <section className="mb-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border bg-card/90 p-4 shadow-[var(--shadow-card)] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary text-lg font-semibold text-primary-foreground shadow-[var(--shadow-control)]">
                {initials(profileDraft.name)}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold tracking-normal">{profileDraft.name || "Your Profile"}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {titleCase(profileDraft.fitnessGoal)} goal · {profileDraft.age} years · {profileDraft.unitSystem}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="w-fit">
              {targets ? `${formatKcal(targets.calories)} target` : "Targets pending"}
            </Badge>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ProfileStat label="Weight" value={`${profileDraft.weight} kg`} />
            <ProfileStat label="Goal" value={`${profileDraft.goalWeight} kg`} />
            <ProfileStat label="Protein" value={`${targets?.protein ?? "--"} g`} />
            <ProfileStat label="Budget" value={formatCurrency(budgetDraft.monthlyBudget, budgetDraft.currency, budgetDraft.currencySymbol)} />
          </div>
        </div>

        <div className="soft-tile rounded-lg p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Live calculations</p>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <Stat label="BMR" value={formatKcal(targets?.bmr)} />
            <Stat label="TDEE" value={formatKcal(targets?.tdee)} />
            <Stat label="BMI" value={targets ? `${targets.bmi.value} (${targets.bmi.category})` : "--"} />
          </div>
        </div>
      </section>

      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActive(section.id)}
              aria-pressed={active === section.id}
              className={cn(
                "focus-ring flex h-12 items-center justify-center gap-2 rounded-lg border bg-card/85 px-3 text-sm font-semibold shadow-[var(--shadow-control)] transition-all",
                active === section.id ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:border-primary/50 hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {section.label}
            </button>
          );
        })}
      </div>

      {active === "profile" && <ProfilePanel draft={profileDraft} setDraft={setProfileDraft} />}
      {active === "fitness" && <FitnessPanel draft={profileDraft} setDraft={setProfileDraft} targets={targets} />}
      {active === "budget" && <BudgetPanel draft={budgetDraft} setDraft={setBudgetDraft} />}
      {active === "appearance" && <AppearancePanel draft={settingsDraft} setDraft={setSettingsDraft} />}
    </>
  );
}

function ProfilePanel({ draft, setDraft }: { draft: UserProfile; setDraft: (draft: UserProfile) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Details</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <InputSetting label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
        <InputSetting label="Age" type="number" value={draft.age} onNumber={(value) => setDraft({ ...draft, age: value })} />
        <SelectSetting label="Sex" value={draft.sex} options={["male", "female", "other"]} onChange={(value) => setDraft({ ...draft, sex: value as UserProfile["sex"] })} />
        <SelectSetting label="Units" value={draft.unitSystem} options={["metric", "imperial"]} onChange={(value) => setDraft({ ...draft, unitSystem: value as UserProfile["unitSystem"] })} />
        <InputSetting label="Height (cm)" type="number" value={draft.height} onNumber={(value) => setDraft({ ...draft, height: value })} />
        <InputSetting label="Current weight (kg)" type="number" value={draft.weight} onNumber={(value) => setDraft({ ...draft, weight: value })} />
      </CardContent>
    </Card>
  );
}

function FitnessPanel({
  draft,
  setDraft,
  targets,
}: {
  draft: UserProfile;
  setDraft: (draft: UserProfile) => void;
  targets: ReturnType<typeof calculateNutritionTargets>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <Card>
        <CardHeader>
          <CardTitle>Body Goal Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <SelectSetting label="Body goal" value={draft.fitnessGoal} options={Object.keys(fitnessGoalLabels)} onChange={(value) => setDraft({ ...draft, fitnessGoal: value as FitnessGoal })} />
          <SelectSetting label="Activity" value={draft.activityLevel} options={Object.keys(activityLabels)} onChange={(value) => setDraft({ ...draft, activityLevel: value as UserProfile["activityLevel"] })} />
          <InputSetting label="Goal weight (kg)" type="number" value={draft.goalWeight} onNumber={(value) => setDraft({ ...draft, goalWeight: value })} />
          <InputSetting label="Weekly change (kg)" type="number" value={draft.weeklyWeightDelta} onNumber={(value) => setDraft({ ...draft, weeklyWeightDelta: value })} />
          <OptionalNumberSetting label="Body fat %" value={draft.bodyFatPercent} onChange={(value) => setDraft({ ...draft, bodyFatPercent: value })} />
          <OptionalNumberSetting label="Protein override (g/day)" value={draft.targetProteinOverride} onChange={(value) => setDraft({ ...draft, targetProteinOverride: value })} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Targets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Stat label="Calories" value={formatKcal(targets?.calories)} />
          <Stat label="Protein" value={`${targets?.protein ?? "--"} g`} />
          <Stat label="Carbs" value={`${targets?.carbs ?? "--"} g`} />
          <Stat label="Fat" value={`${targets?.fat ?? "--"} g`} />
        <div className="soft-tile rounded-lg p-3 text-xs leading-5 text-muted-foreground">{healthDisclaimer}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function BudgetPanel({ draft, setDraft }: { draft: BudgetProfile; setDraft: (draft: BudgetProfile) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Settings</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <InputSetting label="Monthly income" type="number" value={draft.monthlyIncome} onNumber={(value) => setDraft({ ...draft, monthlyIncome: value })} />
        <InputSetting label="Monthly budget" type="number" value={draft.monthlyBudget} onNumber={(value) => setDraft({ ...draft, monthlyBudget: value })} />
        <InputSetting label="Budget cycle start day" type="number" min={1} max={31} value={draft.monthStartDay} onNumber={(value) => setDraft({ ...draft, monthStartDay: Math.min(31, Math.max(1, Math.round(value || 1))) })} />
        <SelectSetting label="Currency" value={draft.currency} options={["IQD", "USD", "EUR", "TRY"]} onChange={(value) => setDraft({ ...draft, currency: value, currencySymbol: value })} />
        <div className="soft-tile rounded-lg p-4 text-sm text-muted-foreground sm:col-span-2">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <CalendarDays className="h-4 w-4" />
            Cycle starts on the {formatOrdinalDay(draft.monthStartDay)}
          </div>
          <p className="mt-2">Set this to payday so budget pacing matches real spending pressure.</p>
        </div>
        <div className="soft-tile rounded-lg p-3 text-xs leading-5 text-muted-foreground sm:col-span-2">{financialDisclaimer}</div>
      </CardContent>
    </Card>
  );
}

function AppearancePanel({ draft, setDraft }: { draft: AppSettings; setDraft: (draft: AppSettings) => void }) {
  const move = (index: number, direction: -1 | 1) => {
    const next = [...(draft.dashboardWidgetOrder.length ? draft.dashboardWidgetOrder : dashboardWidgetOrder)];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setDraft({ ...draft, dashboardWidgetOrder: next });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SelectSetting label="Theme" value={draft.theme} options={["light", "dark", "system"]} onChange={(value) => setDraft({ ...draft, theme: value as AppSettings["theme"] })} />
          <SelectSetting label="Units" value={draft.unitSystem} options={["metric", "imperial"]} onChange={(value) => setDraft({ ...draft, unitSystem: value as AppSettings["unitSystem"] })} />
          <SelectSetting label="Calorie rounding" value={draft.calorieDisplayRounding} options={["none", "5", "10"]} onChange={(value) => setDraft({ ...draft, calorieDisplayRounding: value as AppSettings["calorieDisplayRounding"] })} />
          <label className="interactive-row flex min-h-12 items-center justify-between rounded-lg px-3 text-sm">
            Show decimal calories
            <Switch checked={draft.showDecimalCalories} onCheckedChange={(checked) => setDraft({ ...draft, showDecimalCalories: checked })} />
          </label>
          <div>
            <p className="mb-2 text-sm font-medium">Accent color</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-2 xl:grid-cols-5">
              {accentOptions.map((accent) => (
                <button
                  key={accent.value}
                  type="button"
                  onClick={() => setDraft({ ...draft, accentColor: accent.value })}
                  aria-pressed={draft.accentColor === accent.value}
                  className={cn("interactive-row flex h-11 items-center gap-2 rounded-lg px-3 text-sm", draft.accentColor === accent.value ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground")}
                >
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: accentColorMap[accent.value] }} />
                  {accent.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard Order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(draft.dashboardWidgetOrder.length ? draft.dashboardWidgetOrder : dashboardWidgetOrder).map((widget, index) => (
            <div key={widget} className="interactive-row flex min-h-12 items-center justify-between rounded-lg px-3">
              <span className="min-w-0 truncate text-sm font-medium">{titleCase(widget)}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => move(index, -1)} aria-label={`Move ${titleCase(widget)} up`}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => move(index, 1)} aria-label={`Move ${titleCase(widget)} down`}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function FitnessSettingsPage() {
  return <ProfileSettingsPage />;
}

export function BudgetSettingsPage() {
  return <ProfileSettingsPage />;
}

export function AppearanceSettingsPage() {
  return <ProfileSettingsPage />;
}

function MissingProfile() {
  return <PageHeader title="Profile missing" description="Complete onboarding to unlock settings." />;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="soft-tile rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold data-number">{value}</p>
    </div>
  );
}

function InputSetting({
  label,
  value,
  type = "text",
  min,
  max,
  onChange,
  onNumber,
}: {
  label: string;
  value: string | number;
  type?: "text" | "number";
  min?: number;
  max?: number;
  onChange?: (value: string) => void;
  onNumber?: (value: number) => void;
}) {
  return (
    <label className="space-y-1.5 text-sm font-medium">
      <span>{label}</span>
      <Input
        type={type}
        value={value}
        min={min}
        max={max}
        onChange={(event) => {
          if (type === "number") onNumber?.(Number(event.target.value));
          else onChange?.(event.target.value);
        }}
      />
    </label>
  );
}

function OptionalNumberSetting({ label, value, onChange }: { label: string; value?: number; onChange: (value: number | undefined) => void }) {
  return (
    <label className="space-y-1.5 text-sm font-medium">
      <span>{label}</span>
      <Input type="number" value={value ?? ""} onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))} />
    </label>
  );
}

function SelectSetting({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1.5 text-sm font-medium">
      <span>{label}</span>
      <select className="h-11 w-full rounded-lg border px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {titleCase(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium data-number">{value}</span>
    </div>
  );
}

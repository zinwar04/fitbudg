"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, BarChart3, CircleDollarSign, Loader2, LockKeyhole, Mail, ShieldCheck, Target, UserRound, UtensilsCrossed } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/shared/brand-mark";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth.store";
import { useBudgetStore } from "@/lib/store/budget.store";
import { useFoodStore } from "@/lib/store/food.store";
import { useHabitsStore } from "@/lib/store/habits.store";
import { useProfileStore } from "@/lib/store/profile.store";

const authSchema = z.object({
  name: z.string().trim().optional(),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type AuthFormValues = z.infer<typeof authSchema>;

async function hydrateAfterAuth() {
  await Promise.all([
    useProfileStore.getState().load(),
    useFoodStore.getState().load(),
    useBudgetStore.getState().load(),
    useHabitsStore.getState().load(),
  ]);
  useAuthStore.getState().markCloudHydrated(true);
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const hydrated = useAuthStore((state) => state.hydrated);
  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);
  const loadAuth = useAuthStore((state) => state.load);
  const loading = useAuthStore((state) => state.loading);
  const configured = useAuthStore((state) => state.configured);
  const [notice, setNotice] = useState<string | null>(null);
  const isSignup = mode === "signup";
  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!hydrated) void loadAuth();
  }, [hydrated, loadAuth]);

  useEffect(() => {
    if (!hydrated || !session) return;

    let cancelled = false;

    async function openAccount() {
      await hydrateAfterAuth();
      if (cancelled) return;
      const profile = useProfileStore.getState().profile;
      router.replace(profile?.onboardingComplete ? "/dashboard" : "/onboarding");
    }

    void openAccount();

    return () => {
      cancelled = true;
    };
  }, [hydrated, router, session]);

  const onSubmit = form.handleSubmit(async (values) => {
    setNotice(null);

    if (isSignup && !values.name?.trim()) {
      form.setError("name", { message: "Enter your name." });
      return;
    }

    if (isSignup) {
      const result = await signUp(values.name?.trim() ?? "", values.email, values.password);
      if (result === "confirm-email") {
        setNotice("Check your email to confirm your account, then return here to sign in.");
        return;
      }
    } else {
      const signedIn = await signIn(values.email, values.password);
      if (!signedIn) return;
    }

    await hydrateAfterAuth();
    const profile = useProfileStore.getState().profile;
    router.replace(profile?.onboardingComplete ? "/dashboard" : "/onboarding");
  });

  return (
    <main className="min-h-screen overflow-hidden bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-center">
          <section className="min-w-0 py-4">
            <div className="flex items-center gap-3">
              <BrandMark />
              <div>
                <p className="text-sm font-semibold">FitBudget</p>
                <p className="text-xs text-muted-foreground">Health and money cockpit</p>
              </div>
            </div>
            <h1 className="mt-8 max-w-2xl text-balance text-4xl font-semibold leading-[1.04] tracking-normal sm:text-5xl">
              {isSignup ? "Create your FitBudget account." : "Welcome back to FitBudget."}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              One calm place for meals, weight trends, spending, habits, and coaching notes.
            </p>

            <div className="mt-7 grid grid-cols-3 gap-2 sm:gap-3">
              <AuthValue icon={UtensilsCrossed} label="Food" value="1,840 kcal" />
              <AuthValue icon={CircleDollarSign} label="Budget" value="68% left" />
              <AuthValue icon={Target} label="Habits" value="4 streaks" />
            </div>

            <div className="surface-panel mt-6 hidden max-w-2xl rounded-lg p-4 sm:block">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Today</p>
                  <p className="mt-1 text-lg font-semibold">Daily pulse</p>
                </div>
                <div className="rounded-full border bg-card/80 px-3 py-1 text-xs font-semibold text-[var(--success)]">On track</div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
                <div className="soft-tile rounded-lg p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Nutrition</span>
                    <span className="data-number text-muted-foreground">74%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-[74%] rounded-full bg-gradient-to-r from-primary to-[var(--info)]" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    {[
                      ["Protein", "118g"],
                      ["Carbs", "204g"],
                      ["Fat", "52g"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-md bg-card/75 p-2">
                        <p className="text-muted-foreground">{label}</p>
                        <p className="mt-1 font-semibold data-number">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="soft-tile rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">Week rhythm</p>
                  </div>
                  <div className="mt-4 flex h-24 items-end gap-2">
                    {[42, 58, 46, 72, 66, 82, 74].map((height, index) => (
                      <div key={index} className="flex flex-1 items-end rounded-full bg-muted">
                        <div className="w-full rounded-full bg-[color-mix(in_srgb,var(--primary)_78%,var(--info))]" style={{ height: `${height}%` }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Card className="bg-card/95">
            <CardHeader>
              <CardTitle>{isSignup ? "Sign up" : "Log in"}</CardTitle>
            </CardHeader>
            <CardContent>
              {!configured && (
                <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200">
                  Sign in is temporarily unavailable. Please try again soon.
                </div>
              )}
              <form className="space-y-4" onSubmit={onSubmit}>
                {isSignup && (
                  <Field id="auth-name" label="Name" error={form.formState.errors.name?.message} icon={<UserRound className="h-4 w-4" />}>
                    <Input id="auth-name" autoComplete="name" {...form.register("name")} />
                  </Field>
                )}
                <Field id="auth-email" label="Email" error={form.formState.errors.email?.message} icon={<Mail className="h-4 w-4" />}>
                  <Input id="auth-email" type="email" autoComplete="email" {...form.register("email")} />
                </Field>
                <Field id="auth-password" label="Password" error={form.formState.errors.password?.message} icon={<LockKeyhole className="h-4 w-4" />}>
                  <Input id="auth-password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} {...form.register("password")} />
                </Field>
                {notice && <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">{notice}</p>}
                <Button type="submit" className="w-full" disabled={loading || !configured}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {isSignup ? "Create Account" : "Log In"}
                </Button>
              </form>
              <div className="mt-5 flex items-start gap-3 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>Your progress is saved securely and available whenever you sign in.</p>
              </div>
              <p className="mt-5 text-center text-sm text-muted-foreground">
                {isSignup ? "Already have an account?" : "New here?"}{" "}
                <Link className="font-medium text-primary" href={isSignup ? "/login" : "/signup"}>
                  {isSignup ? "Log in" : "Create an account"}
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function AuthValue({ icon: Icon, label, value }: { icon: typeof UtensilsCrossed; label: string; value: string }) {
  return (
    <div className="soft-tile flex min-h-20 flex-col items-start justify-between gap-2 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-start sm:gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary sm:h-10 sm:w-10">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block truncate text-[13px] font-semibold data-number sm:text-sm">{value}</span>
      </span>
    </div>
  );
}

function Field({ id, label, error, icon, children }: { id: string; label: string; error?: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={cn("flex items-center gap-2", error && "text-destructive")}>
        <span className={cn("text-muted-foreground", error && "text-destructive")}>{icon}</span>
        {label} <span className="text-muted-foreground">*</span>
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

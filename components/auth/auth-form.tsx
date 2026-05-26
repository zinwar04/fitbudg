"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Cloud, Loader2, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);
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
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1fr_28rem]">
          <section className="flex flex-col justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">FB</div>
            <h1 className="mt-6 max-w-xl text-3xl font-semibold tracking-normal sm:text-4xl">
              {isSignup ? "Create your FitBudget account." : "Welcome back to FitBudget."}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Your food, weight, habits, assistant history, settings, and budget data are saved to your private Supabase account.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {["Private per account", "Supabase powered", "Mobile ready"].map((item) => (
                <div key={item} className="rounded-xl border bg-card p-3 text-sm font-medium shadow-sm">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>{isSignup ? "Sign up" : "Log in"}</CardTitle>
            </CardHeader>
            <CardContent>
              {!configured && (
                <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200">
                  Supabase is not configured. Add your URL and publishable key to `.env.local`.
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
                {notice && <p className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">{notice}</p>}
                <Button type="submit" className="w-full" disabled={loading || !configured}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {isSignup ? "Create Account" : "Log In"}
                </Button>
              </form>
              <div className="mt-5 flex items-start gap-3 rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
                <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>Your account data is stored in private Supabase tables protected by row-level security.</p>
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

function Field({ id, label, error, icon, children }: { id: string; label: string; error?: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-2">
        {icon}
        {label} <span className="text-muted-foreground">*</span>
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

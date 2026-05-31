"use client";

import { AuthChangeEvent, Session, Subscription, User } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/db/supabase.client";

export interface AuthStateSnapshot {
  session: Session | null;
  user: User | null;
}

export async function getCurrentAuthState(): Promise<AuthStateSnapshot> {
  if (!isSupabaseConfigured()) {
    return { session: null, user: null };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await withTimeout(supabase.auth.getSession(), 6000, "Authentication check timed out. Please open the login page and try again.");
  if (error) throw error;

  return {
    session: data.session,
    user: data.session?.user ?? null,
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeout));
  });
}

export async function signUpWithEmail(email: string, password: string, name: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  });

  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw error;
  return data;
}

export async function signOutCurrentUser() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): Subscription | null {
  if (!isSupabaseConfigured()) return null;

  const {
    data: { subscription },
  } = getSupabaseClient().auth.onAuthStateChange(callback);

  return subscription;
}

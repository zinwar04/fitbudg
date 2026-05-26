"use client";

import { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { clearDatabase } from "@/lib/db/database";
import { getCurrentAuthState, onAuthStateChange, signInWithEmail, signOutCurrentUser, signUpWithEmail } from "@/lib/db/auth.service";
import { isSupabaseConfigured } from "@/lib/db/supabase.client";

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

interface AuthState {
  session: Session | null;
  user: User | null;
  hydrated: boolean;
  loading: boolean;
  cloudHydrated: boolean;
  error: string | null;
  configured: boolean;
  load: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (name: string, email: string, password: string) => Promise<"signed-in" | "confirm-email">;
  signOut: () => Promise<void>;
  markCloudHydrated: (cloudHydrated: boolean) => void;
}

let listenerStarted = false;

export const useAuthStore = create<AuthState>()(
  immer((set) => ({
    session: null,
    user: null,
    hydrated: false,
    loading: false,
    cloudHydrated: false,
    error: null,
    configured: isSupabaseConfigured(),
    load: async () => {
      set((state) => {
        state.loading = true;
        state.error = null;
        state.configured = isSupabaseConfigured();
      });

      try {
        const snapshot = await getCurrentAuthState();
        set((state) => {
          state.session = snapshot.session;
          state.user = snapshot.user;
          state.hydrated = true;
          state.loading = false;
        });

        if (!listenerStarted) {
          listenerStarted = true;
          onAuthStateChange((_event, session) => {
            set((state) => {
              state.session = session;
              state.user = session?.user ?? null;
              state.hydrated = true;
              state.cloudHydrated = false;
            });
          });
        }
      } catch (error) {
        const message = messageFromError(error);
        set((state) => {
          state.error = message;
          state.hydrated = true;
          state.loading = false;
        });
        toast.error(message);
      }
    },
    signIn: async (email, password) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const { session, user } = await signInWithEmail(email, password);
        set((state) => {
          state.session = session;
          state.user = user;
          state.loading = false;
          state.hydrated = true;
          state.cloudHydrated = false;
        });
        toast.success("Signed in.");
        return true;
      } catch (error) {
        const message = messageFromError(error);
        set((state) => {
          state.error = message;
          state.loading = false;
        });
        toast.error(message);
        return false;
      }
    },
    signUp: async (name, email, password) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const { session, user } = await signUpWithEmail(email, password, name);
        set((state) => {
          state.session = session;
          state.user = user;
          state.loading = false;
          state.hydrated = true;
          state.cloudHydrated = false;
        });

        if (session) {
          toast.success("Account created.");
          return "signed-in";
        }

        toast.success("Account created. Check your email to confirm your login.");
        return "confirm-email";
      } catch (error) {
        const message = messageFromError(error);
        set((state) => {
          state.error = message;
          state.loading = false;
        });
        toast.error(message);
        throw error;
      }
    },
    signOut: async () => {
      set((state) => {
        state.loading = true;
      });

      try {
        await signOutCurrentUser();
        await clearDatabase();
        set((state) => {
          state.session = null;
          state.user = null;
          state.loading = false;
          state.hydrated = true;
          state.cloudHydrated = false;
        });
        toast.success("Signed out.");
      } catch (error) {
        const message = messageFromError(error);
        set((state) => {
          state.error = message;
          state.loading = false;
        });
        toast.error(message);
      }
    },
    markCloudHydrated: (cloudHydrated) => {
      set((state) => {
        state.cloudHydrated = cloudHydrated;
      });
    },
  })),
);

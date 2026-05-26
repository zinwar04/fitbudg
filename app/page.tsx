"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { pullCloudSnapshotToLocal } from "@/lib/db/cloud-sync.service";
import { useAuthStore } from "@/lib/store/auth.store";
import { useProfileStore } from "@/lib/store/profile.store";

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export default function Home() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const authHydrated = useAuthStore((state) => state.hydrated);
  const loadAuth = useAuthStore((state) => state.load);
  const profile = useProfileStore((state) => state.profile);
  const hydrated = useProfileStore((state) => state.hydrated);
  const load = useProfileStore((state) => state.load);

  useEffect(() => {
    void loadAuth();
  }, [loadAuth]);

  useEffect(() => {
    if (!authHydrated) return;
    if (!session) {
      router.replace("/login");
      return;
    }

    async function openAccount() {
      try {
        await pullCloudSnapshotToLocal();
      } catch (error) {
        toast.error(`Cloud sync failed: ${messageFromError(error)}`);
      }
      await load();
    }

    void openAccount();
  }, [authHydrated, load, router, session]);

  useEffect(() => {
    if (!authHydrated || !session || !hydrated) return;
    router.replace(profile?.onboardingComplete ? "/dashboard" : "/onboarding");
  }, [authHydrated, hydrated, profile?.onboardingComplete, router, session]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Opening FitBudget
      </div>
    </main>
  );
}

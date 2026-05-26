"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth.store";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const load = useAuthStore((state) => state.load);
  const hydrated = useAuthStore((state) => state.hydrated);
  const session = useAuthStore((state) => state.session);

  useEffect(() => {
    if (!hydrated) void load();
  }, [hydrated, load]);

  useEffect(() => {
    if (hydrated && !session) router.replace("/login");
  }, [hydrated, router, session]);

  if (!hydrated || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking your account
        </div>
      </main>
    );
  }

  return children;
}

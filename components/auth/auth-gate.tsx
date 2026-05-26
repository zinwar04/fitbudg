"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLoadingSkeleton } from "@/components/shared/app-loading-skeleton";
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
    return <AppLoadingSkeleton />;
  }

  return children;
}

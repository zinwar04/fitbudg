"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InsightsError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h1 className="mt-4 text-2xl font-semibold tracking-normal">Insights need a refresh</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        One saved record could not be read cleanly. Try again after the app refreshes the latest account data.
      </p>
      <Button className="mt-5" onClick={reset}>
        <RefreshCw className="h-4 w-4" /> Try Again
      </Button>
    </div>
  );
}

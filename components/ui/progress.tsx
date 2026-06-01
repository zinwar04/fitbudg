"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";
import { clamp } from "@/lib/utils/formatting";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root ref={ref} className={cn("relative h-2.5 w-full overflow-hidden rounded-full border border-border/60 bg-secondary/80", className)} {...props}>
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-gradient-to-r from-primary to-[var(--info)] transition-transform duration-500 ease-out"
      style={{ transform: `translateX(-${100 - clamp(value ?? 0, 0, 100)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };

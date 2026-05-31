import { CircleDollarSign, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30",
        compact ? "h-8 w-8" : "h-10 w-10",
        className,
      )}
      aria-hidden="true"
    >
      <Leaf className={cn("absolute", compact ? "h-4 w-4 -translate-x-1 -translate-y-1" : "h-5 w-5 -translate-x-1.5 -translate-y-1.5")} />
      <CircleDollarSign className={cn("absolute", compact ? "h-3.5 w-3.5 translate-x-1.5 translate-y-1.5" : "h-4 w-4 translate-x-2 translate-y-2")} />
    </span>
  );
}

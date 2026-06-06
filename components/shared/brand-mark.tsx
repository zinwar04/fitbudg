import { cn } from "@/lib/utils";

export function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span
      className={cn(
        "brand-gradient relative inline-flex shrink-0 items-center justify-center rounded-lg text-primary-foreground shadow-[var(--shadow-control)]",
        compact ? "h-8 w-8" : "h-10 w-10",
        className,
      )}
      aria-hidden="true"
    >
      <span className={cn("font-semibold leading-none", compact ? "text-base" : "text-lg")}>V</span>
      <span className={cn("absolute rounded-full bg-white/75", compact ? "right-1.5 top-1.5 h-1.5 w-1.5" : "right-2 top-2 h-2 w-2")} />
    </span>
  );
}

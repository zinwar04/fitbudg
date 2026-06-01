import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  tone?: "default" | "positive" | "warning" | "danger";
}) {
  const toneClass = {
    default: "bg-primary/10 text-primary",
    positive: "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]",
    warning: "bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] text-[var(--warning)]",
    danger: "bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] text-[var(--danger)]",
  }[tone];

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex min-h-28 items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="break-words text-xs font-medium uppercase leading-snug tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 break-words text-xl font-semibold leading-tight data-number sm:text-2xl">{value}</p>
          {detail && <p className="mt-1 break-words text-xs leading-snug text-muted-foreground">{detail}</p>}
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-current/10", toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

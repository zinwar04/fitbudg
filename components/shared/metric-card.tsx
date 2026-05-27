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
    default: "text-muted-foreground",
    positive: "text-emerald-500",
    warning: "text-amber-500",
    danger: "text-red-500",
  }[tone];

  return (
    <Card>
      <CardContent className="flex min-h-24 items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="break-words text-xs leading-snug text-muted-foreground">{label}</p>
          <p className="mt-1 break-words text-lg font-semibold leading-tight data-number sm:text-xl">{value}</p>
          {detail && <p className="mt-1 break-words text-xs leading-snug text-muted-foreground">{detail}</p>}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg bg-muted", toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="balance-band flex flex-col items-center justify-center rounded-lg border border-dashed px-5 py-10 text-center shadow-[var(--shadow-control)] sm:px-6 sm:py-12">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-primary/15 bg-card/80 text-primary shadow-[var(--shadow-control)]">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="max-w-sm text-base font-semibold leading-tight">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

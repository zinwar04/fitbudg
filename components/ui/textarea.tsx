import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
      className={cn(
      "focus-ring flex min-h-24 w-full rounded-lg border border-input bg-card/90 px-3 py-2 text-sm shadow-[var(--shadow-control)] transition-colors placeholder:text-muted-foreground hover:border-primary/45 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };

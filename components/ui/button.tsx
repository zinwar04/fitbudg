"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold tracking-normal transition-all duration-150 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[var(--shadow-control)] shadow-primary/20 hover:-translate-y-0.5 hover:brightness-[1.03] active:translate-y-0",
        destructive: "bg-destructive text-destructive-foreground shadow-[var(--shadow-control)] hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0",
        outline: "border border-input bg-card/90 shadow-[var(--shadow-control)] hover:-translate-y-0.5 hover:border-primary/50 hover:bg-accent hover:text-accent-foreground active:translate-y-0",
        secondary: "bg-secondary text-secondary-foreground shadow-[var(--shadow-control)] hover:-translate-y-0.5 hover:bg-secondary/80 active:translate-y-0",
        ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...(asChild ? props : { type: "button", ...props })} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

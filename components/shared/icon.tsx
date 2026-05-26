"use client";

import * as icons from "lucide-react";
import { LucideIcon } from "lucide-react";

export function getLucideIcon(name: string): LucideIcon {
  const icon = icons[name as keyof typeof icons];
  if (typeof icon === "function") return icon as LucideIcon;
  return icons.Circle;
}


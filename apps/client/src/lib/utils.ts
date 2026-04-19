import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn/ui-compatible class helper — Tailwind merge on top of clsx. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

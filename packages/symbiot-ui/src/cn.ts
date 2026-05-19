import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind-aware class concatenator. `clsx` flattens conditionals; `twMerge`
 * resolves conflicting utility classes so the last one wins.
 */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));

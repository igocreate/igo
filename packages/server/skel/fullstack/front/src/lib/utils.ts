import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Compose des classes Tailwind, la dernière l'emportant sur la même propriété. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const POINTS_FORMATTER = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0,
});

/**
 * Formats a points value with a non-breaking space as the thousands
 * separator, matching French typographic conventions (e.g. 5841 -> "5 841").
 */
export function formatPoints(n: number): string {
  return POINTS_FORMATTER.format(n).replace(/\s/g, ' ');
}

/** The club name used to highlight ASCN own rows throughout the ranking UI and exports. */
export const ASCN_CLUB_NAME = "AS CHERBOURG NATATION";

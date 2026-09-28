/**
 * Responsabilité : helpers partagés (cn, formatPoints, formatRetainedSwimmers, ASCN_CLUB_NAME).
 * Appelé par : la plupart des composants et modules.
 * Suppression casserait : le formatage des classes CSS, des points et du nombre de nageurs retenus.
 */
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

/**
 * Describes how many of a club's swimmers count toward its team total, out of
 * those it entered (e.g. 5, 18 -> "5 retenus sur 18"). French keeps the
 * singular for 0 and 1. Non-breaking spaces keep each number with its word
 * (French typography): the label never wraps as "5 / retenus".
 */
export function formatRetainedSwimmers(retained: number, entered: number): string {
  return `${retained}\u00a0${retained >= 2 ? 'retenus' : 'retenu'} sur\u00a0${entered}`;
}

/** The club name used to highlight ASCN own rows throughout the ranking UI and exports. */
export const ASCN_CLUB_NAME = "AS CHERBOURG NATATION";

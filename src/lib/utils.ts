/**
 * Responsabilité : helpers partagés (cn, formatPoints, formatRetainedSwimmers, formatDateTimeFr, ASCN_CLUB_NAME).
 * Appelé par : la plupart des composants et modules.
 * Suppression casserait : le formatage des classes CSS, des points, du nombre de nageurs retenus et des dates « 27 sept. 2026 à 14 h 32 ».
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

// Date and time are formatted apart and joined by hand: a single Intl call with
// dateStyle + timeStyle yields "14:32" or "à 14:32" depending on the ICU version,
// while the club reads "14 h 32".
const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const TIME_FORMATTER = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** Any instant as "27 sept. 2026 à 14 h 32" — last import (export-data.ts) and last update check (update-status.ts). */
export function formatDateTimeFr(at: Date): string {
  // formatToParts rather than splitting "14:32" on ':' — no dependence on the ICU separator.
  const parts = TIME_FORMATTER.formatToParts(at);
  const hours = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minutes = parts.find((p) => p.type === 'minute')?.value ?? '00';
  // Non-breaking spaces keep "14 h 32" on one line when the card wraps.
  return `${DATE_FORMATTER.format(at)} à ${hours} h ${minutes}`;
}

/** The club name used to highlight ASCN own rows throughout the ranking UI and exports. */
export const ASCN_CLUB_NAME = "AS CHERBOURG NATATION";

/**
 * Responsabilité : convertit une cellule texte du CSV extraNat en nombre (points « 1274 Pts », place, année de naissance) et décrit une cellule refusée dans les avertissements.
 * Appelé par : csv-parser.ts (parseCsv) et les tests.
 * Suppression casserait : la lecture des valeurs numériques de chaque ligne importée.
 */

/**
 * Extracts the numeric value out of a points cell formatted as "1274 Pts".
 * Returns null when no number is found, so the caller can report which
 * line of the file is unreadable instead of failing with a bare message.
 */
export function parsePoints(raw: string): number | null {
  const match = raw.match(/(\d+(?:[.,]\d+)?)/);
  return match ? parseFloat(match[1]!.replace(',', '.')) : null;
}

/**
 * Reads a cell that must hold a whole number (place, birth year). Returns
 * null for anything else: unlike parseInt, "1990abc" or "12.5" are refused
 * rather than silently truncated, because a half-read value would still
 * reach the database looking valid.
 */
export function parseWholeNumber(raw: string): number | null {
  const trimmed = raw.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

/** How a refused cell reads in a warning: « vide », or « illisible (« 19XX ») » quoting what was found. */
export function describeCellProblem(raw: string | undefined): string {
  return raw?.trim() ? `illisible (« ${raw} »)` : 'vide';
}

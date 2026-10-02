/**
 * Responsabilité : décide si la carte de résultat de l'écran Import est masquée, « en cours » ou « importé » (coche verte).
 * Appelé par : ImportPage.tsx.
 * Suppression casserait : la carte de l'écran Import — sans cette règle, elle pourrait afficher une coche verte pour un fichier jamais enregistré.
 */

export interface ImportCardInput {
  /** A file has been read (useImport's `result`). */
  hasFile: boolean;
  /** The file waits for an answer (guard modal or « Avant d'importer »): nothing written yet. */
  isPending: boolean;
  hasPersistError: boolean;
  /** The pre-write check or the save itself is running. */
  isPersisting: boolean;
  /** A save finished and its summary is known (useImport's `outcome`). */
  hasOutcome: boolean;
}

export type ImportCardState = 'hidden' | 'saving' | 'done';

/**
 * Having read a file is not enough to show the card: a file is « importé » only once a save has
 * produced an outcome. Otherwise a file read but not written (a second drop being analysed, a pending
 * answer, a failed save) would sit under a green check.
 */
export function importCardState(input: ImportCardInput): ImportCardState {
  if (!input.hasFile || input.isPending || input.hasPersistError) return 'hidden';
  if (input.isPersisting) return 'saving';
  return input.hasOutcome ? 'done' : 'hidden';
}

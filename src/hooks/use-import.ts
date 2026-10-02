/**
 * Responsabilité : état du fichier CSV importé et déclenchement du parsing.
 * Appelé par : AppShell.tsx (contexte partagé), consommé par ImportPage.
 * Suppression casserait : l'import et la preview de fichiers CSV.
 */
import { useCallback, useState } from 'react';
import { parseCsv, type CsvParseResult } from '@/lib/csv-parser';
import type { ImportChanges } from '@/lib/import-diff';

/** What the volunteer is told after a save, kept here (not in the page) so it survives leaving and returning to the Import screen. */
export interface ImportOutcome {
  /** Comparison with the previous import; null at a meeting's first import. */
  changes: { since: string | null; summary: ImportChanges } | null;
  /** Non-blocking warnings, a failed backup, a recap that could not be computed. */
  notices: string[];
}

/** Why the drop zone refused what was dropped, before any reading. */
export type FileRejectionReason = 'not-csv' | 'several-files';

const REJECTION_MESSAGES: Record<FileRejectionReason, string> = {
  'not-csv': 'Fichier non supporté (.csv attendu)',
  // Reading only the first file would import whichever one the system listed first, not necessarily the right one.
  'several-files': 'Un seul fichier à la fois : déposez uniquement le fichier CSV extraNat.',
};

export interface UseImportResult {
  result: CsvParseResult | null;
  fileName: string | null;
  error: string | null;
  /** Bumped on every error, even a repeated message, so the drop zone shakes again on each failed drop. */
  errorId: number;
  outcome: ImportOutcome | null;
  setOutcome: (outcome: ImportOutcome | null) => void;
  handleFileAccepted: (file: File) => Promise<CsvParseResult | null>;
  handleFileRejected: (reason: FileRejectionReason) => void;
  reset: () => void;
}

/** Owns the CSV import state: parsing the dropped file and surfacing errors. */
export function useImport(): UseImportResult {
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setErrorMessage] = useState<string | null>(null);
  const [errorId, setErrorId] = useState(0);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const setError = useCallback((message: string | null): void => {
    setErrorMessage(message);
    if (message !== null) setErrorId((id) => id + 1);
  }, []);

  const handleFileAccepted = useCallback(async (file: File): Promise<CsvParseResult | null> => {
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseCsv(buffer);
      setResult(parsed);
      setFileName(file.name);
      return parsed;
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [setError]);

  // Clears the previous file too: its "importé" card next to the error would read as if the refused file had been imported.
  const handleFileRejected = useCallback((reason: FileRejectionReason): void => {
    setResult(null);
    setFileName(null);
    setOutcome(null);
    setError(REJECTION_MESSAGES[reason]);
  }, [setError]);

  /** Clears the import state. Called when the selected meeting changes, so one meeting's imported data never leaks into another's screens. */
  const reset = useCallback((): void => {
    setResult(null);
    setFileName(null);
    setOutcome(null);
    setError(null);
  }, [setError]);

  return { result, fileName, error, errorId, outcome, setOutcome, handleFileAccepted, handleFileRejected, reset };
}

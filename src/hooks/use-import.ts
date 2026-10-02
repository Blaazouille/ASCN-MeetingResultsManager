/**
 * Responsabilité : état du fichier CSV importé et déclenchement du parsing.
 * Appelé par : AppShell.tsx (contexte partagé), consommé par ImportPage.
 * Suppression casserait : l'import et la preview de fichiers CSV.
 */
import { useCallback, useState } from 'react';
import { parseCsv, type CsvParseResult } from '@/lib/csv-parser';
import type { ImportChanges } from '@/lib/import-diff';
import type { ImportWarning } from '@/lib/import-check';
import type { FileRejectionReason } from '@/components/import/DropZone';

/** What the volunteer is told after a save, kept here (not in the page) so it survives leaving and returning to the Import screen. */
export interface ImportOutcome {
  /** Comparison with the previous import; null at a meeting's first import. */
  changes: { since: string | null; summary: ImportChanges } | null;
  /** Non-blocking warnings, a failed backup, a recap that could not be computed. */
  notices: string[];
}

/**
 * A parsed file waiting for the volunteer's answer (guard modal or « Avant d'importer »), nothing written yet.
 * Kept here for the same reason as ImportOutcome: leaving the Import screen must not turn it into « importé ».
 */
export interface PendingImport {
  parsed: CsvParseResult;
  warnings: ImportWarning[];
}

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
  pending: PendingImport | null;
  setPending: (pending: PendingImport | null) => void;
  /** The pre-write check or the save is running; also blocks a second drop, even after leaving and returning to the screen. */
  isPersisting: boolean;
  setIsPersisting: (isPersisting: boolean) => void;
  /** A failed save, kept so returning to the screen still shows it instead of a success card. */
  persistError: string | null;
  setPersistError: (message: string | null) => void;
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
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [isPersisting, setIsPersisting] = useState(false);
  const [persistError, setPersistError] = useState<string | null>(null);
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

  const handleFileRejected = useCallback(
    (reason: FileRejectionReason): void => {
      setError(REJECTION_MESSAGES[reason]);
      // A save under way or a file awaiting the volunteer's answer stays as is: the refused drop must not cancel it silently.
      if (isPersisting || pending !== null) return;
      // Otherwise the previous file goes: its "importé" card next to the error would read as if the refused file had been imported.
      setResult(null);
      setFileName(null);
      setOutcome(null);
      setPersistError(null);
    },
    [setError, isPersisting, pending]
  );

  /** Clears the import state. Called when the selected meeting changes, so one meeting's imported data never leaks into another's screens. */
  const reset = useCallback((): void => {
    setResult(null);
    setFileName(null);
    setOutcome(null);
    setPending(null);
    setIsPersisting(false);
    setPersistError(null);
    setError(null);
  }, [setError]);

  return {
    result,
    fileName,
    error,
    errorId,
    outcome,
    setOutcome,
    pending,
    setPending,
    isPersisting,
    setIsPersisting,
    persistError,
    setPersistError,
    handleFileAccepted,
    handleFileRejected,
    reset,
  };
}

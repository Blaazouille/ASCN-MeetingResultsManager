/**
 * Responsabilité : état partagé d'un export (en cours, succès, échec) autour d'une tâche d'export.
 * Appelé par : use-ranking-export.ts, use-individual-export.ts, use-ceremony-export.ts.
 * Suppression casserait : le suivi des exports PDF/Excel (bouton désactivé, messages de succès et d'erreur).
 */
import { useState } from 'react';
import { exportErrorMessage, exportSuccessMessage, type ExportFormat } from '@/lib/export-feedback';

export interface UseExportStatusResult {
  isExporting: boolean;
  error: string | null;
  /** Discreet confirmation after a successful export; cleared when the next export starts. */
  notice: string | null;
  run: (format: ExportFormat, task: () => Promise<void>) => Promise<void>;
}

/**
 * Shared by both export hooks so the two screens report exports the same way:
 * a rejected export becomes a readable French message (with its cause)
 * instead of an unhandled rejection, and a success gets a one-line notice
 * rather than a modal that would interrupt the volunteer.
 */
export function useExportStatus(): UseExportStatusResult {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(format: ExportFormat, task: () => Promise<void>): Promise<void> {
    setIsExporting(true);
    setError(null);
    setNotice(null);
    try {
      await task();
      setNotice(exportSuccessMessage(format));
    } catch (err) {
      // The message shows the cause; the console keeps the stack for debugging.
      console.error(err);
      setError(exportErrorMessage(format, err));
    } finally {
      setIsExporting(false);
    }
  }

  return { isExporting, error, notice, run };
}

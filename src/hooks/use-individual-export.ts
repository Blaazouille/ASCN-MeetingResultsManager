/**
 * Responsabilité : orchestre les exports PDF/Excel du classement individuel.
 * Appelé par : IndividualPage.tsx (boutons "Export PDF" et "Export Excel").
 * Suppression casserait : les exports du classement individuel.
 */
import { useState } from 'react';
import { buildPrintMeta } from '@/lib/export-data';
import { exportIndividualToPdf } from '@/lib/individual-pdf-export';
import { exportIndividualToExcel } from '@/lib/individual-excel-export';
import type { Meeting } from '@/lib/db';
import type { IndividualResult } from '@/lib/individual-ranking';

export interface UseIndividualExportResult {
  isExporting: boolean;
  error: string | null;
  exportPdf: (meeting: Meeting, category: string, results: IndividualResult[]) => Promise<void>;
  exportExcel: (meeting: Meeting, category: string, results: IndividualResult[]) => Promise<void>;
}

export function useIndividualExport(): UseIndividualExportResult {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportPdf(meeting: Meeting, category: string, results: IndividualResult[]): Promise<void> {
    setIsExporting(true);
    setError(null);
    try {
      await exportIndividualToPdf(buildPrintMeta(meeting), category, results);
    } catch {
      setError("Échec de l'export PDF. Vous pouvez réessayer.");
    } finally {
      setIsExporting(false);
    }
  }

  async function exportExcel(meeting: Meeting, category: string, results: IndividualResult[]): Promise<void> {
    setIsExporting(true);
    setError(null);
    try {
      await exportIndividualToExcel(buildPrintMeta(meeting), category, results);
    } catch {
      setError("Échec de l'export Excel. Vous pouvez réessayer.");
    } finally {
      setIsExporting(false);
    }
  }

  return { isExporting, error, exportPdf, exportExcel };
}

import { useState } from 'react';
import { buildPrintMeta } from '@/lib/print-data';
import { exportRankingToPdf } from '@/lib/pdf-export';
import { exportRankingToExcel } from '@/lib/excel-export';
import type { TeamResult } from '@/lib/ranking-engine';

export interface UsePrintExportResult {
  isExporting: boolean;
  error: string | null;
  exportPdf: (category: string, results: TeamResult[]) => Promise<void>;
  exportExcel: (category: string, results: TeamResult[]) => Promise<void>;
}

const PDF_ERROR_MESSAGE = "Échec de l'export PDF. Vous pouvez réessayer ou utiliser l'impression directe.";
const EXCEL_ERROR_MESSAGE = "Échec de l'export Excel. Vous pouvez réessayer.";

/**
 * Shared export logic for the Classement and Impression screens: builds a
 * fresh `PrintMeta` at export time (so the "Calculé le …" timestamp reflects
 * when the export actually ran, not when the screen was mounted), tracks the
 * in-flight state, and turns a rejected export promise into a readable
 * French error message instead of an unhandled rejection.
 */
export function usePrintExport(): UsePrintExportResult {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportPdf(category: string, results: TeamResult[]): Promise<void> {
    setIsExporting(true);
    setError(null);
    try {
      await exportRankingToPdf(buildPrintMeta(), category, results);
    } catch {
      setError(PDF_ERROR_MESSAGE);
    } finally {
      setIsExporting(false);
    }
  }

  async function exportExcel(category: string, results: TeamResult[]): Promise<void> {
    setIsExporting(true);
    setError(null);
    try {
      await exportRankingToExcel(buildPrintMeta(), category, results);
    } catch {
      setError(EXCEL_ERROR_MESSAGE);
    } finally {
      setIsExporting(false);
    }
  }

  return { isExporting, error, exportPdf, exportExcel };
}

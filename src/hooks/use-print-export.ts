import { useState } from 'react';
import { buildPrintMeta } from '@/lib/export-data';
import { exportRankingToPdf } from '@/lib/pdf-export';
import { exportRankingToExcel } from '@/lib/excel-export';
import type { Meeting } from '@/lib/db';
import type { TeamResult } from '@/lib/ranking-engine';

export interface UsePrintExportResult {
  isExporting: boolean;
  error: string | null;
  exportPdf: (meeting: Meeting, category: string, results: TeamResult[]) => Promise<void>;
  exportExcel: (meeting: Meeting, category: string, results: TeamResult[]) => Promise<void>;
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

  async function exportPdf(meeting: Meeting, category: string, results: TeamResult[]): Promise<void> {
    setIsExporting(true);
    setError(null);
    try {
      await exportRankingToPdf(buildPrintMeta(meeting), category, results);
    } catch {
      setError(PDF_ERROR_MESSAGE);
    } finally {
      setIsExporting(false);
    }
  }

  async function exportExcel(meeting: Meeting, category: string, results: TeamResult[]): Promise<void> {
    setIsExporting(true);
    setError(null);
    try {
      await exportRankingToExcel(buildPrintMeta(meeting), category, results);
    } catch {
      setError(EXCEL_ERROR_MESSAGE);
    } finally {
      setIsExporting(false);
    }
  }

  return { isExporting, error, exportPdf, exportExcel };
}

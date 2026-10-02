/**
 * Responsabilité : orchestre les exports PDF/Excel du classement (état de chargement, succès, erreurs).
 * Appelé par : RankingPage.tsx (boutons "Export PDF" et "Export Excel").
 * Suppression casserait : les exports PDF/Excel du classement.
 */
import { buildExportMeta } from '@/lib/export-data';
import { exportRankingToPdf } from '@/lib/pdf-export';
import { exportRankingToExcel } from '@/lib/excel-export';
import type { Meeting } from '@/lib/db';
import type { TeamResult } from '@/lib/ranking-engine';
import { useOurClub } from './use-our-club';
import { useExportStatus, type UseExportStatusResult } from './use-export-status';

export interface UseRankingExportResult extends Omit<UseExportStatusResult, 'run'> {
  exportPdf: (meeting: Meeting, category: string, results: TeamResult[]) => Promise<void>;
  exportExcel: (meeting: Meeting, category: string, results: TeamResult[]) => Promise<void>;
}

/**
 * Export entry points for the Classement screen. The `ExportMeta` is built
 * inside the task, at export time, so the "Calculé le …" timestamp reflects
 * when the export actually ran, not when the screen was mounted.
 */
export function useRankingExport(): UseRankingExportResult {
  const { run, ...status } = useExportStatus();
  const ourClub = useOurClub();

  return {
    ...status,
    exportPdf: (meeting, category, results) =>
      run('pdf', () => exportRankingToPdf(buildExportMeta(meeting, ourClub), category, results)),
    exportExcel: (meeting, category, results) =>
      run('excel', () => exportRankingToExcel(buildExportMeta(meeting, ourClub), category, results)),
  };
}

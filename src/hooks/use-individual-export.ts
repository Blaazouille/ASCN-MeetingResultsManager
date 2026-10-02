/**
 * Responsabilité : orchestre les exports PDF/Excel du classement individuel (état de chargement, succès, erreurs).
 * Appelé par : IndividualPage.tsx (boutons "Export PDF" et "Export Excel").
 * Suppression casserait : les exports du classement individuel.
 */
import { buildExportMeta } from '@/lib/export-data';
import { exportIndividualToPdf } from '@/lib/individual-pdf-export';
import { exportIndividualToExcel } from '@/lib/individual-excel-export';
import type { Meeting } from '@/lib/db';
import type { IndividualResult } from '@/lib/individual-ranking';
import { useOurClub } from './use-our-club';
import { useExportStatus, type UseExportStatusResult } from './use-export-status';

export interface UseIndividualExportResult extends Omit<UseExportStatusResult, 'run'> {
  exportPdf: (meeting: Meeting, category: string, results: IndividualResult[]) => Promise<void>;
  exportExcel: (meeting: Meeting, category: string, results: IndividualResult[]) => Promise<void>;
}

export function useIndividualExport(): UseIndividualExportResult {
  const { run, ...status } = useExportStatus();
  const ourClub = useOurClub();

  return {
    ...status,
    exportPdf: (meeting, category, results) =>
      run('pdf', () => exportIndividualToPdf(buildExportMeta(meeting, ourClub), category, results)),
    exportExcel: (meeting, category, results) =>
      run('excel', () => exportIndividualToExcel(buildExportMeta(meeting, ourClub), category, results)),
  };
}

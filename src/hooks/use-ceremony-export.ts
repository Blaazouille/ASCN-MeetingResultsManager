/**
 * Responsabilité : orchestre l'impression du déroulé de cérémonie en PDF (état en cours, succès, erreur).
 * Appelé par : CeremonyPage.tsx (bouton « Imprimer le déroulé »).
 * Suppression casserait : la fiche de proclamation PDF.
 */
import { buildExportMeta } from '@/lib/export-data';
import { exportCeremonyToPdf } from '@/lib/ceremony-pdf-export';
import type { CeremonyStep } from '@/lib/ceremony-script';
import type { Meeting } from '@/lib/db';
import { useOurClub } from './use-our-club';
import { useExportStatus, type UseExportStatusResult } from './use-export-status';

export interface UseCeremonyExportResult extends Omit<UseExportStatusResult, 'run'> {
  exportPdf: (meeting: Meeting, steps: CeremonyStep[]) => Promise<void>;
}

export function useCeremonyExport(): UseCeremonyExportResult {
  const { run, ...status } = useExportStatus();
  const ourClub = useOurClub();

  return {
    ...status,
    exportPdf: (meeting, steps) => run('pdf', () => exportCeremonyToPdf(buildExportMeta(meeting, ourClub), steps)),
  };
}

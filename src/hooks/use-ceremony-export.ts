/**
 * Responsabilité : orchestre l'impression du déroulé de cérémonie en PDF (état en cours, erreur).
 * Appelé par : CeremonyPage.tsx (bouton « Imprimer le déroulé »).
 * Suppression casserait : la fiche de proclamation PDF.
 */
import { useState } from 'react';
import { buildExportMeta } from '@/lib/export-data';
import { exportCeremonyToPdf } from '@/lib/ceremony-pdf-export';
import type { CeremonyStep } from '@/lib/ceremony-script';
import type { Meeting } from '@/lib/db';

export interface UseCeremonyExportResult {
  isExporting: boolean;
  error: string | null;
  exportPdf: (meeting: Meeting, steps: CeremonyStep[]) => Promise<void>;
}

export function useCeremonyExport(): UseCeremonyExportResult {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportPdf(meeting: Meeting, steps: CeremonyStep[]): Promise<void> {
    setIsExporting(true);
    setError(null);
    try {
      await exportCeremonyToPdf(buildExportMeta(meeting), steps);
    } catch {
      setError("Échec de l'impression du déroulé. Vous pouvez réessayer.");
    } finally {
      setIsExporting(false);
    }
  }

  return { isExporting, error, exportPdf };
}

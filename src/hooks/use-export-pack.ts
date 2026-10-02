/**
 * Responsabilité : orchestre « Tout exporter » (choix du dossier, génération de chaque fichier, écriture, ouverture du dossier).
 * Appelé par : RankingPage.tsx (action secondaire du PageHeader).
 * Suppression casserait : le pack de fin de meeting (tous les résultats en un clic).
 */
import { useEffect, useRef, useState } from 'react';
import type { Meeting } from '@/lib/db';
import type { RawSwimmerRow } from '@/lib/csv-parser';
import { buildExportMeta } from '@/lib/export-data';
import { planExportPack, type ExportPackPlan, type PackFileFailure, type PackFilePayload } from '@/lib/export-pack-plan';
import { buildPackFile, type ExportPackInput } from '@/lib/export-pack-files';
import { errorCause, exportPackErrorMessage } from '@/lib/export-feedback';

export interface ExportPackRequest {
  meeting: Meeting;
  rows: RawSwimmerRow[];
  categories: string[];
  topN: number;
}

export interface ExportPackOutcome {
  /** null when no file could be generated: no empty folder is created. */
  folderPath: string | null;
  writtenCount: number;
  totalCount: number;
  failed: PackFileFailure[];
}

export interface UseExportPackResult {
  isExporting: boolean;
  outcome: ExportPackOutcome | null;
  error: string | null;
  exportAll: (request: ExportPackRequest) => Promise<void>;
  openFolder: () => Promise<void>;
}

/**
 * Files are generated in the renderer, where the unit exports already run
 * (@react-pdf/renderer and ExcelJS are bundled there); the main process only
 * receives the bytes and writes them. Generating in main would mean bundling
 * the React PDF components a second time for Node.
 */
export function useExportPack(meetingId: number | null): UseExportPackResult {
  const [isExporting, setIsExporting] = useState(false);
  const [outcome, setOutcome] = useState<ExportPackOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentMeetingId = useRef(meetingId);

  // The report names another meeting's folder once the volunteer switches
  // meeting: clear it, and drop the result of an export still running for the old one.
  useEffect(() => {
    currentMeetingId.current = meetingId;
    setOutcome(null);
    setError(null);
  }, [meetingId]);

  async function generateFiles(
    request: ExportPackRequest,
    plan: ExportPackPlan
  ): Promise<{ payloads: PackFilePayload[]; failed: PackFileFailure[] }> {
    const input: ExportPackInput = {
      meta: buildExportMeta(request.meeting),
      rows: request.rows,
      categories: request.categories,
      topN: request.topN,
      minSwimmers: request.meeting.minSwimmers,
    };
    const payloads: PackFilePayload[] = [];
    const failed: PackFileFailure[] = [];
    // One file at a time and each in its own try: a generator that throws
    // must not cost the volunteer the other files of the pack.
    for (const file of plan.files) {
      try {
        payloads.push({ fileName: file.fileName, data: await buildPackFile(file.kind, input) });
      } catch (err) {
        console.error(err);
        failed.push({ fileName: file.fileName, error: errorCause(err) });
      }
    }
    return { payloads, failed };
  }

  async function exportAll(request: ExportPackRequest): Promise<void> {
    setIsExporting(true);
    setError(null);
    setOutcome(null);
    try {
      const plan = planExportPack(request.meeting.name, request.categories, new Date());
      const chosen = await window.electronAPI.chooseExportPackDir();
      if (!chosen.success) throw new Error(chosen.error);
      // Cancelling the folder dialog is a choice, not an error: nothing to report.
      if (!chosen.chosen) return;

      const { payloads, failed } = await generateFiles(request, plan);
      if (request.meeting.id !== currentMeetingId.current) return;
      if (payloads.length === 0) {
        setOutcome({ folderPath: null, writtenCount: 0, totalCount: plan.files.length, failed });
        return;
      }
      const written = await window.electronAPI.writeExportPack(plan.folderName, payloads);
      if (!written.success || !written.folderPath) throw new Error(written.error);

      if (request.meeting.id !== currentMeetingId.current) return;
      const allFailed = [...failed, ...(written.failed ?? [])];
      setOutcome({
        folderPath: written.folderPath,
        writtenCount: plan.files.length - allFailed.length,
        totalCount: plan.files.length,
        failed: allFailed,
      });
    } catch (err) {
      console.error(err);
      setError(exportPackErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  }

  async function openFolder(): Promise<void> {
    if (!outcome?.folderPath) return;
    const result = await window.electronAPI.openExportPackFolder(outcome.folderPath);
    // The files are there even if the OS refuses to open the folder: give its path so the volunteer can find it.
    setError(result.success ? null : `Impossible d'ouvrir le dossier. Les fichiers sont ici : ${outcome.folderPath}`);
  }

  return { isExporting, outcome, error, exportAll, openFolder };
}

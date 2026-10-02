/**
 * Responsabilité : calcule (sans effet de bord) le dossier et la liste des fichiers du pack de fin de meeting.
 * Appelé par : use-export-pack.ts (renderer), electron/export-pack-writer.ts et preload.ts (suffixe « (2) », types partagés).
 * Suppression casserait : le bouton « Tout exporter » de l'écran Classement.
 */

export type ExportPackFileKind = 'team-pdf' | 'team-excel' | 'individual-pdf' | 'individual-excel' | 'palmares-pdf';

export interface ExportPackFile {
  kind: ExportPackFileKind;
  fileName: string;
}

/** Bytes of one generated file, sent from the renderer to the main process over IPC. */
export interface PackFilePayload {
  fileName: string;
  data: Uint8Array;
}

/** A file of the pack that could not be generated or written, with its readable cause. */
export interface PackFileFailure {
  fileName: string;
  error: string;
}

export interface ExportPackPlan {
  folderName: string;
  files: ExportPackFile[];
}

/**
 * Fixed order: what the volunteer sees in the folder and in the failure list.
 * Names are the ones from issue #24; they are readable French because the
 * folder is opened and forwarded by hand, unlike the slugged unit-export names.
 */
const PACK_FILES: readonly ExportPackFile[] = [
  { kind: 'team-pdf', fileName: 'Classement équipes – Complet.pdf' },
  { kind: 'team-excel', fileName: 'Classement équipes.xlsx' },
  { kind: 'individual-pdf', fileName: 'Classement individuel – Complet.pdf' },
  { kind: 'individual-excel', fileName: 'Classement individuel.xlsx' },
  { kind: 'palmares-pdf', fileName: 'Palmarès.pdf' },
];

/** "2026-11-16" in local time: a meeting ending late evening must not be dated the next day (UTC). */
function localDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * The meeting name is free text typed by the volunteer, but it becomes a
 * folder name: Windows rejects \ / : * ? " < > | and names ending with a dot
 * or a space, and a "/" would silently create a sub-folder elsewhere.
 */
export function safeFolderName(name: string): string {
  const cleaned = name
    // Control characters are invalid in Windows file names too.
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/, '')
    .trim();
  return cleaned || 'Meeting';
}

/**
 * Folder and files of the end-of-meeting pack, e.g.
 * "Meeting de la Mer 2026 – 2026-11-16" with the five files of issue #24.
 * No active category means nothing to rank, so no file is planned.
 */
export function planExportPack(meetingName: string, categories: readonly string[], date: Date): ExportPackPlan {
  return {
    folderName: `${safeFolderName(meetingName)} – ${localDay(date)}`,
    files: categories.length === 0 ? [] : PACK_FILES.map((file) => ({ ...file })),
  };
}

/** Attempt 1 is the plain name, then "name (2)", "name (3)"… so an existing pack is never overwritten. */
export function packFolderCandidate(folderName: string, attempt: number): string {
  return attempt <= 1 ? folderName : `${folderName} (${attempt})`;
}

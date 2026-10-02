/**
 * Responsabilité : écrit sur disque le pack de fin de meeting (dossier choisi dans le main, dossier unique jamais écrasé, fichiers prévus uniquement).
 * Appelé par : ipc-handlers.ts (canaux export:choosePackDir, export:writePack et export:openPackFolder).
 * Suppression casserait : le bouton « Tout exporter » de l'écran Classement (rien ne serait enregistré).
 */
import { app } from 'electron';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  isPackFileName,
  packFolderCandidate,
  safeFolderName,
  type PackFileFailure,
  type PackFilePayload,
} from '../src/lib/export-pack-plan';

export interface PackWriteResult {
  folderPath: string;
  failed: PackFileFailure[];
}

/**
 * Main-process state of the pack between IPC calls. The renderer never sends
 * a path to write to: it can only name a folder inside the parent the
 * volunteer picked in the main-process dialog, and only open a folder this
 * session wrote. A compromised or buggy renderer therefore cannot write or
 * launch anything elsewhere on disk.
 */
export interface ExportPackSession {
  /** Remembers the parent folder the volunteer picked in the dialog. */
  chooseParentDir: (parentDir: string) => void;
  /** Writes into the remembered parent; throws if none was chosen. One choice allows one pack. */
  write: (folderName: string, files: PackFilePayload[]) => PackWriteResult;
  /** Whether `folderPath` is a pack folder written in this session. */
  wrote: (folderPath: string) => boolean;
}

// More "(n)" folders than anyone will make by hand; the cap only stops an
// endless loop if mkdir keeps failing with EEXIST for an unexpected reason.
const MAX_FOLDER_ATTEMPTS = 100;

/** Next to the automatic backups (Documents/MDLM Ranking/Sauvegardes), where the volunteer already looks. */
export function defaultExportDir(): string {
  return path.join(app.getPath('documents'), 'MDLM Ranking', 'Exports');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Creates `<parentDir>/<folderName>`, or "<folderName> (2)", "(3)"… when it
 * already exists. mkdir without `recursive` fails with EEXIST instead of
 * reusing the folder, which is what guarantees an earlier pack is never
 * overwritten — checking existsSync first would leave a race window.
 */
function createPackFolder(parentDir: string, folderName: string): string {
  mkdirSync(parentDir, { recursive: true });
  for (let attempt = 1; attempt <= MAX_FOLDER_ATTEMPTS; attempt++) {
    const candidate = path.join(parentDir, packFolderCandidate(folderName, attempt));
    try {
      mkdirSync(candidate);
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  }
  throw new Error(`Trop de dossiers « ${folderName} » existent déjà dans ${parentDir}`);
}

/**
 * Writes every file it can: one failure (disk full, file locked…) is recorded
 * and the next file is still attempted, so the volunteer gets the rest of the pack.
 */
function writePackFiles(folderPath: string, files: PackFilePayload[]): PackFileFailure[] {
  const failed: PackFileFailure[] = [];
  for (const file of files) {
    try {
      // Only the five planned names: a name like "../x" or any other file is never written.
      if (!isPackFileName(file.fileName)) {
        throw new Error("Ce fichier ne fait pas partie de l'export du meeting");
      }
      // 'wx' fails if the file exists: the folder is new, so this can only be a duplicate in the request.
      writeFileSync(path.join(folderPath, file.fileName), file.data, { flag: 'wx' });
    } catch (error) {
      failed.push({ fileName: file.fileName, error: errorMessage(error) });
    }
  }
  return failed;
}

/**
 * Creates the unique pack folder then writes the files into it. The folder
 * name is sanitized again here: the renderer's planExportPack already does
 * it, but the main process must not trust what crosses the IPC bridge.
 * Throws only if the folder itself cannot be created.
 */
function writeExportPack(parentDir: string, folderName: string, files: PackFilePayload[]): PackWriteResult {
  const folderPath = createPackFolder(parentDir, safeFolderName(folderName));
  return { folderPath, failed: writePackFiles(folderPath, files) };
}

export function createExportPackSession(): ExportPackSession {
  let parentDir: string | null = null;
  const writtenFolders = new Set<string>();

  return {
    chooseParentDir: (dir) => {
      parentDir = dir;
    },
    write: (folderName, files) => {
      if (parentDir === null) {
        throw new Error("Choisissez d'abord le dossier où enregistrer l'export.");
      }
      const chosen = parentDir;
      parentDir = null;
      const result = writeExportPack(chosen, folderName, files);
      writtenFolders.add(result.folderPath);
      return result;
    },
    wrote: (folderPath) => writtenFolders.has(folderPath),
  };
}

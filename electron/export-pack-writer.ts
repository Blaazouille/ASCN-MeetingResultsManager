/**
 * Responsabilité : écrit sur disque le pack de fin de meeting (dossier unique, jamais écrasé, un fichier à la fois).
 * Appelé par : ipc-handlers.ts (canaux export:choosePackDir et export:writePack).
 * Suppression casserait : le bouton « Tout exporter » de l'écran Classement (rien ne serait enregistré).
 */
import { app } from 'electron';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { packFolderCandidate, type PackFileFailure, type PackFilePayload } from '../src/lib/export-pack-plan';

export interface PackWriteResult {
  folderPath: string;
  failed: PackFileFailure[];
}

// More "(n)" folders than anyone will make by hand; the cap only stops an
// endless loop if mkdir keeps failing with EEXIST for an unexpected reason.
const MAX_FOLDER_ATTEMPTS = 100;

/** Next to the automatic backups (Documents/MDLM Ranking/Sauvegardes), where the volunteer already looks. */
export function defaultExportDir(): string {
  return path.join(app.getPath('documents'), 'MDLM Ranking', 'Exports');
}

/**
 * The renderer sends plain names; anything that is not a single path segment
 * (a "/" or "..") would write outside the pack folder, so it is refused.
 */
function isPlainName(name: string): boolean {
  return name !== '' && name !== '.' && name !== '..' && path.basename(name) === name;
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
  if (!isPlainName(folderName)) {
    throw new Error(`Nom de dossier invalide : ${folderName}`);
  }
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
  throw new Error(`Trop de dossiers « ${folderName} » existent déjà dans ${parentDir}`);
}

/**
 * Writes every file it can: one failure (disk full, file locked…) is recorded
 * and the next file is still attempted, so the volunteer gets the rest of the pack.
 */
function writePackFiles(folderPath: string, files: PackFilePayload[]): PackFileFailure[] {
  const failed: PackFileFailure[] = [];
  for (const file of files) {
    try {
      if (!isPlainName(file.fileName)) {
        throw new Error('Nom de fichier invalide');
      }
      writeFileSync(path.join(folderPath, file.fileName), file.data);
    } catch (error) {
      failed.push({ fileName: file.fileName, error: errorMessage(error) });
    }
  }
  return failed;
}

/** Creates the unique pack folder then writes the files into it. Throws only if the folder itself cannot be created. */
export function writeExportPack(parentDir: string, folderName: string, files: PackFilePayload[]): PackWriteResult {
  const folderPath = createPackFolder(parentDir, folderName);
  return { folderPath, failed: writePackFiles(folderPath, files) };
}

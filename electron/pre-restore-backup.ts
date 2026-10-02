/**
 * Responsabilité : écrire une copie de sécurité de la base actuelle avant une restauration, et n'autoriser la restauration que si cette copie existe.
 * Appelé par : electron/ipc-handlers.ts (handler backup:confirm-import), tests.
 * Suppression casserait : le filet de sécurité qui permet d'annuler une restauration faite avec le mauvais fichier.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { exportDatabase, formatBackupTimestamp, restoreDatabase, type BackupData, type RestoreResult } from '../src/lib/backup';

// Deliberately different from auto-backup.ts's 'mdlm-auto-backup-' prefix:
// rotateBackups only matches that prefix, so these copies are never rotated
// out. A restore is rare and destructive, and the copy taken just before it
// is the only way back — losing it to a few CSV imports would defeat it.
export const PRE_RESTORE_PREFIX = 'mdlm-pre-restore-';

export interface SafeRestoreResult {
  result: RestoreResult;
  /** Absolute path of the copy of the database as it was just before the restore. */
  safetyCopyPath: string;
}

/**
 * Writes the current database to `<backupDir>/mdlm-pre-restore-<timestamp>.json`,
 * then restores `data`. If the copy cannot be written (folder missing or
 * read-only, corrupted backup-config.json, disk full…) it throws a French
 * message for the volunteer and the database is left untouched.
 *
 * `resolveBackupDir` is a callback rather than a string so that a failure to
 * read the backup config is reported with the same message as a failed write,
 * and so that tests can run without Electron's `app`.
 */
export function restoreWithSafetyCopy(
  db: Database.Database,
  data: BackupData,
  resolveBackupDir: () => string
): SafeRestoreResult {
  let safetyCopyPath: string;
  try {
    const backupDir = resolveBackupDir();
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }
    safetyCopyPath = path.join(backupDir, `${PRE_RESTORE_PREFIX}${formatBackupTimestamp()}.json`);
    writeFileSync(safetyCopyPath, JSON.stringify(exportDatabase(db), null, 2), 'utf-8');
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Restauration annulée, rien n'a été modifié. La copie de sécurité de la base actuelle n'a pas pu être enregistrée (${cause}). Vérifiez le dossier de sauvegarde dans les Paramètres, puis réessayez.`
    );
  }

  return { result: restoreDatabase(db, data), safetyCopyPath };
}

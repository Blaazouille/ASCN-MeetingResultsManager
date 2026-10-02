/**
 * Responsabilité : sauvegarde automatique après import CSV avec rotation des anciens fichiers.
 * Appelé par : ipc-handlers.ts après insertSwimmerResults.
 * Suppression casserait : la sauvegarde automatique des données après import.
 */
import { app } from 'electron';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { exportDatabase, formatBackupTimestamp } from '../src/lib/backup';

export interface BackupConfig {
  backupDir: string;
  maxBackups: number;
}

const CONFIG_FILENAME = 'backup-config.json';
const DEFAULT_MAX_BACKUPS = 5;
// A wrong file re-imported a few times would rotate every good backup out; 3 keeps at least one older state.
export const MIN_BACKUPS = 3;
const BACKUP_PREFIX = 'mdlm-auto-backup-';

function configPath(): string {
  return path.join(app.getPath('userData'), CONFIG_FILENAME);
}

// Documents, not userData — userData is buried under AppData/Roaming, which
// a non-technical volunteer has no reason to ever navigate to. Documents is
// where they already look for their own files, so a restore from a new or
// reinstalled machine doesn't depend on knowing Electron's data directory.
function defaultBackupDir(): string {
  return path.join(app.getPath('documents'), 'MDLM Ranking', 'Sauvegardes');
}

// Config lives in its own JSON file outside SQLite so it survives a database
// restore (restoreDatabase only touches the meeting/swimmer/ranking tables).
export function loadBackupConfig(): BackupConfig {
  const cfgPath = configPath();
  if (existsSync(cfgPath)) {
    const raw = readFileSync(cfgPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<BackupConfig>;
    return {
      backupDir: typeof parsed.backupDir === 'string' ? parsed.backupDir : defaultBackupDir(),
      maxBackups: typeof parsed.maxBackups === 'number' && parsed.maxBackups > 0 ? Math.max(MIN_BACKUPS, parsed.maxBackups) : DEFAULT_MAX_BACKUPS,
    };
  }
  return { backupDir: defaultBackupDir(), maxBackups: DEFAULT_MAX_BACKUPS };
}

// Rejects an empty backupDir rather than persisting it: loadBackupConfig's
// `typeof parsed.backupDir === 'string'` check accepts '' unchanged, so a
// blank value here would silently make every future performAutoBackup call
// `mkdirSync('')`, throw, and get swallowed by its own try/catch — auto-backup
// would stop forever with no visible error.
export function saveBackupConfig(config: BackupConfig): void {
  if (config.backupDir.trim() === '') {
    throw new Error('Le dossier de sauvegarde ne peut pas être vide');
  }
  if (config.maxBackups < MIN_BACKUPS) {
    throw new Error(`Conservez au moins ${MIN_BACKUPS} sauvegardes`);
  }
  writeFileSync(configPath(), JSON.stringify(config, null, 2), 'utf-8');
}

/** Deletes the oldest `mdlm-auto-backup-*.json` files in `dir` until at most `maxBackups` remain. Filenames sort chronologically (ISO-based timestamp), so lexicographic order is chronological order. */
export function rotateBackups(dir: string, maxBackups: number): void {
  const files = readdirSync(dir)
    .filter((f) => f.startsWith(BACKUP_PREFIX) && f.endsWith('.json'))
    .sort();

  const excess = files.length - maxBackups;
  for (let i = 0; i < excess; i++) {
    unlinkSync(path.join(dir, files[i]!));
  }
}

// Called after every successful CSV import (see ipc-handlers.ts). Never
// throws: a backup failure must not block the import a poolside volunteer is
// waiting on. The error is logged and returned instead, so the import screen
// can tell the volunteer that no restore point was written.
export function performAutoBackup(db: Database.Database): string | null {
  try {
    const config = loadBackupConfig();

    if (!existsSync(config.backupDir)) {
      mkdirSync(config.backupDir, { recursive: true });
    }

    const data = exportDatabase(db);
    const timestamp = formatBackupTimestamp();
    writeFileSync(path.join(config.backupDir, `${BACKUP_PREFIX}${timestamp}.json`), JSON.stringify(data, null, 2), 'utf-8');

    rotateBackups(config.backupDir, config.maxBackups);
    return null;
  } catch (error) {
    console.error('Auto-backup failed:', error);
    return error instanceof Error ? error.message : String(error);
  }
}

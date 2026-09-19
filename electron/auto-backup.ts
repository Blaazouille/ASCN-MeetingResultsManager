/**
 * Responsabilité : sauvegarde automatique après import CSV avec rotation des anciens fichiers.
 * Appelé par : ipc-handlers.ts après insertSwimmerResults.
 * Suppression casserait : la sauvegarde automatique des données après import.
 */
import { app } from 'electron';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { exportDatabase } from '../src/lib/backup';

export interface BackupConfig {
  backupDir: string;
  maxBackups: number;
}

const CONFIG_FILENAME = 'backup-config.json';
const DEFAULT_MAX_BACKUPS = 5;
const BACKUP_PREFIX = 'mdlm-auto-backup-';

function configPath(): string {
  return path.join(app.getPath('userData'), CONFIG_FILENAME);
}

function defaultBackupDir(): string {
  return path.join(app.getPath('userData'), 'backups');
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
      maxBackups: typeof parsed.maxBackups === 'number' && parsed.maxBackups > 0 ? parsed.maxBackups : DEFAULT_MAX_BACKUPS,
    };
  }
  return { backupDir: defaultBackupDir(), maxBackups: DEFAULT_MAX_BACKUPS };
}

export function saveBackupConfig(config: BackupConfig): void {
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
// waiting on, so any error is swallowed and logged instead of propagated.
export function performAutoBackup(db: Database.Database): void {
  try {
    const config = loadBackupConfig();

    if (!existsSync(config.backupDir)) {
      mkdirSync(config.backupDir, { recursive: true });
    }

    const data = exportDatabase(db);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    writeFileSync(path.join(config.backupDir, `${BACKUP_PREFIX}${timestamp}.json`), JSON.stringify(data, null, 2), 'utf-8');

    rotateBackups(config.backupDir, config.maxBackups);
  } catch (error) {
    // Auto-backup must never block or fail the CSV import it runs after.
    console.error('Auto-backup failed:', error);
  }
}

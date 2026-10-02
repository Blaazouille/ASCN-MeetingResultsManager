/**
 * Responsabilité : vérifie qu'une restauration écrit d'abord une copie de sécurité de la base actuelle, et n'a pas lieu si cette copie échoue.
 * Appelé par : Vitest.
 * Suppression casserait : le garde-fou contre une restauration qui perdrait les données sans retour possible.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type Database from 'better-sqlite3';
import { createDatabase } from '../src/lib/db-schema';
import { createMeeting, getAllMeetings } from '../src/lib/db';
import { validateBackup, type BackupData } from '../src/lib/backup';
import { restoreWithSafetyCopy } from '../electron/pre-restore-backup';

function dbWithMeeting(name: string): Database.Database {
  const db = createDatabase(':memory:');
  createMeeting(db, { name, defaultTopN: 5, minSwimmers: 3, activeCategories: [] });
  return db;
}

const incomingBackup: BackupData = {
  version: 1,
  appName: 'MDLM Ranking',
  exportedAt: '2026-09-01T10:00:00.000Z',
  meetings: [
    {
      name: 'Meeting du fichier',
      createdAt: '2026-09-01T09:00:00.000Z',
      updatedAt: '2026-09-01T09:00:00.000Z',
      lastImportedAt: null,
      defaultTopN: 5,
      minSwimmers: 3,
      activeCategories: null,
      swimmers: [],
      teamRankings: [],
    },
  ],
};

describe('restoreWithSafetyCopy', () => {
  const root = path.join(os.tmpdir(), 'mdlm-pre-restore-test-' + Date.now());
  const backupDir = path.join(root, 'Sauvegardes');

  beforeEach(() => {
    mkdirSync(root, { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('saves the database as it was before the restore, in the backup folder, then restores', () => {
    const db = dbWithMeeting('Meeting actuel');

    const { result, safetyCopyPath } = restoreWithSafetyCopy(db, incomingBackup, () => backupDir);

    expect(path.dirname(safetyCopyPath)).toBe(backupDir);
    expect(path.basename(safetyCopyPath)).toMatch(/^mdlm-pre-restore-.+\.json$/);
    const copy = validateBackup(JSON.parse(readFileSync(safetyCopyPath, 'utf-8')));
    expect(copy.meetings.map((m) => m.name)).toEqual(['Meeting actuel']);

    expect(result.meetingsRemoved).toBe(1);
    expect(getAllMeetings(db).map((m) => m.name)).toEqual(['Meeting du fichier']);
  });

  it('creates the backup folder when it does not exist yet', () => {
    const db = dbWithMeeting('Meeting actuel');
    expect(existsSync(backupDir)).toBe(false);

    const { safetyCopyPath } = restoreWithSafetyCopy(db, incomingBackup, () => backupDir);

    expect(existsSync(safetyCopyPath)).toBe(true);
  });

  it('lets the volunteer undo the restore by restoring the safety copy', () => {
    const db = dbWithMeeting('Meeting actuel');
    const { safetyCopyPath } = restoreWithSafetyCopy(db, incomingBackup, () => backupDir);

    const copy = validateBackup(JSON.parse(readFileSync(safetyCopyPath, 'utf-8')));
    restoreWithSafetyCopy(db, copy, () => backupDir);

    expect(getAllMeetings(db).map((m) => m.name)).toEqual(['Meeting actuel']);
  });

  it('does not restore anything and explains why in French when the safety copy cannot be written', () => {
    // A plain file where the folder should be makes the write fail on any platform.
    const blocked = path.join(root, 'pas-un-dossier');
    writeFileSync(blocked, 'not a directory');
    const db = dbWithMeeting('Meeting actuel');

    expect(() => restoreWithSafetyCopy(db, incomingBackup, () => blocked)).toThrow(
      /Restauration annulée, rien n'a été modifié.*Vérifiez le dossier de sauvegarde/
    );
    expect(getAllMeetings(db).map((m) => m.name)).toEqual(['Meeting actuel']);
  });

  it('does not restore anything when the backup folder setting cannot be read', () => {
    const db = dbWithMeeting('Meeting actuel');

    expect(() =>
      restoreWithSafetyCopy(db, incomingBackup, () => {
        throw new Error('backup-config.json illisible');
      })
    ).toThrow(/Restauration annulée.*backup-config\.json illisible/);
    expect(getAllMeetings(db).map((m) => m.name)).toEqual(['Meeting actuel']);
  });

  it('never overwrites an earlier safety copy', () => {
    const db = dbWithMeeting('Meeting actuel');

    restoreWithSafetyCopy(db, incomingBackup, () => backupDir);
    restoreWithSafetyCopy(db, incomingBackup, () => backupDir);

    expect(readdirSync(backupDir).filter((f) => f.startsWith('mdlm-pre-restore-'))).toHaveLength(2);
  });
});

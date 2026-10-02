/**
 * Responsabilité : vérifie la création / réinitialisation du meeting d'entraînement et son exclusion des sauvegardes.
 * Appelé par : Vitest.
 * Suppression casserait : le garde-fou qui empêche le meeting d'exemple de se mêler aux vrais meetings ou aux sauvegardes.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { createDatabase } from '../src/lib/db-schema';
import { createMeeting, getAllMeetings, getSwimmerResults, insertSwimmerResults } from '../src/lib/db';
import { parseCsv, type RawSwimmerRow } from '../src/lib/csv-parser';
import { DEMO_MEETING_NAME, isDemoMeeting, resetDemoMeeting } from '../src/lib/demo-meeting';
import { exportDatabase, type BackupData } from '../src/lib/backup';
import { restoreWithSafetyCopy } from '../electron/pre-restore-backup';

const demoRows = parseCsv(
  new Uint8Array(readFileSync(path.join(__dirname, '..', 'resources', 'meeting-exemple.csv')))
).rows;

const realRow: RawSwimmerRow = {
  name: 'Classement Mixte', place: 1, lastname: 'DUPONT', firstname: 'Jean', birthyear: 1990, nation: 'FRA', club: 'CN TEST', points: 800, comment: '',
};

function dbWithRealMeeting(): Database.Database {
  const db = createDatabase(':memory:');
  const meeting = createMeeting(db, { name: 'Meeting de la Mer 2026' });
  insertSwimmerResults(db, meeting.id, [realRow]);
  return db;
}

describe('resetDemoMeeting', () => {
  it('creates an "Entraînement" meeting flagged as training, with the sample results imported', () => {
    const db = createDatabase(':memory:');
    const meeting = resetDemoMeeting(db, demoRows);

    expect(meeting.name).toBe(DEMO_MEETING_NAME);
    expect(meeting.isDemo).toBe(true);
    expect(meeting.resultCount).toBe(demoRows.length);
    expect(meeting.lastImportedAt).not.toBeNull();
  });

  it('keeps a single training meeting: creating it again starts it over', () => {
    const db = createDatabase(':memory:');
    const first = resetDemoMeeting(db, demoRows);
    // A rehearsal edit the reset must wipe.
    db.prepare('DELETE FROM swimmer_result WHERE meeting_id = ?').run(first.id);

    const second = resetDemoMeeting(db, demoRows);

    expect(getAllMeetings(db).filter((m) => m.isDemo).map((m) => m.id)).toEqual([second.id]);
    expect(getSwimmerResults(db, second.id)).toHaveLength(demoRows.length);
  });

  it('never touches real meetings, even one named "Entraînement"', () => {
    const db = dbWithRealMeeting();
    createMeeting(db, { name: DEMO_MEETING_NAME });

    resetDemoMeeting(db, demoRows);
    resetDemoMeeting(db, demoRows);

    const real = getAllMeetings(db).filter((m) => !m.isDemo);
    expect(real.map((m) => m.name).sort()).toEqual([DEMO_MEETING_NAME, 'Meeting de la Mer 2026']);
    expect(real.find((m) => m.name === 'Meeting de la Mer 2026')?.resultCount).toBe(1);
  });
});

describe('isDemoMeeting', () => {
  it('tells the training meeting from a real or unknown one', () => {
    const db = dbWithRealMeeting();
    const real = getAllMeetings(db)[0]!;
    const demo = resetDemoMeeting(db, demoRows);

    expect(isDemoMeeting(db, demo.id)).toBe(true);
    expect(isDemoMeeting(db, real.id)).toBe(false);
    expect(isDemoMeeting(db, 9999)).toBe(false);
  });
});

describe('backups and the training meeting', () => {
  it('leaves the training meeting and its swimmers out of the backup', () => {
    const db = dbWithRealMeeting();
    resetDemoMeeting(db, demoRows);

    const backup = exportDatabase(db);

    expect(backup.meetings.map((m) => m.name)).toEqual(['Meeting de la Mer 2026']);
    expect(backup.meetings[0]!.swimmers).toHaveLength(1);
  });

  it('needs no safety copy before a restore when the training meeting is all there is', () => {
    const db = createDatabase(':memory:');
    resetDemoMeeting(db, demoRows);
    const backup: BackupData = { version: 1, appName: 'MDLM Ranking', exportedAt: '2026-09-01T10:00:00.000Z', meetings: [] };

    // A backup folder that can't be read must not block the restore: nothing real is at stake.
    const { safetyCopyPath } = restoreWithSafetyCopy(db, backup, () => {
      throw new Error('dossier introuvable');
    });

    expect(safetyCopyPath).toBeNull();
    expect(getAllMeetings(db)).toEqual([]);
  });
});

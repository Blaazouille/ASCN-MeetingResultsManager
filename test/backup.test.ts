import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createDatabase } from '../src/lib/db-schema';
import { createMeeting } from '../src/lib/db';
import {
  exportDatabase,
  validateBackup,
  restoreDatabase,
  type TeamRankingBackup,
} from '../src/lib/backup';

function freshDb(): Database.Database {
  return createDatabase(':memory:');
}

function seedDb(db: Database.Database): void {
  const meeting = createMeeting(db, {
    name: 'Test Meeting',
    date: '2026-09-01',
    location: 'Pool',
    defaultTopN: 5,
    minSwimmers: 3,
    activeCategories: ['Classement Mixte'],
  });
  db.prepare(
    `INSERT INTO swimmer_result (meeting_id, category, rank, lastname, firstname, birthyear, nation, club, points, raw_line)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(meeting.id, 'Classement Mixte', 1, 'DUPONT', 'Jean', 1990, 'FRA', 'CN TEST', 800, null);
  db.prepare(
    `INSERT INTO swimmer_result (meeting_id, category, rank, lastname, firstname, birthyear, nation, club, points, raw_line)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(meeting.id, 'Classement Mixte', 2, 'MARTIN', 'Marie', 1995, 'FRA', 'CN TEST', 750, null);
  db.prepare(
    `INSERT INTO team_ranking (meeting_id, category, club, rank, total_pts, top_n, swimmers)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(meeting.id, 'Classement Mixte', 'CN TEST', 1, 1550, 5, JSON.stringify(['DUPONT Jean', 'MARTIN Marie']));
}

describe('exportDatabase', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = freshDb();
    seedDb(db);
  });

  afterEach(() => {
    db.close();
  });

  it('exports version 1 with correct structure', () => {
    const backup = exportDatabase(db);
    expect(backup.version).toBe(1);
    expect(backup.appName).toBeTruthy();
    expect(backup.exportedAt).toBeTruthy();
    expect(backup.meetings).toHaveLength(1);
  });

  it('exports meeting with its swimmers, rankings, and ranking-rule columns', () => {
    const backup = exportDatabase(db);
    const meeting = backup.meetings[0]!;
    expect(meeting.name).toBe('Test Meeting');
    expect(meeting.defaultTopN).toBe(5);
    expect(meeting.minSwimmers).toBe(3);
    expect(meeting.activeCategories).toEqual(['Classement Mixte']);
    expect(meeting.swimmers).toHaveLength(2);
    expect(meeting.swimmers[0]!.lastname).toBe('DUPONT');
    expect(meeting.teamRankings).toHaveLength(1);
    expect(meeting.teamRankings[0]!.totalPoints).toBe(1550);
  });

  it('exports an empty database as empty meetings array', () => {
    const emptyDb = freshDb();
    const backup = exportDatabase(emptyDb);
    expect(backup.meetings).toHaveLength(0);
    emptyDb.close();
  });
});

describe('validateBackup', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = freshDb();
    seedDb(db);
  });

  afterEach(() => {
    db.close();
  });

  it('accepts a valid backup', () => {
    const backup = exportDatabase(db);
    const validated = validateBackup(backup);
    expect(validated.version).toBe(1);
  });

  it('rejects missing version', () => {
    expect(() => validateBackup({ meetings: [] })).toThrow();
  });

  it('rejects wrong version', () => {
    expect(() => validateBackup({ version: 99, meetings: [] })).toThrow();
  });

  it('rejects non-object input', () => {
    expect(() => validateBackup('not an object')).toThrow();
    expect(() => validateBackup(null)).toThrow();
    expect(() => validateBackup(42)).toThrow();
  });

  it('rejects missing meetings array', () => {
    expect(() => validateBackup({ version: 1 })).toThrow();
  });

  it('rejects swimmer with invalid lastname', () => {
    const backup = exportDatabase(db);
    backup.meetings[0]!.swimmers.push({
      category: 'Classement Mixte',
      rank: 3,
      lastname: null as unknown as string,
      firstname: 'Bad',
      birthyear: 2000,
      nation: 'FRA',
      club: 'CN BAD',
      points: 500,
      rawLine: null,
    });
    expect(() => validateBackup(backup)).toThrow();
  });

  it('rejects swimmer with invalid points', () => {
    const backup = exportDatabase(db);
    backup.meetings[0]!.swimmers.push({
      category: 'Classement Mixte',
      rank: 3,
      lastname: 'BAD',
      firstname: 'Bad',
      birthyear: 2000,
      nation: 'FRA',
      club: 'CN BAD',
      points: 'invalid' as unknown as number,
      rawLine: null,
    });
    expect(() => validateBackup(backup)).toThrow();
  });

  it('rejects malformed teamRankings', () => {
    const backup = exportDatabase(db);
    backup.meetings[0]!.teamRankings = null as unknown as TeamRankingBackup[];
    expect(() => validateBackup(backup)).toThrow();
  });

  it('rejects invalid meeting.status', () => {
    const backup = exportDatabase(db);
    backup.meetings[0]!.status = 'bogus';
    expect(() => validateBackup(backup)).toThrow();
  });
});

describe('restoreDatabase', () => {
  let sourceDb: Database.Database;
  let targetDb: Database.Database;

  beforeEach(() => {
    sourceDb = freshDb();
    seedDb(sourceDb);
    targetDb = freshDb();
  });

  afterEach(() => {
    sourceDb.close();
    targetDb.close();
  });

  it('imports meetings, swimmers, and rankings into an empty database', () => {
    const backup = exportDatabase(sourceDb);
    const result = restoreDatabase(targetDb, backup);
    expect(result.meetingsImported).toBe(1);
    expect(result.meetingsReplaced).toBe(0);
    expect(result.meetingsSkipped).toBe(0);
    expect(result.swimmersImported).toBe(2);
  });

  it('skips meetings that already exist (same name + date) by default', () => {
    const backup = exportDatabase(sourceDb);
    restoreDatabase(targetDb, backup);
    const result = restoreDatabase(targetDb, backup);
    expect(result.meetingsImported).toBe(0);
    expect(result.meetingsReplaced).toBe(0);
    expect(result.meetingsSkipped).toBe(1);
  });

  it('replaces an existing meeting when overwrite is true', () => {
    const backup = exportDatabase(sourceDb);
    restoreDatabase(targetDb, backup);

    // Mutate the target so we can tell the replace actually happened, not
    // just a no-op skip: add an extra swimmer to the meeting already there.
    const existing = targetDb.prepare('SELECT id FROM meeting WHERE name = ? AND date = ?').get('Test Meeting', '2026-09-01') as {
      id: number;
    };
    targetDb
      .prepare(
        `INSERT INTO swimmer_result (meeting_id, category, rank, lastname, firstname, birthyear, nation, club, points, raw_line)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(existing.id, 'Classement Mixte', 3, 'EXTRA', 'Swimmer', 2000, 'FRA', 'CN EXTRA', 500, null);

    const result = restoreDatabase(targetDb, backup, { overwrite: true });
    expect(result.meetingsImported).toBe(0);
    expect(result.meetingsReplaced).toBe(1);
    expect(result.meetingsSkipped).toBe(0);
    expect(result.swimmersImported).toBe(2);

    // The replaced meeting has only the backup's 2 swimmers, not 3 — the
    // extra one from the mutation above was deleted along with the old row.
    const reExported = exportDatabase(targetDb);
    expect(reExported.meetings).toHaveLength(1);
    expect(reExported.meetings[0]!.swimmers).toHaveLength(2);
  });

  it('round-trip preserves all data including ranking rules', () => {
    const backup = exportDatabase(sourceDb);
    restoreDatabase(targetDb, backup);
    const reExported = exportDatabase(targetDb);
    expect(reExported.meetings).toHaveLength(backup.meetings.length);
    expect(reExported.meetings[0]!.swimmers).toHaveLength(backup.meetings[0]!.swimmers.length);
    expect(reExported.meetings[0]!.name).toBe(backup.meetings[0]!.name);
    expect(reExported.meetings[0]!.defaultTopN).toBe(backup.meetings[0]!.defaultTopN);
    expect(reExported.meetings[0]!.activeCategories).toEqual(backup.meetings[0]!.activeCategories);
    expect(reExported.meetings[0]!.teamRankings[0]!.totalPoints).toBe(backup.meetings[0]!.teamRankings[0]!.totalPoints);
  });

  it('rolls back on error (transactional)', () => {
    const backup = exportDatabase(sourceDb);
    backup.meetings[0]!.swimmers.push({
      category: 'Classement Mixte',
      rank: 3,
      lastname: null as unknown as string,
      firstname: 'Bad',
      birthyear: 2000,
      nation: 'FRA',
      club: 'CN BAD',
      points: 500,
      rawLine: null,
    });
    expect(() => restoreDatabase(targetDb, backup)).toThrow();
    const check = targetDb.prepare('SELECT COUNT(*) as count FROM meeting').get() as { count: number };
    expect(check.count).toBe(0);
  });
});

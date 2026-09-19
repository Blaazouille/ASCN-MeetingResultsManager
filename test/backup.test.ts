import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createMeeting, initDatabase } from '../src/lib/db';
import {
  exportDatabase,
  validateBackup,
  restoreDatabase,
} from '../src/lib/backup';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  initDatabase(db);
  return db;
}

function seedDb(db: Database.Database): void {
  const meeting = createMeeting(db, { name: 'Test Meeting', date: '2026-09-01', location: 'Pool' });
  db.prepare(
    `INSERT INTO swimmer_result (meeting_id, category, rank, lastname, firstname, birthyear, nation, club, points)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(meeting.id, 'Classement Mixte', 1, 'DUPONT', 'Jean', 1990, 'FRA', 'CN TEST', 800);
  db.prepare(
    `INSERT INTO swimmer_result (meeting_id, category, rank, lastname, firstname, birthyear, nation, club, points)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(meeting.id, 'Classement Mixte', 2, 'MARTIN', 'Marie', 1995, 'FRA', 'CN TEST', 750);
}

describe('exportDatabase', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
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

  it('exports meeting with its swimmers', () => {
    const backup = exportDatabase(db);
    const meeting = backup.meetings[0]!;
    expect(meeting.name).toBe('Test Meeting');
    expect(meeting.swimmers).toHaveLength(2);
    expect(meeting.swimmers[0]!.lastname).toBe('DUPONT');
  });

  it('exports an empty database as empty meetings array', () => {
    const emptyDb = createTestDb();
    const backup = exportDatabase(emptyDb);
    expect(backup.meetings).toHaveLength(0);
    emptyDb.close();
  });
});

describe('validateBackup', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
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
});

describe('restoreDatabase', () => {
  let sourceDb: Database.Database;
  let targetDb: Database.Database;

  beforeEach(() => {
    sourceDb = createTestDb();
    seedDb(sourceDb);
    targetDb = createTestDb();
  });

  afterEach(() => {
    sourceDb.close();
    targetDb.close();
  });

  it('imports meetings and swimmers into an empty database', () => {
    const backup = exportDatabase(sourceDb);
    const result = restoreDatabase(targetDb, backup);
    expect(result.meetingsImported).toBe(1);
    expect(result.meetingsSkipped).toBe(0);
    expect(result.swimmersImported).toBe(2);
  });

  it('skips meetings that already exist (same name + date)', () => {
    const backup = exportDatabase(sourceDb);
    restoreDatabase(targetDb, backup);
    const result = restoreDatabase(targetDb, backup);
    expect(result.meetingsImported).toBe(0);
    expect(result.meetingsSkipped).toBe(1);
  });

  it('round-trip preserves all data', () => {
    const backup = exportDatabase(sourceDb);
    restoreDatabase(targetDb, backup);
    const reExported = exportDatabase(targetDb);
    expect(reExported.meetings).toHaveLength(backup.meetings.length);
    expect(reExported.meetings[0]!.swimmers).toHaveLength(backup.meetings[0]!.swimmers.length);
    expect(reExported.meetings[0]!.name).toBe(backup.meetings[0]!.name);
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
    });
    expect(() => restoreDatabase(targetDb, backup)).toThrow();
    const check = targetDb.prepare('SELECT COUNT(*) as count FROM meeting').get() as { count: number };
    expect(check.count).toBe(0);
  });
});

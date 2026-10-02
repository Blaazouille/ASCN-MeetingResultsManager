import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDatabase } from '../src/lib/db-schema';
import { createMeeting, getAllMeetings, getSwimmerResults, insertSwimmerResults } from '../src/lib/db';

describe('schema migrations', () => {
  it('drops the legacy status column from an existing database without losing meetings', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'mrm-migration-'));
    const file = path.join(dir, 'legacy.db');
    const legacy = new Database(file);
    legacy.exec(`
      CREATE TABLE meeting (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'provisional' CHECK(status IN ('provisional', 'final')),
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
        default_top_n INTEGER NOT NULL DEFAULT 5,
        min_swimmers INTEGER NOT NULL DEFAULT 0,
        active_categories TEXT
      );
      INSERT INTO meeting (name, status) VALUES ('Meeting 2025', 'final');
    `);
    legacy.pragma('user_version = 3');
    legacy.close();

    const db = createDatabase(file);
    try {
      const columns = (db.prepare('PRAGMA table_info(meeting)').all() as Array<{ name: string }>).map((c) => c.name);
      expect(columns).not.toContain('status');
      expect(getAllMeetings(db).map((m) => m.name)).toEqual(['Meeting 2025']);
      expect(createMeeting(db, { name: 'Meeting 2026' }).name).toBe('Meeting 2026');
    } finally {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('adds last_imported_at (NULL) to a v4 database without losing meetings', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'mrm-migration-'));
    const file = path.join(dir, 'v4.db');
    const legacy = new Database(file);
    legacy.exec(`
      CREATE TABLE meeting (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
        default_top_n INTEGER NOT NULL DEFAULT 5,
        min_swimmers INTEGER NOT NULL DEFAULT 0,
        active_categories TEXT
      );
      INSERT INTO meeting (name) VALUES ('Meeting 2025');
    `);
    legacy.pragma('user_version = 4');
    legacy.close();

    const db = createDatabase(file);
    try {
      expect(db.pragma('user_version', { simple: true })).toBe(8);
      const meetings = getAllMeetings(db);
      expect(meetings.map((m) => m.name)).toEqual(['Meeting 2025']);
      expect(meetings[0]?.lastImportedAt).toBeNull();
    } finally {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('is a no-op when a v4 database already has last_imported_at', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'mrm-migration-'));
    const file = path.join(dir, 'v4-with-column.db');
    const legacy = new Database(file);
    legacy.exec(`
      CREATE TABLE meeting (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
        default_top_n INTEGER NOT NULL DEFAULT 5,
        min_swimmers INTEGER NOT NULL DEFAULT 0,
        active_categories TEXT,
        last_imported_at TEXT
      );
      INSERT INTO meeting (name, last_imported_at) VALUES ('Meeting 2025', '2026-09-27 12:30:00');
    `);
    legacy.pragma('user_version = 4');
    legacy.close();

    let db: ReturnType<typeof createDatabase> | undefined;
    try {
      db = createDatabase(file);
      expect(db.pragma('user_version', { simple: true })).toBe(8);
      expect(getAllMeetings(db)[0]?.lastImportedAt).toBe('2026-09-27 12:30:00');
    } finally {
      db?.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('gives a fresh database the last_imported_at column at version 8', () => {
    const db = createDatabase(':memory:');
    expect(db.pragma('user_version', { simple: true })).toBe(8);
    expect(createMeeting(db, { name: 'Neuf' }).lastImportedAt).toBeNull();
  });

  it('adds the import_snapshot table to a v5 database, keeping its meetings', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'mrm-migration-'));
    const file = path.join(dir, 'v5.db');
    const legacy = new Database(file);
    legacy.exec(`
      CREATE TABLE meeting (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
        default_top_n INTEGER NOT NULL DEFAULT 5,
        min_swimmers INTEGER NOT NULL DEFAULT 0,
        active_categories TEXT,
        last_imported_at TEXT
      );
      INSERT INTO meeting (name) VALUES ('Meeting 2025');
    `);
    legacy.pragma('user_version = 5');
    legacy.close();

    const db = createDatabase(file);
    try {
      expect(db.pragma('user_version', { simple: true })).toBe(8);
      expect(db.prepare('SELECT COUNT(*) AS n FROM import_snapshot').get()).toEqual({ n: 0 });
      expect(getAllMeetings(db).map((m) => m.name)).toEqual(['Meeting 2025']);
    } finally {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('drops the unused team_ranking table from a v6 database, keeping meetings and swimmers', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'mrm-migration-'));
    const file = path.join(dir, 'v6.db');
    // A real v6 database: the current schema plus the team_ranking table it still had.
    const seeded = createDatabase(file);
    seeded.exec(`
      CREATE TABLE team_ranking (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        meeting_id  INTEGER NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
        category    TEXT NOT NULL,
        club        TEXT NOT NULL,
        rank        INTEGER NOT NULL,
        total_pts   REAL NOT NULL,
        top_n       INTEGER NOT NULL,
        swimmers    TEXT NOT NULL,
        computed_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(meeting_id, category, club)
      );
      CREATE INDEX idx_ranking_meeting ON team_ranking(meeting_id);
    `);
    const meeting = createMeeting(seeded, { name: 'Meeting 2025' });
    insertSwimmerResults(seeded, meeting.id, [
      { name: 'Classement Mixte', place: 1, lastname: 'DUPONT', firstname: 'Jean', birthyear: 1990, nation: 'FRA', club: 'CN TEST', points: 800, comment: '' },
    ]);
    seeded
      .prepare('INSERT INTO team_ranking (meeting_id, category, club, rank, total_pts, top_n, swimmers) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(meeting.id, 'Classement Mixte', 'CN TEST', 1, 800, 5, '[]');
    seeded.pragma('user_version = 6');
    seeded.close();

    const db = createDatabase(file);
    try {
      expect(db.pragma('user_version', { simple: true })).toBe(8);
      expect(tableNames(db)).not.toContain('team_ranking');
      expect(getAllMeetings(db).map((m) => m.name)).toEqual(['Meeting 2025']);
      expect(getSwimmerResults(db, meeting.id)).toHaveLength(1);
    } finally {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('creates no team_ranking table in a fresh database', () => {
    const db = createDatabase(':memory:');
    expect(tableNames(db)).not.toContain('team_ranking');
  });

  it('adds is_demo to a v7 database, every existing meeting staying a real one', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'mrm-migration-'));
    const file = path.join(dir, 'v7.db');
    const legacy = new Database(file);
    legacy.exec(`
      CREATE TABLE meeting (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
        default_top_n INTEGER NOT NULL DEFAULT 5,
        min_swimmers INTEGER NOT NULL DEFAULT 0,
        active_categories TEXT,
        last_imported_at TEXT
      );
      INSERT INTO meeting (name) VALUES ('Entraînement');
    `);
    legacy.pragma('user_version = 7');
    legacy.close();

    const db = createDatabase(file);
    try {
      expect(db.pragma('user_version', { simple: true })).toBe(8);
      // Even a real meeting named "Entraînement" is not mistaken for the training one.
      expect(getAllMeetings(db).map((m) => [m.name, m.isDemo])).toEqual([['Entraînement', false]]);
    } finally {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('is a no-op when a v7 database already has is_demo', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'mrm-migration-'));
    const file = path.join(dir, 'v7-with-column.db');
    const seeded = createDatabase(file);
    createMeeting(seeded, { name: 'Meeting 2025' });
    seeded.exec("UPDATE meeting SET is_demo = 1");
    seeded.pragma('user_version = 7');
    seeded.close();

    let db: ReturnType<typeof createDatabase> | undefined;
    try {
      db = createDatabase(file);
      expect(db.pragma('user_version', { simple: true })).toBe(8);
      expect(getAllMeetings(db)[0]?.isDemo).toBe(true);
    } finally {
      db?.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('creates new meetings as real (not training) meetings', () => {
    const db = createDatabase(':memory:');
    expect(createMeeting(db, { name: 'Meeting 2026' }).isDemo).toBe(false);
  });
});

function tableNames(db: Database.Database): string[] {
  return (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((t) => t.name);
}

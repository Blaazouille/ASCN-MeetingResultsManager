import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDatabase } from '../src/lib/db-schema';
import { createMeeting, getAllMeetings } from '../src/lib/db';

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
      expect(db.pragma('user_version', { simple: true })).toBe(5);
      const meetings = getAllMeetings(db);
      expect(meetings.map((m) => m.name)).toEqual(['Meeting 2025']);
      expect(meetings[0]?.lastImportedAt).toBeNull();
    } finally {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('gives a fresh database the last_imported_at column at version 5', () => {
    const db = createDatabase(':memory:');
    expect(db.pragma('user_version', { simple: true })).toBe(5);
    expect(createMeeting(db, { name: 'Neuf' }).lastImportedAt).toBeNull();
  });
});

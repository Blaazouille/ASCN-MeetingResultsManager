/**
 * Responsabilité : définit le schéma SQLite et les migrations (PRAGMA user_version).
 * Appelé par : electron/main.ts, les tests (createDatabase).
 * Suppression casserait : l'ouverture et la mise à jour de la base de données.
 */
import Database from 'better-sqlite3';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS meeting (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS swimmer_result (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id  INTEGER NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  rank        INTEGER,
  lastname    TEXT NOT NULL,
  firstname   TEXT NOT NULL,
  birthyear   INTEGER,
  nation      TEXT DEFAULT 'FRA',
  club        TEXT NOT NULL,
  points      REAL NOT NULL,
  raw_line    TEXT,
  UNIQUE(meeting_id, category, lastname, firstname, birthyear, club)
);

CREATE INDEX IF NOT EXISTS idx_swimmer_meeting ON swimmer_result(meeting_id);
CREATE INDEX IF NOT EXISTS idx_swimmer_category ON swimmer_result(meeting_id, category);
`;

/** Initializes the schema on an existing Database instance (used for :memory: test databases). */
function initDatabase(db: Database.Database): void {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);
  migrateSchema(db);
}

/** Opens (creating if needed) the SQLite database at `filePath` and ensures the schema exists. Pass ':memory:' in tests. */
export function createDatabase(filePath: string): Database.Database {
  const db = new Database(filePath);
  initDatabase(db);
  return db;
}

/**
 * Schema migrations, gated on `PRAGMA user_version`. A fresh (or `:memory:`)
 * database starts at version 0 and runs every migration in order; an
 * existing on-disk database only runs the ones it hasn't seen yet.
 */
function migrateSchema(db: Database.Database): void {
  const version = db.pragma('user_version', { simple: true }) as number;
  if (version < 2) {
    db.exec(`
      ALTER TABLE meeting ADD COLUMN default_top_n INTEGER NOT NULL DEFAULT 5;
      ALTER TABLE meeting ADD COLUMN min_swimmers INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE meeting ADD COLUMN active_categories TEXT;
    `);
    db.pragma('user_version = 2');
  }
  if (version < 3) {
    // date/location never fed the ranking algorithm or anything else
    // functional — they were purely descriptive fields nobody used. Dropping
    // them here (rather than just no longer writing to them) so the schema
    // stops implying they matter. A fresh database created from SCHEMA_SQL
    // above never had these columns, so check before dropping — DROP COLUMN
    // on a column that doesn't exist errors.
    const columns = db.prepare('PRAGMA table_info(meeting)').all() as Array<{ name: string }>;
    if (columns.some((c) => c.name === 'date')) {
      db.exec('ALTER TABLE meeting DROP COLUMN date');
    }
    if (columns.some((c) => c.name === 'location')) {
      db.exec('ALTER TABLE meeting DROP COLUMN location');
    }
    db.pragma('user_version = 3');
  }
  if (version < 4) {
    // The provisional/final status was never used by the club: removed so the
    // schema stops carrying it. Same existence check as v3 — a fresh database
    // built from SCHEMA_SQL never had the column, and DROP COLUMN errors on a
    // missing one.
    const columns = db.prepare('PRAGMA table_info(meeting)').all() as Array<{ name: string }>;
    if (columns.some((c) => c.name === 'status')) {
      db.exec('ALTER TABLE meeting DROP COLUMN status');
    }
    db.pragma('user_version = 4');
  }
  if (version < 5) {
    // When the CSV was last imported. updated_at can't serve: it also moves on a
    // rename or a top-N change. NULL = never imported (existing meetings stay
    // NULL until their next import — updated_at would be a wrong backfill).
    // Same existence check as v3/v4, so a database that already has the column
    // is a no-op rather than a "duplicate column" error.
    const columns = db.prepare('PRAGMA table_info(meeting)').all() as Array<{ name: string }>;
    if (!columns.some((c) => c.name === 'last_imported_at')) {
      db.exec('ALTER TABLE meeting ADD COLUMN last_imported_at TEXT');
    }
    db.pragma('user_version = 5');
  }
  if (version < 6) {
    // Rows as they were before the latest import, to show what a re-import
    // changed. One row per meeting (older snapshots add nothing the screens
    // use); the cascade removes it with its meeting. Deliberately left out of
    // BackupData: a restore starts with no "previous import" to compare with.
    db.exec(`
      CREATE TABLE IF NOT EXISTS import_snapshot (
        meeting_id  INTEGER PRIMARY KEY REFERENCES meeting(id) ON DELETE CASCADE,
        imported_at TEXT,
        rows        TEXT NOT NULL
      )
    `);
    db.pragma('user_version = 6');
  }
  if (version < 7) {
    // team_ranking held rankings persisted by the ranking:compute IPC channel,
    // which no screen ever called (issue #31): every screen recomputes from
    // swimmer_result, so the table only ever held stale or no data. Dropped
    // rather than left empty so the schema stops implying rankings are stored.
    // IF EXISTS: a fresh database built from SCHEMA_SQL never has it. Its index
    // (idx_ranking_meeting) goes with it.
    db.exec('DROP TABLE IF EXISTS team_ranking');
    db.pragma('user_version = 7');
  }
}

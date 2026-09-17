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
  date        TEXT NOT NULL,
  location    TEXT,
  status      TEXT NOT NULL DEFAULT 'provisional' CHECK(status IN ('provisional', 'final')),
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

CREATE TABLE IF NOT EXISTS team_ranking (
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

CREATE INDEX IF NOT EXISTS idx_swimmer_meeting ON swimmer_result(meeting_id);
CREATE INDEX IF NOT EXISTS idx_swimmer_category ON swimmer_result(meeting_id, category);
CREATE INDEX IF NOT EXISTS idx_ranking_meeting ON team_ranking(meeting_id);
`;

/** Opens (creating if needed) the SQLite database at `filePath` and ensures the schema exists. Pass ':memory:' in tests. */
export function createDatabase(filePath: string): Database.Database {
  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);
  migrateSchema(db);
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
}

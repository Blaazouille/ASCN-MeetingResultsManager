import Database from 'better-sqlite3';

export type MeetingStatus = 'provisional' | 'final';

export interface Meeting {
  id: number;
  name: string;
  date: string;
  location: string | null;
  status: MeetingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingInput {
  name: string;
  date: string;
  location?: string | null;
  status?: MeetingStatus;
}

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
  UNIQUE(meeting_id, category, lastname, firstname)
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
  return db;
}

interface MeetingRow {
  id: number;
  name: string;
  date: string;
  location: string | null;
  status: MeetingStatus;
  created_at: string;
  updated_at: string;
}

function rowToMeeting(row: MeetingRow): Meeting {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    location: row.location,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAllMeetings(db: Database.Database): Meeting[] {
  const rows = db.prepare('SELECT * FROM meeting ORDER BY date DESC, id DESC').all() as MeetingRow[];
  return rows.map(rowToMeeting);
}

export function createMeeting(db: Database.Database, input: MeetingInput): Meeting {
  const result = db
    .prepare('INSERT INTO meeting (name, date, location, status) VALUES (?, ?, ?, ?)')
    .run(input.name, input.date, input.location ?? null, input.status ?? 'provisional');
  const row = db.prepare('SELECT * FROM meeting WHERE id = ?').get(result.lastInsertRowid) as MeetingRow;
  return rowToMeeting(row);
}

export function updateMeeting(db: Database.Database, id: number, input: Partial<MeetingInput>): Meeting {
  const current = db.prepare('SELECT * FROM meeting WHERE id = ?').get(id) as MeetingRow | undefined;
  if (!current) {
    throw new Error(`Meeting ${id} not found`);
  }
  const merged = {
    name: input.name ?? current.name,
    date: input.date ?? current.date,
    location: input.location !== undefined ? input.location : current.location,
    status: input.status ?? current.status,
  };
  db.prepare(
    `UPDATE meeting SET name = ?, date = ?, location = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(merged.name, merged.date, merged.location, merged.status, id);
  const row = db.prepare('SELECT * FROM meeting WHERE id = ?').get(id) as MeetingRow;
  return rowToMeeting(row);
}

export function deleteMeeting(db: Database.Database, id: number): void {
  db.prepare('DELETE FROM meeting WHERE id = ?').run(id);
}

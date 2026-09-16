import Database from 'better-sqlite3';
import type { RawSwimmerRow } from './csv-parser';
import type { TeamResult } from './ranking-engine';

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
  db.pragma('user_version = 1');
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

interface SwimmerResultRow {
  category: string;
  rank: number | null;
  lastname: string;
  firstname: string;
  birthyear: number | null;
  nation: string | null;
  club: string;
  points: number;
  raw_line: string | null;
}

function rowToRawSwimmerRow(row: SwimmerResultRow): RawSwimmerRow {
  return {
    name: row.category,
    place: row.rank ?? 0,
    lastname: row.lastname,
    firstname: row.firstname,
    birthyear: row.birthyear ?? 0,
    nation: row.nation ?? '',
    club: row.club,
    points: row.points,
    comment: row.raw_line ?? '',
  };
}

function swimmerKey(row: { category: string; lastname: string; firstname: string; birthyear: number | null; club: string }): string {
  return `${row.category}|${row.lastname}|${row.firstname}|${row.birthyear}|${row.club}`;
}

/**
 * Bulk-inserts swimmer rows for a meeting. Re-importing the same file (or a
 * corrected export) updates the existing row for each (category, lastname,
 * firstname, birthyear, club) instead of duplicating it, so importing twice
 * is safe. Also removes swimmers that were persisted by a previous import
 * but are absent from this one (e.g. a corrected FFN export dropping a
 * withdrawn swimmer) — scoped to the categories present in `rows`, so a
 * partial re-import never touches categories it didn't mention.
 */
export function insertSwimmerResults(db: Database.Database, meetingId: number, rows: RawSwimmerRow[]): void {
  const stmt = db.prepare(`
    INSERT INTO swimmer_result (meeting_id, category, rank, lastname, firstname, birthyear, nation, club, points, raw_line)
    VALUES (@meetingId, @category, @rank, @lastname, @firstname, @birthyear, @nation, @club, @points, @rawLine)
    ON CONFLICT(meeting_id, category, lastname, firstname, birthyear, club)
    DO UPDATE SET rank = excluded.rank, nation = excluded.nation,
      points = excluded.points, raw_line = excluded.raw_line
  `);
  const selectByCategory = db.prepare(
    'SELECT id, category, lastname, firstname, birthyear, club FROM swimmer_result WHERE meeting_id = ? AND category = ?'
  );
  const deleteById = db.prepare('DELETE FROM swimmer_result WHERE id = ?');

  const insertAll = db.transaction((rowsToInsert: RawSwimmerRow[]) => {
    for (const row of rowsToInsert) {
      stmt.run({
        meetingId,
        category: row.name,
        rank: row.place,
        lastname: row.lastname,
        firstname: row.firstname,
        birthyear: row.birthyear,
        nation: row.nation,
        club: row.club,
        points: row.points,
        rawLine: row.comment || null,
      });
    }

    const rowsByCategory = new Map<string, RawSwimmerRow[]>();
    for (const row of rowsToInsert) {
      const list = rowsByCategory.get(row.name);
      if (list) {
        list.push(row);
      } else {
        rowsByCategory.set(row.name, [row]);
      }
    }

    for (const [category, categoryRows] of rowsByCategory) {
      const incomingKeys = new Set(
        categoryRows.map((row) =>
          swimmerKey({ category, lastname: row.lastname, firstname: row.firstname, birthyear: row.birthyear, club: row.club })
        )
      );
      const existing = selectByCategory.all(meetingId, category) as {
        id: number;
        category: string;
        lastname: string;
        firstname: string;
        birthyear: number | null;
        club: string;
      }[];
      for (const existingRow of existing) {
        if (!incomingKeys.has(swimmerKey(existingRow))) {
          deleteById.run(existingRow.id);
        }
      }
    }
  });
  insertAll(rows);
}

export function getSwimmerResults(db: Database.Database, meetingId: number, category?: string): RawSwimmerRow[] {
  const rows = category
    ? (db
        .prepare('SELECT * FROM swimmer_result WHERE meeting_id = ? AND category = ? ORDER BY rank')
        .all(meetingId, category) as SwimmerResultRow[])
    : (db
        .prepare('SELECT * FROM swimmer_result WHERE meeting_id = ? ORDER BY category, rank')
        .all(meetingId) as SwimmerResultRow[]);
  return rows.map(rowToRawSwimmerRow);
}

/** Replaces the stored ranking for (meetingId, category) with the freshly computed one. */
export function saveTeamRanking(
  db: Database.Database,
  meetingId: number,
  category: string,
  topN: number,
  results: TeamResult[]
): void {
  const del = db.prepare('DELETE FROM team_ranking WHERE meeting_id = ? AND category = ?');
  const stmt = db.prepare(`
    INSERT INTO team_ranking (meeting_id, category, club, rank, total_pts, top_n, swimmers)
    VALUES (@meetingId, @category, @club, @rank, @totalPts, @topN, @swimmers)
  `);
  const saveAll = db.transaction((teams: TeamResult[]) => {
    del.run(meetingId, category);
    for (const team of teams) {
      stmt.run({
        meetingId,
        category,
        club: team.club,
        rank: team.rank,
        totalPts: team.totalPoints,
        topN,
        swimmers: JSON.stringify(team.swimmers),
      });
    }
  });
  saveAll(results);
}

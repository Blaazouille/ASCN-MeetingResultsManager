/**
 * Responsabilité : opérations CRUD SQLite (meetings, swimmer_result, team_ranking).
 * Appelé par : electron/ipc-handlers.ts (main process uniquement).
 * Suppression casserait : toute la persistance de données.
 */
import type Database from 'better-sqlite3';
import type { RawSwimmerRow } from './csv-parser';
import type { TeamResult } from './ranking-engine';

export type MeetingStatus = 'provisional' | 'final';

export interface Meeting {
  id: number;
  name: string;
  status: MeetingStatus;
  createdAt: string;
  updatedAt: string;
  defaultTopN: number;
  minSwimmers: number;
  activeCategories: string[] | null;
}

export interface MeetingInput {
  name: string;
  status?: MeetingStatus;
  defaultTopN?: number;
  minSwimmers?: number;
  activeCategories?: string[] | null;
}

interface MeetingRow {
  id: number;
  name: string;
  status: MeetingStatus;
  created_at: string;
  updated_at: string;
  default_top_n: number;
  min_swimmers: number;
  active_categories: string | null;
}

function rowToMeeting(row: MeetingRow): Meeting {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    defaultTopN: row.default_top_n,
    minSwimmers: row.min_swimmers,
    activeCategories: row.active_categories ? (JSON.parse(row.active_categories) as string[]) : null,
  };
}

export function getAllMeetings(db: Database.Database): Meeting[] {
  const rows = db.prepare('SELECT * FROM meeting ORDER BY id DESC').all() as MeetingRow[];
  return rows.map(rowToMeeting);
}

export function createMeeting(db: Database.Database, input: MeetingInput): Meeting {
  const result = db
    .prepare(
      `INSERT INTO meeting (name, status, default_top_n, min_swimmers, active_categories)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      input.name,
      input.status ?? 'provisional',
      input.defaultTopN ?? 5,
      input.minSwimmers ?? 0,
      input.activeCategories ? JSON.stringify(input.activeCategories) : null
    );
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
    status: input.status ?? current.status,
    defaultTopN: input.defaultTopN ?? current.default_top_n,
    minSwimmers: input.minSwimmers ?? current.min_swimmers,
    activeCategories:
      input.activeCategories !== undefined
        ? input.activeCategories
          ? JSON.stringify(input.activeCategories)
          : null
        : current.active_categories,
  };
  db.prepare(
    `UPDATE meeting
     SET name = ?, status = ?, default_top_n = ?, min_swimmers = ?, active_categories = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(merged.name, merged.status, merged.defaultTopN, merged.minSwimmers, merged.activeCategories, id);
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

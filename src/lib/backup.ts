/**
 * Responsabilité : export / import complet de la base de données en JSON.
 * Appelé par : electron/ipc-handlers.ts (export/import), electron/auto-backup.ts, tests.
 * Suppression casserait : la fonctionnalité de sauvegarde et restauration.
 */
import type Database from 'better-sqlite3';

export interface BackupData {
  version: 1;
  appName: string;
  exportedAt: string;
  meetings: MeetingBackup[];
}

export interface MeetingBackup {
  name: string;
  date: string;
  location: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  defaultTopN: number;
  minSwimmers: number;
  activeCategories: string[] | null;
  swimmers: SwimmerBackup[];
  teamRankings: TeamRankingBackup[];
}

export interface SwimmerBackup {
  category: string;
  rank: number | null;
  lastname: string;
  firstname: string;
  birthyear: number | null;
  nation: string | null;
  club: string;
  points: number;
  rawLine: string | null;
}

export interface TeamRankingBackup {
  category: string;
  club: string;
  rank: number;
  totalPoints: number;
  topN: number;
  swimmers: string;
  computedAt: string;
}

export interface RestoreResult {
  meetingsImported: number;
  meetingsSkipped: number;
  swimmersImported: number;
}

interface MeetingRow {
  id: number;
  name: string;
  date: string;
  location: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  default_top_n: number;
  min_swimmers: number;
  active_categories: string | null;
}

interface SwimmerRow {
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

interface TeamRankingRow {
  category: string;
  club: string;
  rank: number;
  total_pts: number;
  top_n: number;
  swimmers: string;
  computed_at: string;
}

export function exportDatabase(db: Database.Database): BackupData {
  const meetings = db.prepare('SELECT * FROM meeting ORDER BY id').all() as MeetingRow[];

  const meetingBackups: MeetingBackup[] = meetings.map((m) => {
    const swimmers = db
      .prepare(
        'SELECT category, rank, lastname, firstname, birthyear, nation, club, points, raw_line FROM swimmer_result WHERE meeting_id = ? ORDER BY id'
      )
      .all(m.id) as SwimmerRow[];

    const rankings = db
      .prepare(
        'SELECT category, club, rank, total_pts, top_n, swimmers, computed_at FROM team_ranking WHERE meeting_id = ? ORDER BY id'
      )
      .all(m.id) as TeamRankingRow[];

    return {
      name: m.name,
      date: m.date,
      location: m.location,
      status: m.status,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      defaultTopN: m.default_top_n,
      minSwimmers: m.min_swimmers,
      activeCategories: m.active_categories ? (JSON.parse(m.active_categories) as string[]) : null,
      swimmers: swimmers.map((s) => ({
        category: s.category,
        rank: s.rank,
        lastname: s.lastname,
        firstname: s.firstname,
        birthyear: s.birthyear,
        nation: s.nation,
        club: s.club,
        points: s.points,
        rawLine: s.raw_line,
      })),
      teamRankings: rankings.map((r) => ({
        category: r.category,
        club: r.club,
        rank: r.rank,
        totalPoints: r.total_pts,
        topN: r.top_n,
        swimmers: r.swimmers,
        computedAt: r.computed_at,
      })),
    };
  });

  return {
    version: 1,
    appName: 'MDLM Ranking',
    exportedAt: new Date().toISOString(),
    meetings: meetingBackups,
  };
}

export function validateBackup(data: unknown): BackupData {
  if (data === null || typeof data !== 'object') {
    throw new Error('Format de backup invalide : objet attendu');
  }

  const obj = data as Record<string, unknown>;

  if (obj.version !== 1) {
    throw new Error(`Version de backup non supportée : ${String(obj.version ?? 'manquante')}`);
  }

  if (!Array.isArray(obj.meetings)) {
    throw new Error('Format de backup invalide : tableau "meetings" manquant');
  }

  for (const meeting of obj.meetings) {
    if (typeof meeting !== 'object' || meeting === null) {
      throw new Error('Format de backup invalide : meeting doit être un objet');
    }
    const m = meeting as Record<string, unknown>;
    if (typeof m.name !== 'string' || typeof m.date !== 'string') {
      throw new Error('Format de backup invalide : meeting.name et meeting.date requis');
    }
    if (!Array.isArray(m.swimmers)) {
      throw new Error('Format de backup invalide : meeting.swimmers doit être un tableau');
    }

    // Validate each swimmer entry
    for (const swimmer of m.swimmers) {
      if (typeof swimmer !== 'object' || swimmer === null) {
        throw new Error('Format de backup invalide : swimmer doit être un objet');
      }
      const s = swimmer as Record<string, unknown>;
      if (typeof s.lastname !== 'string') {
        throw new Error('Format de backup invalide : swimmer.lastname doit être une string');
      }
      if (typeof s.firstname !== 'string') {
        throw new Error('Format de backup invalide : swimmer.firstname doit être une string');
      }
      if (typeof s.club !== 'string') {
        throw new Error('Format de backup invalide : swimmer.club doit être une string');
      }
      if (typeof s.points !== 'number') {
        throw new Error('Format de backup invalide : swimmer.points doit être un nombre');
      }
    }

    // Validate teamRankings if present
    if (m.teamRankings !== undefined) {
      if (!Array.isArray(m.teamRankings)) {
        throw new Error('Format de backup invalide : meeting.teamRankings doit être un tableau');
      }
    }
  }

  return data as BackupData;
}

export function restoreDatabase(db: Database.Database, data: BackupData): RestoreResult {
  const result: RestoreResult = { meetingsImported: 0, meetingsSkipped: 0, swimmersImported: 0 };

  const transaction = db.transaction(() => {
    for (const meeting of data.meetings) {
      const existing = db
        .prepare('SELECT id FROM meeting WHERE name = ? AND date = ?')
        .get(meeting.name, meeting.date) as { id: number } | undefined;

      if (existing) {
        result.meetingsSkipped++;
        continue;
      }

      const insertMeeting = db.prepare(
        `INSERT INTO meeting (name, date, location, status, created_at, updated_at, default_top_n, min_swimmers, active_categories)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const row = insertMeeting.run(
        meeting.name,
        meeting.date,
        meeting.location,
        meeting.status,
        meeting.createdAt,
        meeting.updatedAt,
        meeting.defaultTopN,
        meeting.minSwimmers,
        meeting.activeCategories ? JSON.stringify(meeting.activeCategories) : null
      );
      const meetingId = row.lastInsertRowid;
      result.meetingsImported++;

      const insertSwimmer = db.prepare(
        `INSERT INTO swimmer_result (meeting_id, category, rank, lastname, firstname, birthyear, nation, club, points, raw_line)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      for (const s of meeting.swimmers) {
        insertSwimmer.run(meetingId, s.category, s.rank, s.lastname, s.firstname, s.birthyear, s.nation, s.club, s.points, s.rawLine);
        result.swimmersImported++;
      }

      if (meeting.teamRankings) {
        const insertRanking = db.prepare(
          `INSERT INTO team_ranking (meeting_id, category, club, rank, total_pts, top_n, swimmers, computed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        );
        for (const r of meeting.teamRankings) {
          insertRanking.run(meetingId, r.category, r.club, r.rank, r.totalPoints, r.topN, r.swimmers, r.computedAt);
        }
      }
    }
  });

  transaction();
  return result;
}

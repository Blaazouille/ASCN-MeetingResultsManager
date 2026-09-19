/**
 * Responsabilité : export / import complet de la base de données en JSON.
 * Appelé par : electron/ipc-handlers.ts (export/import), electron/auto-backup.ts, tests.
 * Suppression casserait : la fonctionnalité de sauvegarde et restauration.
 */
import type Database from 'better-sqlite3';
import { meetingExistsByNameAndDate } from './db';
import { validateBackup, type BackupData, type MeetingBackup, type RestoreResult } from './backup-validation';

// Re-exported so existing callers (ipc-handlers.ts, tests) can keep importing
// everything backup-related from this one module.
export { validateBackup };
export type { BackupData, MeetingBackup, SwimmerBackup, TeamRankingBackup, RestoreResult } from './backup-validation';

/**
 * Filename-safe timestamp for backup files, down to the second plus a short
 * random suffix. The suffix matters: two backups written within the same
 * UTC second (a manual export right after an auto-backup, or two imports in
 * quick succession) would otherwise share a filename and the second write
 * would silently overwrite the first.
 */
export function formatBackupTimestamp(): string {
  const iso = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${iso}-${suffix}`;
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

export interface RestoreOptions {
  /** When a meeting in the backup already exists (same name + date), delete
   * it (cascading to its swimmers/rankings) and re-insert the backup's
   * version instead of skipping it. Off by default — the safer, additive
   * behavior — so callers must opt in explicitly. */
  overwrite?: boolean;
}

export function restoreDatabase(db: Database.Database, data: BackupData, options: RestoreOptions = {}): RestoreResult {
  const overwrite = options.overwrite ?? false;
  const result: RestoreResult = { meetingsImported: 0, meetingsReplaced: 0, meetingsSkipped: 0, swimmersImported: 0 };

  const transaction = db.transaction(() => {
    for (const meeting of data.meetings) {
      const exists = meetingExistsByNameAndDate(db, meeting.name, meeting.date);
      if (exists && !overwrite) {
        result.meetingsSkipped++;
        continue;
      }
      if (exists) {
        // Cascades to swimmer_result/team_ranking via their ON DELETE CASCADE
        // foreign keys (db-schema.ts) — no separate cleanup needed here.
        db.prepare('DELETE FROM meeting WHERE name = ? AND date = ?').run(meeting.name, meeting.date);
        result.meetingsReplaced++;
      } else {
        result.meetingsImported++;
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

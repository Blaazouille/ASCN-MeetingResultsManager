/**
 * Responsabilité : export / import complet de la base de données en JSON.
 * Appelé par : electron/ipc-handlers.ts (export), electron/auto-backup.ts, electron/pre-restore-backup.ts (restauration), tests.
 * Suppression casserait : la fonctionnalité de sauvegarde et restauration.
 */
import type Database from 'better-sqlite3';
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
  created_at: string;
  updated_at: string;
  last_imported_at: string | null;
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

  // Prepared once and reused per meeting (via .all(m.id)) instead of inside
  // the .map() below — a backup with many meetings would otherwise recompile
  // the identical statement text once per meeting for no benefit.
  const selectSwimmers = db.prepare(
    'SELECT category, rank, lastname, firstname, birthyear, nation, club, points, raw_line FROM swimmer_result WHERE meeting_id = ? ORDER BY id'
  );
  const selectRankings = db.prepare(
    'SELECT category, club, rank, total_pts, top_n, swimmers, computed_at FROM team_ranking WHERE meeting_id = ? ORDER BY id'
  );

  const meetingBackups: MeetingBackup[] = meetings.map((m) => {
    const swimmers = selectSwimmers.all(m.id) as SwimmerRow[];
    const rankings = selectRankings.all(m.id) as TeamRankingRow[];

    return {
      name: m.name,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      lastImportedAt: m.last_imported_at,
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

/**
 * A backup is a snapshot: restoring one puts the database back exactly as it
 * was at export time, nothing more, nothing less. Every meeting currently in
 * the database is deleted first (cascading to its swimmers/rankings via the
 * ON DELETE CASCADE foreign keys in db-schema.ts) — including meetings the
 * backup file never mentions — and the backup's meetings are inserted fresh.
 * Whole operation runs in one transaction, so a failure partway through
 * leaves the pre-restore database untouched rather than half-wiped.
 */
export function restoreDatabase(db: Database.Database, data: BackupData): RestoreResult {
  const result: RestoreResult = { meetingsRemoved: 0, meetingsImported: 0, swimmersImported: 0 };

  // Prepared once outside the per-meeting loop below and reused via .run(),
  // instead of being recompiled on every iteration for identical SQL text.
  const insertMeeting = db.prepare(
    `INSERT INTO meeting (name, created_at, updated_at, last_imported_at, default_top_n, min_swimmers, active_categories)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  // ON CONFLICT mirrors insertSwimmerResults in db.ts: a freshly-restored
  // meeting never has real duplicates, but a hand-edited/corrupted backup
  // file could repeat a (category, lastname, firstname, birthyear, club)
  // key, and without this clause that would throw a raw, untranslated
  // SQLite UNIQUE-constraint error instead of the last entry simply winning.
  const insertSwimmer = db.prepare(
    `INSERT INTO swimmer_result (meeting_id, category, rank, lastname, firstname, birthyear, nation, club, points, raw_line)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(meeting_id, category, lastname, firstname, birthyear, club)
     DO UPDATE SET rank = excluded.rank, nation = excluded.nation,
       points = excluded.points, raw_line = excluded.raw_line`
  );
  const insertRanking = db.prepare(
    `INSERT INTO team_ranking (meeting_id, category, club, rank, total_pts, top_n, swimmers, computed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(meeting_id, category, club)
     DO UPDATE SET rank = excluded.rank, total_pts = excluded.total_pts,
       top_n = excluded.top_n, swimmers = excluded.swimmers, computed_at = excluded.computed_at`
  );

  const transaction = db.transaction(() => {
    result.meetingsRemoved = (db.prepare('SELECT COUNT(*) as count FROM meeting').get() as { count: number }).count;
    db.exec('DELETE FROM meeting');

    for (const meeting of data.meetings) {
      result.meetingsImported++;

      const row = insertMeeting.run(
        meeting.name,
        meeting.createdAt,
        meeting.updatedAt,
        // `?? null`: better-sqlite3 refuses `undefined`, and older backups omit the field.
        meeting.lastImportedAt ?? null,
        meeting.defaultTopN,
        meeting.minSwimmers,
        meeting.activeCategories ? JSON.stringify(meeting.activeCategories) : null
      );
      const meetingId = row.lastInsertRowid;

      for (const s of meeting.swimmers) {
        insertSwimmer.run(meetingId, s.category, s.rank, s.lastname, s.firstname, s.birthyear, s.nation, s.club, s.points, s.rawLine);
        result.swimmersImported++;
      }

      for (const r of meeting.teamRankings) {
        insertRanking.run(meetingId, r.category, r.club, r.rank, r.totalPoints, r.topN, r.swimmers, r.computedAt);
      }
    }
  });

  transaction();
  return result;
}

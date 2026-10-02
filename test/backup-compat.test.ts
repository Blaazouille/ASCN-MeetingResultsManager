/**
 * Responsabilité : vérifie la compatibilité des sauvegardes JSON avec le champ
 * hérité `teamRankings` (classements stockés jusqu'à l'issue #31), dans les deux sens.
 * Appelé par : Vitest.
 * Suppression casserait : le garde-fou empêchant qu'une ancienne sauvegarde ne se
 * restaure plus, ou qu'une ancienne version de l'app refuse une sauvegarde récente.
 */
import { describe, expect, it } from 'vitest';
import type Database from 'better-sqlite3';
import { createDatabase } from '../src/lib/db-schema';
import { createMeeting, getAllMeetings, getSwimmerResults, insertSwimmerResults } from '../src/lib/db';
import { exportDatabase, validateBackup, restoreDatabase } from '../src/lib/backup';
import { computeTeamRanking } from '../src/lib/ranking-engine';

function seededDb(): Database.Database {
  const db = createDatabase(':memory:');
  const meeting = createMeeting(db, { name: 'Test Meeting' });
  insertSwimmerResults(db, meeting.id, [
    { name: 'Classement Mixte', place: 1, lastname: 'DUPONT', firstname: 'Jean', birthyear: 1990, nation: 'FRA', club: 'CN TEST', points: 800, comment: '' },
    { name: 'Classement Mixte', place: 2, lastname: 'MARTIN', firstname: 'Marie', birthyear: 1995, nation: 'FRA', club: 'CN TEST', points: 750, comment: '' },
  ]);
  return db;
}

/** A backup as written to disk, i.e. plain JSON with no TypeScript shape. */
function exportedJson(): { meetings: Array<Record<string, unknown>> } {
  return JSON.parse(JSON.stringify(exportDatabase(seededDb()))) as { meetings: Array<Record<string, unknown>> };
}

describe('backup compatibility with the legacy teamRankings field', () => {
  it('still writes an empty teamRankings array, which older app versions require to restore', () => {
    expect(exportedJson().meetings[0]!.teamRankings).toEqual([]);
  });

  it('accepts a backup with no teamRankings field', () => {
    const backup = exportedJson();
    delete backup.meetings[0]!.teamRankings;
    expect(() => validateBackup(backup)).not.toThrow();
  });

  it('restores an old backup that still carries stored team rankings, ignoring them', () => {
    const legacy = exportedJson();
    // Exact shape written by versions that still stored rankings.
    legacy.meetings[0]!.teamRankings = [
      {
        category: 'Classement Mixte',
        club: 'CN TEST',
        rank: 1,
        totalPoints: 1550,
        topN: 5,
        swimmers: JSON.stringify(['DUPONT Jean', 'MARTIN Marie']),
        computedAt: '2026-09-27 12:30:00',
      },
    ];
    const target = createDatabase(':memory:');

    const result = restoreDatabase(target, validateBackup(legacy));

    expect(result).toEqual({ meetingsRemoved: 0, meetingsImported: 1, swimmersImported: 2 });
    const [meeting] = getAllMeetings(target);
    expect(meeting!.name).toBe('Test Meeting');
    // The ranking is rebuilt from the restored swimmers, as every screen does.
    const ranking = computeTeamRanking(getSwimmerResults(target, meeting!.id), { category: 'Classement Mixte', topN: 5 });
    expect(ranking.map((t) => [t.club, t.totalPoints])).toEqual([['CN TEST', 1550]]);
  });
});

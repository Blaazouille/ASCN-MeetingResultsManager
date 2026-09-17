import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { computeTeamRanking, type TeamResult } from '../src/lib/ranking-engine';
import { parseCsv } from '../src/lib/csv-parser';
import {
  createDatabase,
  createMeeting,
  deleteMeeting,
  getAllMeetings,
  getSwimmerResults,
  insertSwimmerResults,
  saveTeamRanking,
  updateMeeting,
} from '../src/lib/db';
import type { RawSwimmerRow } from '../src/lib/csv-parser';

const FIXTURE_DIR = path.join(__dirname, 'fixtures');

function freshDb() {
  return createDatabase(':memory:');
}

describe('meeting CRUD', () => {
  it('starts empty', () => {
    expect(getAllMeetings(freshDb())).toEqual([]);
  });

  it('creates a meeting with defaults', () => {
    const db = freshDb();
    const meeting = createMeeting(db, { name: 'Meeting de la Mer 2026', date: '2026-11-16' });

    expect(meeting.id).toBeGreaterThan(0);
    expect(meeting.name).toBe('Meeting de la Mer 2026');
    expect(meeting.date).toBe('2026-11-16');
    expect(meeting.location).toBeNull();
    expect(meeting.status).toBe('provisional');
    expect(meeting.createdAt).toBeTruthy();
    expect(meeting.updatedAt).toBeTruthy();
  });

  it('lists meetings most recent date first', () => {
    const db = freshDb();
    createMeeting(db, { name: 'Ancien', date: '2025-01-01' });
    createMeeting(db, { name: 'Récent', date: '2026-11-16' });

    const meetings = getAllMeetings(db);
    expect(meetings.map((m) => m.name)).toEqual(['Récent', 'Ancien']);
  });

  it('updates only the given fields', () => {
    const db = freshDb();
    const meeting = createMeeting(db, { name: 'Meeting de la Mer', date: '2026-11-16', location: 'Cherbourg' });

    const updated = updateMeeting(db, meeting.id, { status: 'final' });

    expect(updated.status).toBe('final');
    expect(updated.name).toBe('Meeting de la Mer');
    expect(updated.location).toBe('Cherbourg');
  });

  it('throws when updating a missing meeting', () => {
    const db = freshDb();
    expect(() => updateMeeting(db, 999, { status: 'final' })).toThrow('Meeting 999 not found');
  });

  it('deletes a meeting', () => {
    const db = freshDb();
    const meeting = createMeeting(db, { name: 'À supprimer', date: '2026-01-01' });

    deleteMeeting(db, meeting.id);

    expect(getAllMeetings(db)).toEqual([]);
  });

  it('creates a meeting with ranking-rule defaults', () => {
    const db = freshDb();
    const meeting = createMeeting(db, { name: 'Meeting de la Mer 2026', date: '2026-11-16' });

    expect(meeting.defaultTopN).toBe(5);
    expect(meeting.minSwimmers).toBe(0);
    expect(meeting.activeCategories).toBeNull();
  });

  it('creates a meeting with explicit ranking rules', () => {
    const db = freshDb();
    const meeting = createMeeting(db, {
      name: 'Test',
      date: '2026-01-01',
      defaultTopN: 7,
      minSwimmers: 3,
      activeCategories: ['Classement Mixte', 'Classement Dames'],
    });

    expect(meeting.defaultTopN).toBe(7);
    expect(meeting.minSwimmers).toBe(3);
    expect(meeting.activeCategories).toEqual(['Classement Mixte', 'Classement Dames']);
  });

  it('updates ranking rules independently of meeting info', () => {
    const db = freshDb();
    const meeting = createMeeting(db, { name: 'Test', date: '2026-01-01' });

    const updated = updateMeeting(db, meeting.id, {
      defaultTopN: 10,
      minSwimmers: 2,
      activeCategories: ['Classement Mixte'],
    });

    expect(updated.defaultTopN).toBe(10);
    expect(updated.minSwimmers).toBe(2);
    expect(updated.activeCategories).toEqual(['Classement Mixte']);
    expect(updated.name).toBe('Test');
  });

  it('round-trips activeCategories back to null', () => {
    const db = freshDb();
    const meeting = createMeeting(db, {
      name: 'Test',
      date: '2026-01-01',
      activeCategories: ['Classement Mixte'],
    });

    const updated = updateMeeting(db, meeting.id, { activeCategories: null });

    expect(updated.activeCategories).toBeNull();
  });

  it('runs the schema migration idempotently on repeated opens', () => {
    const db = freshDb();
    createMeeting(db, { name: 'Test', date: '2026-01-01' });
    expect(() => createDatabase(':memory:')).not.toThrow();
  });
});

function sampleRows(): RawSwimmerRow[] {
  return [
    { name: 'Classement Mixte', place: 1, lastname: 'DUPONT', firstname: 'Alice', birthyear: 2000, nation: 'FRA', club: 'AC CHERBOURG EN COTENTIN', points: 900, comment: '' },
    { name: 'Classement Mixte', place: 2, lastname: 'MARTIN', firstname: 'Bob', birthyear: 1999, nation: 'FRA', club: 'AC CHERBOURG EN COTENTIN', points: 850, comment: '' },
    { name: 'Classement Dames', place: 1, lastname: 'DUPONT', firstname: 'Alice', birthyear: 2000, nation: 'FRA', club: 'AC CHERBOURG EN COTENTIN', points: 900, comment: '' },
  ];
}

describe('swimmer results persistence', () => {
  it('round-trips inserted rows for a meeting', () => {
    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'Test', date: '2026-01-01' });

    insertSwimmerResults(db, meeting.id, sampleRows());

    const all = getSwimmerResults(db, meeting.id);
    expect(all).toHaveLength(3);

    const mixte = getSwimmerResults(db, meeting.id, 'Classement Mixte');
    expect(mixte).toHaveLength(2);
    expect(mixte.map((r) => r.lastname)).toEqual(['DUPONT', 'MARTIN']);
  });

  it('re-importing the same swimmer updates rather than duplicates', () => {
    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'Test', date: '2026-01-01' });

    insertSwimmerResults(db, meeting.id, sampleRows());
    const updatedRows = sampleRows();
    updatedRows[0]!.points = 950;
    insertSwimmerResults(db, meeting.id, updatedRows);

    const all = getSwimmerResults(db, meeting.id);
    expect(all).toHaveLength(3);
    expect(all.find((r) => r.lastname === 'DUPONT' && r.name === 'Classement Mixte')?.points).toBe(950);
  });

  it('removes swimmers absent from a corrected re-import, scoped to the re-imported categories', () => {
    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'Test', date: '2026-01-01' });

    insertSwimmerResults(db, meeting.id, sampleRows());
    // Corrected export: MARTIN withdrew from Classement Mixte.
    const correctedRows = sampleRows().filter(
      (row) => !(row.name === 'Classement Mixte' && row.lastname === 'MARTIN')
    );
    insertSwimmerResults(db, meeting.id, correctedRows);

    const mixte = getSwimmerResults(db, meeting.id, 'Classement Mixte');
    expect(mixte.map((r) => r.lastname)).toEqual(['DUPONT']);
    // Classement Dames wasn't part of the re-import, so it's untouched.
    const dames = getSwimmerResults(db, meeting.id, 'Classement Dames');
    expect(dames).toHaveLength(1);
  });

  it('distinguishes two same-named, same-birthyear swimmers from different clubs', () => {
    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'Test', date: '2026-01-01' });

    insertSwimmerResults(db, meeting.id, [
      { name: 'Classement Mixte', place: 1, lastname: 'MARTIN', firstname: 'Paul', birthyear: 2001, nation: 'FRA', club: 'AC CHERBOURG EN COTENTIN', points: 900, comment: '' },
      { name: 'Classement Mixte', place: 2, lastname: 'MARTIN', firstname: 'Paul', birthyear: 2001, nation: 'FRA', club: 'CN VIRY-CHÂTILLON', points: 850, comment: '' },
    ]);

    const mixte = getSwimmerResults(db, meeting.id, 'Classement Mixte');
    expect(mixte).toHaveLength(2);
    expect(mixte.map((r) => r.club).sort()).toEqual(['AC CHERBOURG EN COTENTIN', 'CN VIRY-CHÂTILLON']);
  });

  it('scopes rows to their own meeting', () => {
    const db = createDatabase(':memory:');
    const meetingA = createMeeting(db, { name: 'A', date: '2026-01-01' });
    const meetingB = createMeeting(db, { name: 'B', date: '2026-01-02' });

    insertSwimmerResults(db, meetingA.id, sampleRows());

    expect(getSwimmerResults(db, meetingB.id)).toEqual([]);
  });
});

describe('team ranking persistence', () => {
  it('saves a computed ranking and replaces it on recompute', () => {
    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'Test', date: '2026-01-01' });
    insertSwimmerResults(db, meeting.id, sampleRows());

    const rows = getSwimmerResults(db, meeting.id, 'Classement Mixte');
    const results = computeTeamRanking(rows, { category: 'Classement Mixte', topN: 5 });

    expect(() => saveTeamRanking(db, meeting.id, 'Classement Mixte', 5, results)).not.toThrow();
    // Recomputing and saving again must not throw a UNIQUE constraint error.
    expect(() => saveTeamRanking(db, meeting.id, 'Classement Mixte', 5, results)).not.toThrow();
  });
});

/** Drops the `rank` field the engine adds to each swimmer entry, which the reference fixture doesn't include. */
function stripSwimmerRank(result: TeamResult) {
  return {
    ...result,
    swimmers: result.swimmers.map(({ lastname, firstname, birthyear, points }) => ({
      lastname,
      firstname,
      birthyear,
      points,
    })),
  };
}

describe('DB round-trip preserves the reference ranking (historique path)', () => {
  it('parsing → persisting → reloading → ranking the real fixture matches the freshly-parsed reference ranking', () => {
    const buffer = readFileSync(path.join(FIXTURE_DIR, 'sample.csv'));
    const parsed = parseCsv(new Uint8Array(buffer));
    const expected = JSON.parse(readFileSync(path.join(FIXTURE_DIR, 'expected-ranking.json'), 'utf-8'));

    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'Meeting de la Mer 2026', date: '2026-11-16' });

    insertSwimmerResults(db, meeting.id, parsed.rows);
    const reloadedRows = getSwimmerResults(db, meeting.id, 'Classement Mixte');
    const result = computeTeamRanking(reloadedRows, { category: 'Classement Mixte', topN: 5 });

    expect(result).toHaveLength(38);
    expect(result.map(stripSwimmerRank)).toEqual(expected);
  });
});

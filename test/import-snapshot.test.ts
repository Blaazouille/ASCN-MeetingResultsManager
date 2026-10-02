/**
 * Responsabilité : tests de l'instantané d'avant-import (import-snapshot.ts et son alimentation par insertSwimmerResults).
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de import-snapshot.ts.
 */
import { describe, expect, it } from 'vitest';
import type { RawSwimmerRow } from '../src/lib/csv-parser';
import { createDatabase } from '../src/lib/db-schema';
import { createMeeting, deleteMeeting, insertSwimmerResults } from '../src/lib/db';
import { getImportSnapshot } from '../src/lib/import-snapshot';

function row(lastname: string, points: number): RawSwimmerRow {
  return { name: 'Classement Mixte', place: 1, lastname, firstname: 'A', birthyear: 2000, nation: 'FRA', club: 'CLUB', points, comment: '' };
}

function setup(): { db: ReturnType<typeof createDatabase>; id: number } {
  const db = createDatabase(':memory:');
  return { db, id: createMeeting(db, { name: 'M' }).id };
}

describe('import snapshot', () => {
  it('is absent after the first import of a meeting', () => {
    const { db, id } = setup();
    insertSwimmerResults(db, id, [row('Un', 100)]);
    expect(getImportSnapshot(db, id)).toBeNull();
  });

  it('holds the rows as they were before the latest import, and only the latest', () => {
    const { db, id } = setup();
    insertSwimmerResults(db, id, [row('Un', 100)]);
    insertSwimmerResults(db, id, [row('Un', 110), row('Deux', 90)]);
    expect(getImportSnapshot(db, id)?.rows.map((r) => [r.lastname, r.points])).toEqual([['Un', 100]]);

    insertSwimmerResults(db, id, [row('Un', 110), row('Deux', 95)]);
    expect(getImportSnapshot(db, id)?.rows.map((r) => [r.lastname, r.points])).toEqual([
      ['Un', 110],
      ['Deux', 90],
    ]);
  });

  it('records when the previous import happened', () => {
    const { db, id } = setup();
    insertSwimmerResults(db, id, [row('Un', 100)]);
    const first = db.prepare('SELECT last_imported_at FROM meeting WHERE id = ?').get(id) as { last_imported_at: string };
    insertSwimmerResults(db, id, [row('Un', 105)]);
    expect(getImportSnapshot(db, id)?.importedAt).toBe(first.last_imported_at);
  });

  it('is kept when the same file is imported again (A then A)', () => {
    const { db, id } = setup();
    insertSwimmerResults(db, id, [row('Un', 100)]);
    // Distinct, known import dates: datetime('now') could give the same second to every import of a test.
    db.prepare("UPDATE meeting SET last_imported_at = '2026-10-02 10:00:00' WHERE id = ?").run(id);
    const fileA = [row('Un', 110), row('Deux', 90)];
    insertSwimmerResults(db, id, fileA);
    db.prepare("UPDATE meeting SET last_imported_at = '2026-10-02 11:00:00' WHERE id = ?").run(id);
    insertSwimmerResults(db, id, [...fileA].reverse());
    expect(getImportSnapshot(db, id)).toEqual({ importedAt: '2026-10-02 10:00:00', rows: [row('Un', 100)] });
  });

  it('stays absent when the first file is imported a second time', () => {
    const { db, id } = setup();
    insertSwimmerResults(db, id, [row('Un', 100)]);
    insertSwimmerResults(db, id, [row('Un', 100)]);
    expect(getImportSnapshot(db, id)).toBeNull();
  });

  it('is replaced when going back to an earlier file (B then A): the return is a real change', () => {
    const { db, id } = setup();
    const fileA = [row('Un', 100)];
    insertSwimmerResults(db, id, fileA);
    insertSwimmerResults(db, id, [row('Un', 120)]);
    db.prepare("UPDATE meeting SET last_imported_at = '2026-10-02 11:00:00' WHERE id = ?").run(id);
    insertSwimmerResults(db, id, fileA);
    expect(getImportSnapshot(db, id)).toEqual({ importedAt: '2026-10-02 11:00:00', rows: [row('Un', 120)] });
  });

  it('is not replaced by an empty import', () => {
    const { db, id } = setup();
    insertSwimmerResults(db, id, [row('Un', 100)]);
    insertSwimmerResults(db, id, [row('Un', 120)]);
    insertSwimmerResults(db, id, []);
    expect(getImportSnapshot(db, id)?.rows[0]?.points).toBe(100);
  });

  it('is deleted with its meeting', () => {
    const { db, id } = setup();
    insertSwimmerResults(db, id, [row('Un', 100)]);
    insertSwimmerResults(db, id, [row('Un', 120)]);
    deleteMeeting(db, id);
    expect(db.prepare('SELECT COUNT(*) AS n FROM import_snapshot').get()).toEqual({ n: 0 });
  });
});

/**
 * Responsabilité : tests des champs dérivés d'un meeting (date du dernier import, nombre de clubs, nombre de nageurs uniques).
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de ces champs de db.ts (affichés sur l'Accueil).
 */
import { describe, expect, it } from 'vitest';
import type { RawSwimmerRow } from '../src/lib/csv-parser';
import { createDatabase } from '../src/lib/db-schema';
import { createMeeting, getAllMeetings, insertSwimmerResults } from '../src/lib/db';

function row(overrides: Partial<RawSwimmerRow> = {}): RawSwimmerRow {
  return {
    name: 'Classement Mixte',
    place: 1,
    lastname: 'DUPONT',
    firstname: 'Jean',
    birthyear: 1990,
    nation: 'FRA',
    club: 'CN TEST',
    points: 500,
    comment: '',
    ...overrides,
  };
}

function firstMeeting(db: ReturnType<typeof createDatabase>) {
  const meetings = getAllMeetings(db);
  if (!meetings[0]) {
    throw new Error('No meetings found');
  }
  return meetings[0];
}

describe('lastImportedAt', () => {
  it('is null for a meeting that was never imported', () => {
    const db = createDatabase(':memory:');
    expect(createMeeting(db, { name: 'Vide' }).lastImportedAt).toBeNull();
  });

  it('is set by an import', () => {
    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'M' });

    insertSwimmerResults(db, meeting.id, [row()]);

    expect(firstMeeting(db).lastImportedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('is refreshed by a re-import', () => {
    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'M' });
    insertSwimmerResults(db, meeting.id, [row()]);
    db.prepare("UPDATE meeting SET last_imported_at = '2020-01-01 00:00:00' WHERE id = ?").run(meeting.id);

    insertSwimmerResults(db, meeting.id, [row()]);

    expect(firstMeeting(db).lastImportedAt).not.toBe('2020-01-01 00:00:00');
  });

  it('is left untouched when the import fails', () => {
    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'M' });
    // lastname is NOT NULL: this row aborts the transaction, which must also
    // roll back the date — otherwise a failed import would look like a good one.
    const broken = row({ lastname: null as unknown as string });

    expect(() => insertSwimmerResults(db, meeting.id, [broken])).toThrow();

    expect(firstMeeting(db).lastImportedAt).toBeNull();
  });

  it('only changes the meeting that was imported', () => {
    const db = createDatabase(':memory:');
    const imported = createMeeting(db, { name: 'Importé' });
    createMeeting(db, { name: 'Autre' });

    insertSwimmerResults(db, imported.id, [row()]);

    const byName = new Map(getAllMeetings(db).map((m) => [m.name, m.lastImportedAt]));
    expect(byName.get('Importé')).not.toBeNull();
    expect(byName.get('Autre')).toBeNull();
  });
});

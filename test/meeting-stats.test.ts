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

describe('clubCount and swimmerCount', () => {
  it('are 0 for a meeting with nothing imported', () => {
    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'Vide' });

    expect(meeting.clubCount).toBe(0);
    expect(meeting.swimmerCount).toBe(0);
  });

  it('count a swimmer once even when listed in several categories', () => {
    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'M' });

    insertSwimmerResults(db, meeting.id, [
      row({ name: 'Classement Mixte', lastname: 'A', club: 'CLUB X' }),
      row({ name: 'Classement Mixte', lastname: 'B', club: 'CLUB X' }),
      row({ name: 'Classement Mixte', lastname: 'C', club: 'CLUB Y' }),
      row({ name: 'Classement Dames', lastname: 'A', club: 'CLUB X' }),
    ]);

    const loaded = firstMeeting(db);
    expect(loaded.resultCount).toBe(4);
    expect(loaded.swimmerCount).toBe(3);
    expect(loaded.clubCount).toBe(2);
  });

  it('tell homonyms apart by birth year and by club', () => {
    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'M' });

    insertSwimmerResults(db, meeting.id, [
      row({ lastname: 'MARTIN', firstname: 'Paul', birthyear: 1990, club: 'CLUB X' }),
      row({ lastname: 'MARTIN', firstname: 'Paul', birthyear: 2005, club: 'CLUB X' }),
      row({ lastname: 'MARTIN', firstname: 'Paul', birthyear: 1990, club: 'CLUB Y' }),
    ]);

    expect(firstMeeting(db).swimmerCount).toBe(3);
  });

  it('are computed per meeting', () => {
    const db = createDatabase(':memory:');
    const a = createMeeting(db, { name: 'A' });
    const b = createMeeting(db, { name: 'B' });

    insertSwimmerResults(db, a.id, [row({ lastname: 'A1' }), row({ lastname: 'A2' })]);
    insertSwimmerResults(db, b.id, [row({ lastname: 'B1' })]);

    const byName = new Map(getAllMeetings(db).map((m) => [m.name, m.swimmerCount]));
    expect(byName.get('A')).toBe(2);
    expect(byName.get('B')).toBe(1);
  });

  it('count a swimmer with an unknown birth year', () => {
    const db = createDatabase(':memory:');
    const meeting = createMeeting(db, { name: 'M' });
    db.prepare(
      `INSERT INTO swimmer_result (meeting_id, category, lastname, firstname, birthyear, club, points)
       VALUES (?, 'Classement Mixte', 'X', 'Y', NULL, 'CLUB X', 100)`
    ).run(meeting.id);

    expect(firstMeeting(db).swimmerCount).toBe(1);
  });
});

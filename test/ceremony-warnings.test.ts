/**
 * Responsabilité : tests des points à vérifier avant la cérémonie.
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de ceremony-warnings.ts.
 */
import { describe, expect, it } from 'vitest';
import type { RawSwimmerRow } from '../src/lib/csv-parser';
import { buildCeremonyScript, type CeremonyOptions } from '../src/lib/ceremony-script';
import { ceremonyWarnings, STALE_IMPORT_MINUTES } from '../src/lib/ceremony-warnings';

const MIXTE = 'Classement Mixte';
const DAMES = 'Classement Dames';
const TEAMS_ONLY: CeremonyOptions = { blocks: ['team-ranking'], teamPlaces: 3 };
const IMPORTED_AT = '2026-11-16 14:00:00';
const JUST_AFTER = new Date('2026-11-16T14:05:00Z');

function row(name: string, club: string, points: number): RawSwimmerRow {
  return { name, place: 0, lastname: club, firstname: 'A', birthyear: 2000, nation: 'FRA', club, points, comment: '' };
}

const MEETING = { activeCategories: null, defaultTopN: 5, minSwimmers: 0, lastImportedAt: IMPORTED_AT };

describe('ceremonyWarnings', () => {
  it('reports nothing when there is nothing to settle', () => {
    const rows = [row(MIXTE, 'A', 300), row(MIXTE, 'B', 200)];
    const steps = buildCeremonyScript(MEETING, rows, TEAMS_ONLY);
    expect(ceremonyWarnings(MEETING, rows, steps, JUST_AFTER)).toEqual([]);
  });

  it('flags each tie on an announced place', () => {
    const rows = [row(MIXTE, 'A', 300), row(MIXTE, 'B', 200), row(MIXTE, 'C', 200)];
    const steps = buildCeremonyScript(MEETING, rows, TEAMS_ONLY);
    const warnings = ceremonyWarnings(MEETING, rows, steps, JUST_AFTER);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ kind: 'tie', step: { rank: 2 } });
  });

  it(`flags an import older than ${STALE_IMPORT_MINUTES} minutes`, () => {
    const rows = [row(MIXTE, 'A', 300)];
    const steps = buildCeremonyScript(MEETING, rows, TEAMS_ONLY);
    const later = new Date('2026-11-16T14:45:00Z');
    expect(ceremonyWarnings(MEETING, rows, steps, later)).toEqual([{ kind: 'stale-import', minutes: 45 }]);
    expect(ceremonyWarnings({ ...MEETING, lastImportedAt: null }, rows, steps, later)).toEqual([]);
  });

  it('flags an active category missing from the data', () => {
    const meeting = { ...MEETING, activeCategories: [MIXTE, DAMES] };
    const rows = [row(MIXTE, 'A', 300)];
    const steps = buildCeremonyScript(meeting, rows, TEAMS_ONLY);
    expect(ceremonyWarnings(meeting, rows, steps, JUST_AFTER)).toEqual([{ kind: 'empty-category', category: DAMES }]);
  });

  it('flags a category where no ticked block has anything to announce', () => {
    // Every Dames club is below the minimum swimmer count: no team to announce there.
    const meeting = { ...MEETING, minSwimmers: 2 };
    const rows = [row(MIXTE, 'A', 300), row(MIXTE, 'A', 200), row(DAMES, 'B', 100)];
    const steps = buildCeremonyScript(meeting, rows, TEAMS_ONLY);
    expect(ceremonyWarnings(meeting, rows, steps, JUST_AFTER)).toEqual([{ kind: 'empty-category', category: DAMES }]);
  });
});

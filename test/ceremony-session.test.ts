/**
 * Responsabilité : tests de la relecture d'un déroulé figé depuis le stockage de session.
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de ceremony-session.ts.
 */
import { describe, expect, it } from 'vitest';
import { parseCeremonyRun, type CeremonyRun } from '../src/lib/ceremony-session';

const RUN: CeremonyRun = {
  meetingId: 3,
  importedAt: '2026-11-16 14:32:00',
  steps: [
    {
      id: 'team-ranking|Classement Mixte|1',
      block: 'team-ranking',
      category: 'Classement Mixte',
      rank: 1,
      awardTitle: null,
      winners: [{ name: 'EN CAEN', club: 'EN CAEN', points: 5155, detail: null, swimmers: ['DUPONT A'] }],
      gapToNext: null,
    },
  ],
  progress: { current: 0, reached: 0 },
};

describe('parseCeremonyRun', () => {
  it('reads back a stored run unchanged', () => {
    expect(parseCeremonyRun(JSON.stringify(RUN))).toEqual(RUN);
  });

  it('ignores missing, unreadable or malformed data', () => {
    expect(parseCeremonyRun(null)).toBeNull();
    expect(parseCeremonyRun('{not json')).toBeNull();
    expect(parseCeremonyRun(JSON.stringify({ ...RUN, steps: [] }))).toBeNull();
    expect(parseCeremonyRun(JSON.stringify({ ...RUN, steps: [{ ...RUN.steps[0], block: 'other' }] }))).toBeNull();
    expect(parseCeremonyRun(JSON.stringify({ ...RUN, meetingId: '3' }))).toBeNull();
  });

  it('rejects a progress that points outside the script', () => {
    expect(parseCeremonyRun(JSON.stringify({ ...RUN, progress: { current: 1, reached: 1 } }))).toBeNull();
    expect(parseCeremonyRun(JSON.stringify({ ...RUN, progress: { current: 0, reached: 2 } }))).toBeNull();
  });
});

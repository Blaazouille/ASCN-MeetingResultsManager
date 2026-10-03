/**
 * Responsabilité : tests du déroulé de cérémonie (ordre des blocs, à rebours, catégories actives et choisies, ex æquo).
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de ceremony-script.ts.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCsv, type RawSwimmerRow } from '../src/lib/csv-parser';
import { computeFunAwards } from '../src/lib/fun-awards';
import { buildCeremonyScript, ceremonyCategories, type CeremonyMeeting } from '../src/lib/ceremony-script';

const MIXTE = 'Classement Mixte';
const DAMES = 'Classement Dames';
const MESSIEURS = 'Classement Messieurs';
const ALL_BLOCKS = ['fun-awards', 'individual-prizes', 'team-ranking'] as const;
const ALL_CATEGORIES = [DAMES, MESSIEURS, MIXTE];

const MEETING: CeremonyMeeting = { activeCategories: null, defaultTopN: 5, minSwimmers: 0 };

function loadRows(): RawSwimmerRow[] {
  const buffer = readFileSync(path.join(__dirname, 'fixtures', 'sample.csv'));
  return parseCsv(new Uint8Array(buffer)).rows;
}

function row(name: string, club: string, lastname: string, points: number): RawSwimmerRow {
  return { name, place: 0, lastname, firstname: 'A', birthyear: 2000, nation: 'FRA', club, points, comment: '' };
}

describe('buildCeremonyScript', () => {
  const rows = loadRows();

  it('announces the team podium from 3rd to 1st, matching the reference ranking', () => {
    const steps = buildCeremonyScript({ ...MEETING, activeCategories: [MIXTE] }, rows, { blocks: ['team-ranking'], teamPlaces: 3, categories: ALL_CATEGORIES });
    expect(steps.map((step) => step.rank)).toEqual([3, 2, 1]);
    expect(steps.map((step) => step.winners[0]!.name)).toEqual([
      'AC CHERBOURG EN COTENTIN',
      'BOULOGNE BILLANCOURT NATATION',
      'CN VIRY-CHÂTILLON',
    ]);
    expect(steps.map((step) => step.winners[0]!.points)).toEqual([5201, 5364, 5841]);
  });

  it('gives the gap to the next place down', () => {
    const steps = buildCeremonyScript({ ...MEETING, activeCategories: [MIXTE] }, rows, { blocks: ['team-ranking'], teamPlaces: 3, categories: ALL_CATEGORIES });
    // 3rd 5201 vs 4th 5191; 1st 5841 vs 2nd 5364.
    expect(steps[0]!.gapToNext).toBe(10);
    expect(steps[2]!.gapToNext).toBe(477);
  });

  it('lists the swimmers retained for a club, so they can be called to the podium', () => {
    const steps = buildCeremonyScript({ ...MEETING, activeCategories: [MIXTE] }, rows, { blocks: ['team-ranking'], teamPlaces: 1, categories: ALL_CATEGORIES });
    expect(steps).toHaveLength(1);
    expect(steps[0]!.winners[0]!.swimmers).toHaveLength(5);
  });

  it('announces as many team places as asked', () => {
    const steps = buildCeremonyScript({ ...MEETING, activeCategories: [MIXTE] }, rows, { blocks: ['team-ranking'], teamPlaces: 5, categories: ALL_CATEGORIES });
    expect(steps.map((step) => step.rank)).toEqual([5, 4, 3, 2, 1]);
    expect(steps[0]!.winners[0]!.name).toBe('EN CAEN');
  });

  it('follows the block order given, each block covering every active category in turn', () => {
    const steps = buildCeremonyScript(MEETING, rows, { blocks: ['team-ranking', 'individual-prizes'], teamPlaces: 3, categories: ALL_CATEGORIES });
    const blocks = steps.map((step) => step.block);
    expect(blocks.indexOf('individual-prizes')).toBe(blocks.lastIndexOf('team-ranking') + 1);
    const teamCategories = [...new Set(steps.filter((step) => step.block === 'team-ranking').map((step) => step.category))];
    expect(teamCategories).toEqual(ceremonyCategories(MEETING, rows));
  });

  it('skips the blocks that are not ticked', () => {
    const steps = buildCeremonyScript(MEETING, rows, { blocks: ['individual-prizes'], teamPlaces: 3, categories: ALL_CATEGORIES });
    expect(steps.every((step) => step.block === 'individual-prizes')).toBe(true);
    expect(buildCeremonyScript(MEETING, rows, { blocks: [], teamPlaces: 3, categories: ALL_CATEGORIES })).toEqual([]);
  });

  it('leaves out categories that are not active', () => {
    const steps = buildCeremonyScript({ ...MEETING, activeCategories: [DAMES] }, rows, { blocks: [...ALL_BLOCKS], teamPlaces: 3, categories: ALL_CATEGORIES });
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.every((step) => step.category === DAMES)).toBe(true);
  });

  it('announces the 2e Prix before the 1er Prix in each category', () => {
    const steps = buildCeremonyScript({ ...MEETING, activeCategories: [MESSIEURS] }, rows, { blocks: ['individual-prizes'], teamPlaces: 3, categories: ALL_CATEGORIES });
    expect(steps.map((step) => step.rank)).toEqual([2, 1]);
    expect(steps[1]!.winners[0]!.points).toBeGreaterThan(steps[0]!.winners[0]!.points!);
  });

  it('gives the same fun awards as the Palmarès screen, category by category', () => {
    const steps = buildCeremonyScript({ ...MEETING, activeCategories: [DAMES] }, rows, { blocks: ['fun-awards'], teamPlaces: 3, categories: ALL_CATEGORIES });
    const expected = computeFunAwards(rows.filter((r) => r.name === DAMES));
    expect(steps.map((step) => step.awardTitle)).toEqual(expected.map((award) => award.title));
    expect(steps.every((step) => step.rank === null && step.gapToNext === null)).toBe(true);
  });

  it('gives every step a distinct id', () => {
    const steps = buildCeremonyScript(MEETING, rows, { blocks: [...ALL_BLOCKS], teamPlaces: 3, categories: ALL_CATEGORIES });
    expect(new Set(steps.map((step) => step.id)).size).toBe(steps.length);
  });

  describe('categories chosen for the ceremony', () => {
    const fullOptions = { blocks: [...ALL_BLOCKS], teamPlaces: 3 };

    it('announces Mixte only when only Mixte is chosen: 10 announcements on the real file', () => {
      // 5 fun awards (Le Duo Mixte has no winner there), the 2 individual prizes and the team podium.
      const steps = buildCeremonyScript(MEETING, rows, { ...fullOptions, categories: [MIXTE] });
      expect(steps).toHaveLength(10);
      expect(steps.every((step) => step.category === MIXTE)).toBe(true);
    });

    it('announces every category when all are chosen: 30 announcements on the real file', () => {
      const steps = buildCeremonyScript(MEETING, rows, { ...fullOptions, categories: ALL_CATEGORIES });
      expect(steps).toHaveLength(30);
      expect(new Set(steps.map((step) => step.category))).toEqual(new Set(ALL_CATEGORIES));
    });

    it('keeps the import order of categories, whatever order they were ticked in', () => {
      const steps = buildCeremonyScript(MEETING, rows, { blocks: ['team-ranking'], teamPlaces: 1, categories: [MIXTE, DAMES] });
      expect(steps.map((step) => step.category)).toEqual([DAMES, MIXTE]);
    });

    it('ignores a chosen category that is not active in the meeting', () => {
      const meeting = { ...MEETING, activeCategories: [DAMES] };
      const steps = buildCeremonyScript(meeting, rows, { ...fullOptions, categories: [DAMES, MIXTE] });
      expect(steps.every((step) => step.category === DAMES)).toBe(true);
    });

    it('announces nothing when no category is chosen', () => {
      expect(buildCeremonyScript(MEETING, rows, { ...fullOptions, categories: [] })).toEqual([]);
    });
  });

  describe('ties', () => {
    // Clubs B and C tie for 2nd: ranks 1, 2, 2, 4.
    const tiedRows = [
      row(MIXTE, 'A', 'A1', 300),
      row(MIXTE, 'B', 'B1', 200),
      row(MIXTE, 'C', 'C1', 200),
      row(MIXTE, 'D', 'D1', 150),
    ];

    it('groups tied clubs on one step, announced together', () => {
      const steps = buildCeremonyScript(MEETING, tiedRows, { blocks: ['team-ranking'], teamPlaces: 3, categories: ALL_CATEGORIES });
      expect(steps.map((step) => step.rank)).toEqual([2, 1]);
      expect(steps[0]!.winners.map((winner) => winner.name)).toEqual(['B', 'C']);
      expect(steps[0]!.gapToNext).toBe(50);
    });

    it('keeps every tied club even past the last announced place', () => {
      const steps = buildCeremonyScript(MEETING, tiedRows, { blocks: ['team-ranking'], teamPlaces: 2, categories: ALL_CATEGORIES });
      expect(steps[0]!.winners).toHaveLength(2);
    });

    it('groups tied swimmers on one prize', () => {
      const steps = buildCeremonyScript(MEETING, tiedRows, { blocks: ['individual-prizes'], teamPlaces: 3, categories: ALL_CATEGORIES });
      expect(steps.map((step) => step.rank)).toEqual([2, 1]);
      expect(steps[0]!.winners).toHaveLength(2);
    });

    it('has no gap when nobody is ranked below', () => {
      const steps = buildCeremonyScript(MEETING, [row(MIXTE, 'A', 'A1', 300)], { blocks: ['team-ranking'], teamPlaces: 3, categories: ALL_CATEGORIES });
      expect(steps).toHaveLength(1);
      expect(steps[0]!.gapToNext).toBeNull();
    });
  });
});

describe('ceremonyCategories', () => {
  const rows = [row(DAMES, 'A', 'A1', 10), row(MIXTE, 'A', 'A1', 10)];

  it('keeps the active categories found in the data, in import order', () => {
    expect(ceremonyCategories(MEETING, rows)).toEqual([DAMES, MIXTE]);
    expect(ceremonyCategories({ ...MEETING, activeCategories: [MIXTE, MESSIEURS] }, rows)).toEqual([MIXTE]);
  });
});

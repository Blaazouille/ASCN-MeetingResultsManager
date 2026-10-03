/**
 * Responsabilité : tests de la préparation de cérémonie (blocs cochés, réordonnancement, catégories annoncées).
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de ceremony-plan.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PLAN,
  moveBlock,
  planToOptions,
  resolveCeremonyCategories,
  toggleBlock,
} from '../src/lib/ceremony-plan';

const MIXTE = 'Classement Mixte';
const DAMES = 'Classement Dames';
const MESSIEURS = 'Classement Messieurs';
const ALL = [DAMES, MESSIEURS, MIXTE];

describe('DEFAULT_PLAN', () => {
  it('ticks every block, fun awards first and the team ranking last', () => {
    expect(planToOptions(DEFAULT_PLAN, 3, [MIXTE])).toEqual({
      blocks: ['fun-awards', 'individual-prizes', 'team-ranking'],
      teamPlaces: 3,
      categories: [MIXTE],
    });
  });
});

describe('toggleBlock', () => {
  it('unticks a block and ticks it back at the same position', () => {
    const unticked = toggleBlock(DEFAULT_PLAN, 'individual-prizes');
    expect(planToOptions(unticked, 3, ALL).blocks).toEqual(['fun-awards', 'team-ranking']);
    expect(toggleBlock(unticked, 'individual-prizes')).toEqual(DEFAULT_PLAN);
  });
});

describe('moveBlock', () => {
  it('moves a block up or down by one', () => {
    expect(planToOptions(moveBlock(DEFAULT_PLAN, 2, -1), 3, ALL).blocks).toEqual(['fun-awards', 'team-ranking', 'individual-prizes']);
    expect(planToOptions(moveBlock(DEFAULT_PLAN, 0, 1), 3, ALL).blocks).toEqual(['individual-prizes', 'fun-awards', 'team-ranking']);
  });

  it('leaves the plan unchanged when moving past either end', () => {
    expect(moveBlock(DEFAULT_PLAN, 0, -1)).toEqual(DEFAULT_PLAN);
    expect(moveBlock(DEFAULT_PLAN, 2, 1)).toEqual(DEFAULT_PLAN);
  });
});

describe('resolveCeremonyCategories', () => {
  it('uses the default until the manager makes a choice', () => {
    expect(resolveCeremonyCategories(ALL, null)).toEqual([MIXTE]);
  });

  it("keeps the manager's choice, in the order of the available categories", () => {
    expect(resolveCeremonyCategories(ALL, [MIXTE, DAMES])).toEqual([DAMES, MIXTE]);
  });

  it('drops chosen categories that are no longer available', () => {
    expect(resolveCeremonyCategories([DAMES, MIXTE], [MESSIEURS, MIXTE])).toEqual([MIXTE]);
  });

  it('falls back to the default when none of the chosen categories is available any more', () => {
    expect(resolveCeremonyCategories([DAMES, MIXTE], [MESSIEURS])).toEqual([MIXTE]);
  });

  it('keeps an empty choice empty instead of silently ticking the default back', () => {
    expect(resolveCeremonyCategories(ALL, [])).toEqual([]);
  });
});

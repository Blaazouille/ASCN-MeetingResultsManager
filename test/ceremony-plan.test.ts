/**
 * Responsabilité : tests de la préparation de cérémonie (blocs cochés, réordonnancement).
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de ceremony-plan.ts.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_PLAN, moveBlock, planToOptions, toggleBlock } from '../src/lib/ceremony-plan';

describe('DEFAULT_PLAN', () => {
  it('ticks every block, fun awards first and the team ranking last', () => {
    expect(planToOptions(DEFAULT_PLAN, 3)).toEqual({
      blocks: ['fun-awards', 'individual-prizes', 'team-ranking'],
      teamPlaces: 3,
    });
  });
});

describe('toggleBlock', () => {
  it('unticks a block and ticks it back at the same position', () => {
    const unticked = toggleBlock(DEFAULT_PLAN, 'individual-prizes');
    expect(planToOptions(unticked, 3).blocks).toEqual(['fun-awards', 'team-ranking']);
    expect(toggleBlock(unticked, 'individual-prizes')).toEqual(DEFAULT_PLAN);
  });
});

describe('moveBlock', () => {
  it('moves a block up or down by one', () => {
    expect(planToOptions(moveBlock(DEFAULT_PLAN, 2, -1), 3).blocks).toEqual(['fun-awards', 'team-ranking', 'individual-prizes']);
    expect(planToOptions(moveBlock(DEFAULT_PLAN, 0, 1), 3).blocks).toEqual(['individual-prizes', 'fun-awards', 'team-ranking']);
  });

  it('leaves the plan unchanged when moving past either end', () => {
    expect(moveBlock(DEFAULT_PLAN, 0, -1)).toEqual(DEFAULT_PLAN);
    expect(moveBlock(DEFAULT_PLAN, 2, 1)).toEqual(DEFAULT_PLAN);
  });
});

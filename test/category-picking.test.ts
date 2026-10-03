/**
 * Responsabilité : tests des règles des cases « catégories cochées » (category-picking.ts), partagées par la Cérémonie et « Tout exporter ».
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de category-picking.ts (défaut Mixte seul, tout décochable, action bloquée sans case cochée).
 */
import { describe, expect, it } from 'vitest';
import { defaultPickedCategories, isMissingPickedCategory, togglePickedCategory } from '../src/lib/category-picking';

const MIXTE = 'Classement Mixte';
const DAMES = 'Classement Dames';
const MESSIEURS = 'Classement Messieurs';
const ALL = [DAMES, MESSIEURS, MIXTE];

describe('defaultPickedCategories', () => {
  it('ticks Mixte only, the one category the meeting rewards', () => {
    expect(defaultPickedCategories(ALL)).toEqual([MIXTE]);
  });

  it('recognises Mixte whatever its case', () => {
    expect(defaultPickedCategories([DAMES, 'CLASSEMENT MIXTE'])).toEqual(['CLASSEMENT MIXTE']);
  });

  it('ticks every category when the meeting has no Mixte', () => {
    expect(defaultPickedCategories([DAMES, MESSIEURS])).toEqual([DAMES, MESSIEURS]);
  });

  it('ticks nothing when there is nothing to choose from', () => {
    expect(defaultPickedCategories([])).toEqual([]);
  });
});

describe('togglePickedCategory', () => {
  it('ticks and unticks a category', () => {
    expect(togglePickedCategory([MIXTE], DAMES)).toEqual([MIXTE, DAMES]);
    expect(togglePickedCategory([MIXTE, DAMES], MIXTE)).toEqual([DAMES]);
  });

  it('lets the volunteer untick the last ticked category', () => {
    expect(togglePickedCategory([MIXTE], MIXTE)).toEqual([]);
  });

  it('ticks a category again from an empty choice', () => {
    expect(togglePickedCategory([], DAMES)).toEqual([DAMES]);
  });
});

describe('isMissingPickedCategory', () => {
  it('asks for a category when none is ticked', () => {
    expect(isMissingPickedCategory(ALL, [])).toBe(true);
  });

  it('is satisfied as soon as one category is ticked', () => {
    expect(isMissingPickedCategory(ALL, [DAMES])).toBe(false);
  });

  it('asks nothing when there is no category to tick', () => {
    expect(isMissingPickedCategory([], [])).toBe(false);
  });
});

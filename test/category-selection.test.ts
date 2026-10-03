/**
 * Tests de la catégorie partagée entre Classement, Individuels et Palmarès (issue #67) :
 * Mixte par défaut, sinon la première catégorie proposée ; retour au défaut quand le choix n'est plus proposé.
 */
import { describe, expect, it } from 'vitest';
import { defaultCategory, isStaleSelection, resolveCategory } from '../src/lib/category-selection';

const ALL = ['Classement Dames', 'Classement Messieurs', 'Classement Mixte'];

describe('defaultCategory', () => {
  it('opens on Mixte when it is offered, even if it is not first', () => {
    expect(defaultCategory(ALL)).toBe('Classement Mixte');
  });

  it('falls back to the first offered category when Mixte is not offered', () => {
    expect(defaultCategory(['Classement Messieurs', 'Classement Dames'])).toBe('Classement Messieurs');
  });

  it('recognises Mixte whatever the case of the label', () => {
    expect(defaultCategory(['Classement Dames', 'CLASSEMENT MIXTE'])).toBe('CLASSEMENT MIXTE');
    expect(defaultCategory(['Classement Dames', 'classement mixte'])).toBe('classement mixte');
  });

  it('returns an empty category when nothing is offered', () => {
    expect(defaultCategory([])).toBe('');
  });
});

describe('resolveCategory', () => {
  it('applies the default rule when nothing has been chosen yet', () => {
    expect(resolveCategory(null, ALL)).toBe('Classement Mixte');
  });

  it('keeps the volunteer’s choice while it is offered', () => {
    expect(resolveCategory('Classement Dames', ALL)).toBe('Classement Dames');
  });

  it('falls back to the default rule when the choice is no longer offered', () => {
    expect(resolveCategory('Classement Dames', ['Classement Messieurs', 'Classement Mixte'])).toBe('Classement Mixte');
    expect(resolveCategory('Classement Mixte', ['Classement Messieurs', 'Classement Dames'])).toBe('Classement Messieurs');
  });
});

describe('isStaleSelection', () => {
  it('forgets a choice that is no longer offered (active categories changed, reimport without it)', () => {
    expect(isStaleSelection('Classement Dames', ['Classement Messieurs', 'Classement Mixte'])).toBe(true);
  });

  it('keeps a choice that is still offered', () => {
    expect(isStaleSelection('Classement Dames', ALL)).toBe(false);
  });

  it('keeps the choice while a screen is still loading its categories', () => {
    expect(isStaleSelection('Classement Dames', [])).toBe(false);
  });

  it('has nothing to forget when nothing was chosen', () => {
    expect(isStaleSelection(null, ['Classement Messieurs'])).toBe(false);
  });
});

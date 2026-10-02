/**
 * Responsabilité : vérifie les textes de la carte « Notre club » (rang, écarts, nageurs, meilleur nageur).
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de club-summary-labels.ts.
 */
import { describe, expect, it } from 'vitest';
import { bestSwimmerLabel, clubGapLabels, clubRankLabel, clubSwimmersLabel } from '../src/lib/club-summary-labels';
import type { ClubCategoryStatus } from '../src/lib/club-summary';

// `_` marks a non-breaking space: numbers stay with their units, « : » with the word before it.
const nb = (text: string): string => text.replace(/_/g, '\u00a0');

function ranked(over: Partial<Extract<ClubCategoryStatus, { kind: 'ranked' }>>): ClubCategoryStatus {
  return { kind: 'ranked', rank: 7, tied: false, clubCount: 38, totalPoints: 4812, retained: 5, behind: null, ahead: null, ...over };
}

describe('clubRankLabel', () => {
  it('shows the rank out of the ranked clubs', () => {
    expect(clubRankLabel(7, false, 38)).toBe(nb('7e_/_38'));
    expect(clubRankLabel(1, false, 38)).toBe(nb('1er_/_38'));
  });

  it('says when the rank is shared', () => {
    expect(clubRankLabel(3, true, 38)).toBe(nb('3e ex æquo_/_38'));
  });
});

describe('clubGapLabels', () => {
  it('gives the points missing for the place above, then the lead on the club below', () => {
    const status = ranked({ behind: { rank: 6, points: 154 }, ahead: { rank: 8, points: 32 } });
    expect(clubGapLabels(status)).toEqual(['−154_pts pour la 6e place', "+32_pts d'avance sur le 8e"].map(nb));
  });

  it('only gives the lead for the 1st', () => {
    expect(clubGapLabels(ranked({ rank: 1, ahead: { rank: 2, points: 1203 } }))).toEqual([nb("+1_203_pts d'avance sur le 2e")]);
  });

  it('names the 1st place in the feminine', () => {
    expect(clubGapLabels(ranked({ rank: 2, behind: { rank: 1, points: 10 } }))).toEqual([nb('−10_pts pour la 1re place')]);
  });

  it('explains a club left out for lack of swimmers', () => {
    expect(clubGapLabels({ kind: 'below-threshold', minSwimmers: 3 })).toEqual([nb('Non classé_: moins de 3 nageurs')]);
  });

  it('says when the club has no swimmer in the category', () => {
    expect(clubGapLabels({ kind: 'absent' })).toEqual(['Aucun nageur dans cette catégorie']);
  });
});

describe('clubSwimmersLabel', () => {
  it('shows retained out of entered once ranked', () => {
    expect(clubSwimmersLabel(ranked({ retained: 5 }), 18)).toBe(nb('5_retenus sur_18'));
  });

  it('only counts entered swimmers when the club is not ranked', () => {
    expect(clubSwimmersLabel({ kind: 'below-threshold', minSwimmers: 3 }, 2)).toBe('2 nageurs engagés');
    expect(clubSwimmersLabel({ kind: 'below-threshold', minSwimmers: 3 }, 1)).toBe('1 nageur engagé');
  });
});

describe('bestSwimmerLabel', () => {
  const swimmer = { firstname: 'Léa', lastname: 'MARTIN', rank: 12, tied: false, points: 1274 };

  it('names the swimmer with their rank and points', () => {
    expect(bestSwimmerLabel(swimmer, 'Classement Mixte')).toBe(nb('Meilleur nageur_: Léa MARTIN, 12e (1_274_pts)'));
  });

  it('speaks of a « nageuse » in the Dames category, 1re when first', () => {
    expect(bestSwimmerLabel({ ...swimmer, rank: 1 }, 'Classement Dames')).toBe(
      nb('Meilleure nageuse_: Léa MARTIN, 1re (1_274_pts)')
    );
  });

  it('says when the individual rank is shared', () => {
    expect(bestSwimmerLabel({ ...swimmer, tied: true }, 'Classement Messieurs')).toBe(
      nb('Meilleur nageur_: Léa MARTIN, 12e ex æquo (1_274_pts)')
    );
  });
});

/**
 * Responsabilité : vérifie les textes de la ligne « Notre club » (rang, points, écarts, cas non classé ou absent), issue #64.
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de club-summary-labels.ts.
 */
import { describe, expect, it } from 'vitest';
import { clubRankLabel, clubStandingParts } from '../src/lib/club-summary-labels';
import type { ClubCategoryStatus } from '../src/lib/club-summary';

// `_` marks a non-breaking space: numbers stay with their units, « : » with the word before it.
const nb = (text: string): string => text.replace(/_/g, ' ');

function ranked(over: Partial<Extract<ClubCategoryStatus, { kind: 'ranked' }>>): ClubCategoryStatus {
  return { kind: 'ranked', rank: 7, tied: false, clubCount: 38, totalPoints: 4735, behind: null, ahead: null, ...over };
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

describe('clubStandingParts', () => {
  it('reads « 4 735 pts · −23 pour la 6e · +14 sur le 8e » for a club in the middle of the ranking', () => {
    const status = ranked({ behind: { rank: 6, points: 23 }, ahead: { rank: 8, points: 14 } });
    expect(clubStandingParts(status)).toEqual(['4_735_pts', '−23 pour la 6e', '+14 sur le 8e'].map(nb));
  });

  it('only gives the lead for the 1st', () => {
    expect(clubStandingParts(ranked({ rank: 1, totalPoints: 5841, ahead: { rank: 2, points: 1203 } }))).toEqual(
      ['5_841_pts', '+1_203 sur le 2e'].map(nb)
    );
  });

  it('only gives the gap for the last, the 1st place in the feminine', () => {
    expect(clubStandingParts(ranked({ rank: 2, totalPoints: 561, behind: { rank: 1, points: 10 } }))).toEqual(
      ['561_pts', '−10 pour la 1re'].map(nb)
    );
  });

  it('only gives the total for the only ranked club', () => {
    expect(clubStandingParts(ranked({ rank: 1, clubCount: 1 }))).toEqual([nb('4_735_pts')]);
  });

  it('explains a club left out for lack of swimmers', () => {
    expect(clubStandingParts({ kind: 'below-threshold', minSwimmers: 3 })).toEqual([nb('Non classé_: moins de 3 nageurs')]);
  });

  it('says when the club has no swimmer in the category', () => {
    expect(clubStandingParts({ kind: 'absent' })).toEqual(['Aucun nageur dans cette catégorie']);
  });
});

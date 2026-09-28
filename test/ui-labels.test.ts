/**
 * Responsabilité : tests des fonctions de formatage textuel (libellés, écarts, statuts) de ui-labels.ts.
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de ui-labels.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  birthLabel,
  categoryShortLabel,
  countedSummary,
  formatGap,
  leaderRatio,
  meetingBadgeStatus,
  placeLabel,
  resultCountLabel,
} from '../src/lib/ui-labels';

const NBSP = ' ';
const MINUS = '−';

describe('placeLabel', () => {
  it('uses "1re" for first place and "e" after', () => {
    expect(placeLabel(1)).toBe('1re place');
    expect(placeLabel(2)).toBe('2e place');
    expect(placeLabel(3)).toBe('3e place');
  });
});

describe('formatGap', () => {
  it('shows the gap to the leader with a real minus sign', () => {
    expect(formatGap(5364, 5841)).toBe(`${MINUS}477`);
  });

  it('groups thousands with a non-breaking space', () => {
    expect(formatGap(4735, 5841)).toBe(`${MINUS}1${NBSP}106`);
  });

  it('shows a dash for the leader itself', () => {
    expect(formatGap(5841, 5841)).toBe('—');
  });
});

describe('leaderRatio', () => {
  it('is the share of the leader points', () => {
    expect(leaderRatio(2920.5, 5841)).toBeCloseTo(0.5);
    expect(leaderRatio(5841, 5841)).toBe(1);
  });

  it('is 0 when there is no leader score', () => {
    expect(leaderRatio(100, 0)).toBe(0);
  });
});

describe('birthLabel', () => {
  it('agrees with the gender of the category', () => {
    expect(birthLabel(1991, 'F')).toBe('Née en 1991');
    expect(birthLabel(1970, 'M')).toBe('Né en 1970');
  });

  it('falls back to a neutral label for mixed categories', () => {
    expect(birthLabel(1970, null)).toBe('Année 1970');
  });
});

describe('countedSummary', () => {
  it('says how many swimmers count and how many do not', () => {
    expect(countedSummary(5, 30)).toBe('5 nageurs comptés · 25 autres nageurs du club ne comptent pas dans le total');
  });

  it('omits the second part when every swimmer counts', () => {
    expect(countedSummary(2, 2)).toBe('2 nageurs comptés');
  });

  it('uses the singular for one swimmer', () => {
    expect(countedSummary(1, 1)).toBe('1 nageur compté');
    expect(countedSummary(5, 6)).toBe('5 nageurs comptés · 1 autre nageur du club ne compte pas dans le total');
  });
});

describe('resultCountLabel', () => {
  it('describes the number of imported results', () => {
    expect(resultCountLabel(0)).toBe('Aucun résultat importé');
    expect(resultCountLabel(1)).toBe('1 résultat importé');
    expect(resultCountLabel(1422)).toBe(`1${NBSP}422 résultats importés`);
  });
});

describe('meetingBadgeStatus', () => {
  it('reads "pending" while nothing is imported, whatever the status', () => {
    expect(meetingBadgeStatus({ status: 'final', resultCount: 0 })).toBe('pending');
  });

  it('reads the meeting status once results exist', () => {
    expect(meetingBadgeStatus({ status: 'provisional', resultCount: 422 })).toBe('provisional');
    expect(meetingBadgeStatus({ status: 'final', resultCount: 422 })).toBe('final');
  });
});

describe('categoryShortLabel', () => {
  it('drops the "Classement " prefix', () => {
    expect(categoryShortLabel('Classement Mixte')).toBe('Mixte');
    expect(categoryShortLabel('Classement Dames')).toBe('Dames');
  });

  it('keeps a category without the prefix unchanged', () => {
    expect(categoryShortLabel('Relais')).toBe('Relais');
  });
});

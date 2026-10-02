/**
 * Responsabilité : tests des fonctions de formatage textuel (libellés, écarts) de ui-labels.ts.
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de ui-labels.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  birthLabel,
  categoryShortLabel,
  clubCountLabel,
  countedSummary,
  importChangeParts,
  formatGap,
  isDeleteConfirmed,
  lastImportLabel,
  leaderRatio,
  meetingStatsLabel,
  movementAriaLabel,
  movementText,
  placeLabel,
  resultCountLabel,
  sinceImportLabel,
  swimmerCountLabel,
  unrankedClubsLabel,
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

describe('categoryShortLabel', () => {
  it('drops the "Classement " prefix', () => {
    expect(categoryShortLabel('Classement Mixte')).toBe('Mixte');
    expect(categoryShortLabel('Classement Dames')).toBe('Dames');
  });

  it('keeps a category without the prefix unchanged', () => {
    expect(categoryShortLabel('Relais')).toBe('Relais');
  });
});

describe('isDeleteConfirmed', () => {
  it('accepts the exact meeting name', () => {
    expect(isDeleteConfirmed('Meeting de la Mer', 'Meeting de la Mer')).toBe(true);
  });

  it('ignores spaces around the typed name', () => {
    expect(isDeleteConfirmed('  Meeting de la Mer ', 'Meeting de la Mer')).toBe(true);
  });

  it('rejects a different case, so the volunteer has to read the name', () => {
    expect(isDeleteConfirmed('meeting de la mer', 'Meeting de la Mer')).toBe(false);
  });

  it('rejects an empty entry, even for an empty meeting name', () => {
    expect(isDeleteConfirmed('', 'Meeting de la Mer')).toBe(false);
    expect(isDeleteConfirmed('  ', '')).toBe(false);
  });
});

describe('clubCountLabel', () => {
  it('uses the singular for 0 and 1 (French rule), the plural from 2', () => {
    expect(clubCountLabel(0)).toBe('0 club');
    expect(clubCountLabel(1)).toBe('1 club');
    expect(clubCountLabel(38)).toBe('38 clubs');
  });
});

describe('unrankedClubsLabel', () => {
  it('says how many clubs are left out and why, with a non-breaking space before the colon', () => {
    expect(unrankedClubsLabel(2, 3)).toBe(`2 clubs non classés${NBSP}: moins de 3 nageurs dans la catégorie`);
  });

  it('uses the singular for a single club', () => {
    expect(unrankedClubsLabel(1, 4)).toBe(`1 club non classé${NBSP}: moins de 4 nageurs dans la catégorie`);
  });
});

describe('swimmerCountLabel', () => {
  it('uses the singular for 0 and 1, the plural from 2', () => {
    expect(swimmerCountLabel(0)).toBe('0 nageur');
    expect(swimmerCountLabel(1)).toBe('1 nageur');
    expect(swimmerCountLabel(412)).toBe('412 nageurs');
  });

  it('separates thousands with a non-breaking space', () => {
    expect(swimmerCountLabel(1234)).toBe(`1${NBSP}234 nageurs`);
  });
});

describe('meetingStatsLabel', () => {
  it('joins clubs and swimmers', () => {
    expect(meetingStatsLabel(38, 412)).toBe('38 clubs · 412 nageurs');
  });

  it('handles singulars', () => {
    expect(meetingStatsLabel(1, 1)).toBe('1 club · 1 nageur');
  });
});

describe('lastImportLabel', () => {
  it('prefixes the formatted date', () => {
    expect(lastImportLabel('27 sept. 2026 à 14 h 32')).toBe('Dernier import le 27 sept. 2026 à 14 h 32');
  });
});

describe('movement labels', () => {
  it('shows arrow and number, or « + » for a new entry', () => {
    expect(movementText(2)).toBe('↑2');
    expect(movementText(-1)).toBe('↓1');
    expect(movementText('new')).toBe('+');
  });

  it('speaks them in full French', () => {
    expect(movementAriaLabel(2)).toBe('Gagne 2 places');
    expect(movementAriaLabel(-1)).toBe('Perd 1 place');
    expect(movementAriaLabel('new')).toBe('Nouveau dans le classement');
  });
});

describe('import summary labels', () => {
  it('names the previous import, or falls back when its time is unknown', () => {
    expect(sinceImportLabel('27 sept. 2026 à 14 h 32')).toBe("Depuis l'import du 27 sept. 2026 à 14 h 32");
    expect(sinceImportLabel(null)).toBe("Depuis l'import précédent");
  });

  it('lists only what changed, with French plurals', () => {
    expect(importChangeParts({ addedSwimmers: 12, removedSwimmers: 1, changedResults: 38, clubsMoved: 3 })).toEqual([
      '+12 nageurs',
      `${MINUS}1 nageur`,
      '38 résultats modifiés',
      '3 clubs ont changé de rang',
    ]);
    expect(importChangeParts({ addedSwimmers: 0, removedSwimmers: 0, changedResults: 1, clubsMoved: 1 })).toEqual([
      '1 résultat modifié',
      '1 club a changé de rang',
    ]);
    expect(importChangeParts({ addedSwimmers: 0, removedSwimmers: 0, changedResults: 0, clubsMoved: 0 })).toEqual([]);
  });
});

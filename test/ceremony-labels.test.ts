/**
 * Responsabilité : tests des textes du déroulé de cérémonie.
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de ceremony-labels.ts.
 */
import { describe, expect, it } from 'vitest';
import type { CeremonyStep, CeremonyWinner } from '../src/lib/ceremony-script';
import {
  gapLabel,
  pointsLabel,
  finishedLabel,
  progressLabel,
  stepContext,
  stepCountLabel,
  stepHeading,
  warningLabel,
  winnerLine,
} from '../src/lib/ceremony-labels';

const NBSP = ' ';

function winner(overrides: Partial<CeremonyWinner> = {}): CeremonyWinner {
  return { name: 'EN CAEN', club: 'EN CAEN', points: 5155, detail: null, swimmers: [], ...overrides };
}

function step(overrides: Partial<CeremonyStep> = {}): CeremonyStep {
  return {
    id: 'x',
    block: 'team-ranking',
    category: 'Classement Mixte',
    rank: 3,
    awardTitle: null,
    winners: [winner()],
    gapToNext: 10,
    ...overrides,
  };
}

describe('stepHeading', () => {
  it('names the place for teams, the prize for individuals, the title for fun awards', () => {
    expect(stepHeading(step())).toBe('3e place');
    expect(stepHeading(step({ rank: 1 }))).toBe('1re place');
    expect(stepHeading(step({ block: 'individual-prizes', rank: 1 }))).toBe('1er Prix');
    expect(stepHeading(step({ block: 'fun-awards', rank: null, awardTitle: 'La Doyenne' }))).toBe('La Doyenne');
  });

  it('says ex æquo when several winners share the step', () => {
    expect(stepHeading(step({ rank: 2, winners: [winner(), winner({ name: 'UAS ST-CLOUD' })] }))).toBe('2e place ex æquo');
  });
});

describe('stepContext', () => {
  it('gives the block and the short category name', () => {
    expect(stepContext(step())).toBe('Classement par équipes · Mixte');
    expect(stepContext(step({ block: 'fun-awards', category: 'Classement Dames' }))).toBe('Palmarès des rigolos · Dames');
  });
});

describe('finishedLabel', () => {
  it('congratulates when every announcement was made', () => {
    expect(finishedLabel(0)).toBe(`Toutes les annonces ont été faites. Bravo${NBSP}!`);
  });

  it('counts the announcements jumped over', () => {
    expect(finishedLabel(1)).toBe(`Fin du déroulé${NBSP}: 1 annonce n'a pas été faite. Elles ne sont pas cochées dans la liste.`);
    expect(finishedLabel(3)).toContain("3 annonces n'ont pas été faites");
  });
});

describe('progressLabel', () => {
  it('counts announcements from 1', () => {
    expect(progressLabel(6, 18)).toBe('Annonce 7 / 18');
  });
});

describe('stepCountLabel', () => {
  it('handles none, one and several', () => {
    expect(stepCountLabel(0)).toBe('Aucune annonce');
    expect(stepCountLabel(1)).toBe('1 annonce');
    expect(stepCountLabel(18)).toBe('18 annonces');
  });
});

describe('pointsLabel and gapLabel', () => {
  it('formats points with a thousands space and the right plural', () => {
    expect(pointsLabel(5841)).toBe(`5${NBSP}841 points`);
    expect(pointsLabel(1)).toBe('1 point');
    expect(gapLabel(10)).toBe("10 points d'avance sur le suivant");
  });
});

describe('winnerLine', () => {
  it('gives the club and points of a swimmer', () => {
    expect(winnerLine(winner({ name: 'DUPONT Marie', points: 1274 }))).toBe(`EN CAEN · 1${NBSP}274 points`);
  });

  it('does not repeat the club for a club winner, and shows a fun award detail', () => {
    expect(winnerLine(winner())).toBe(`5${NBSP}155 points`);
    expect(winnerLine(winner({ name: 'DUPONT Marie', points: null, detail: 'Née en 1950 (76 ans)' }))).toBe(
      'EN CAEN · Née en 1950 (76 ans)'
    );
  });
});

describe('warningLabel', () => {
  it('describes a tie announced together', () => {
    const tied = step({ rank: 2, winners: [winner(), winner({ name: 'UAS ST-CLOUD' })] });
    expect(warningLabel({ kind: 'tie', step: tied })).toBe(
      `2e place ex æquo (Classement par équipes · Mixte)${NBSP}: 2 ex æquo, annoncés ensemble. À départager si un seul prix est prévu.`
    );
  });

  it('gives the age of the last import in minutes, then hours', () => {
    expect(warningLabel({ kind: 'stale-import', minutes: 45 })).toBe(
      `Dernier import il y a 45 min${NBSP}: vérifiez que tous les résultats sont arrivés.`
    );
    expect(warningLabel({ kind: 'stale-import', minutes: 190 })).toContain('il y a 3 h');
  });

  it('names a category with nothing to announce', () => {
    expect(warningLabel({ kind: 'empty-category', category: 'Classement Dames' })).toBe(
      `Dames${NBSP}: aucun résultat à annoncer pour cette catégorie.`
    );
  });
});

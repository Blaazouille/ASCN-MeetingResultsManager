import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCsv } from '../src/lib/csv-parser';
import { computeTeamRanking } from '../src/lib/ranking-engine';
import { computeCategoryRanking } from '../src/lib/individual-ranking';
import { assignCompetitionRanks, findPodiumTies, tiedRanks } from '../src/lib/rank-ties';
import { rankText, tieAlertLabel } from '../src/lib/ui-labels';

const identity = (n: number): number => n;

function row(name: string, club: string, lastname: string, points: number) {
  return { name, place: 0, lastname, firstname: 'X', birthyear: 2000, nation: 'FRA', club, points, comment: '' };
}

describe('assignCompetitionRanks', () => {
  it('shares the rank between equal scores and skips the next one', () => {
    expect(assignCompetitionRanks([10, 8, 8, 5, 5, 1], identity)).toEqual([1, 2, 2, 4, 4, 6]);
  });

  it('gives 1..n when there is no tie', () => {
    expect(assignCompetitionRanks([9, 7, 3], identity)).toEqual([1, 2, 3]);
  });

  it('handles an empty list', () => {
    expect(assignCompetitionRanks([], identity)).toEqual([]);
  });
});

describe('tiedRanks / findPodiumTies', () => {
  const results = [{ rank: 1 }, { rank: 2 }, { rank: 2 }, { rank: 4 }, { rank: 5 }, { rank: 5 }];

  it('lists every shared rank', () => {
    expect([...tiedRanks(results)].sort()).toEqual([2, 5]);
  });

  it('keeps only ties inside the podium', () => {
    expect(findPodiumTies(results, 3)).toEqual([2]);
  });

  it('returns nothing when the podium has no tie', () => {
    expect(findPodiumTies([{ rank: 1 }, { rank: 2 }, { rank: 3 }, { rank: 4 }, { rank: 4 }], 3)).toEqual([]);
  });
});

describe('team ranking ties', () => {
  it('gives two clubs with the same total the same rank', () => {
    const rows = [
      row('Classement Mixte', 'A', 'a', 100),
      row('Classement Mixte', 'B', 'b', 100),
      row('Classement Mixte', 'C', 'c', 50),
    ];
    const ranked = computeTeamRanking(rows, { category: 'Classement Mixte', topN: 5 });
    expect(ranked.map((t) => t.rank)).toEqual([1, 1, 3]);
  });
});

describe('individual ranking ties', () => {
  it('gives equal-points swimmers the same rank within their category', () => {
    const rows = [
      row('Classement Dames', 'A', 'a', 90),
      row('Classement Dames', 'B', 'b', 90),
      row('Classement Dames', 'C', 'c', 80),
      row('Classement Messieurs', 'D', 'd', 85),
    ];
    expect(computeCategoryRanking(rows, 'Classement Dames').map((r) => r.rank)).toEqual([1, 1, 3]);
    expect(computeCategoryRanking(rows, 'Classement Messieurs').map((r) => r.rank)).toEqual([1]);
  });

  it('shares ranks for the real ties of the fixture (Dames, 933 pts)', () => {
    const { rows } = parseCsv(new Uint8Array(readFileSync(path.join(__dirname, 'fixtures', 'sample.csv'))));
    const dames = computeCategoryRanking(rows, 'Classement Dames');
    const at933 = dames.filter((r) => r.points === 933);
    expect(at933.length).toBeGreaterThan(1);
    expect(new Set(at933.map((r) => r.rank)).size).toBe(1);
  });
});

describe('labels', () => {
  it('marks tied ranks in exports', () => {
    expect(rankText(3, true)).toBe('3 ex.');
    expect(rankText(3, false)).toBe('3');
  });

  it('words the banner for one or several tied places', () => {
    expect(tieAlertLabel([3], 'Classement Mixte')).toBe('Égalité pour la 3e place en Mixte : à départager');
    expect(tieAlertLabel([1, 3], 'Classement Dames')).toContain('les places 1 et 3');
    expect(tieAlertLabel([1, 2, 3], 'Classement Dames')).toContain('les places 1, 2 et 3');
  });
});

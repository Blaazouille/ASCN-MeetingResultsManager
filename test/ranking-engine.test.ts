import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCsv } from '../src/lib/csv-parser';
import { computeTeamRanking, type TeamResult } from '../src/lib/ranking-engine';

const FIXTURE_DIR = path.join(__dirname, 'fixtures');

function loadRows() {
  const buffer = readFileSync(path.join(FIXTURE_DIR, 'sample.csv'));
  return parseCsv(new Uint8Array(buffer)).rows;
}

function loadExpectedRanking(): Array<Omit<TeamResult, 'swimmers'> & {
  swimmers: Array<{ lastname: string; firstname: string; birthyear: number; points: number }>;
}> {
  const raw = readFileSync(path.join(FIXTURE_DIR, 'expected-ranking.json'), 'utf-8');
  return JSON.parse(raw);
}

/** Drops the `rank` field the engine adds to each swimmer entry, which the reference fixture doesn't include. */
function stripSwimmerRank(result: TeamResult) {
  return {
    ...result,
    swimmers: result.swimmers.map(({ lastname, firstname, birthyear, points }) => ({
      lastname,
      firstname,
      birthyear,
      points,
    })),
  };
}

describe('computeTeamRanking — Classement Mixte, top 5 (reference fixture)', () => {
  const rows = loadRows();
  const result = computeTeamRanking(rows, { category: 'Classement Mixte', topN: 5 });
  const expected = loadExpectedRanking();

  it('produces exactly 38 clubs', () => {
    expect(result).toHaveLength(38);
    expect(expected).toHaveLength(38);
  });

  it('ranks CN VIRY-CHÂTILLON first with 5841 points', () => {
    expect(result[0]).toMatchObject({ rank: 1, club: 'CN VIRY-CHÂTILLON', totalPoints: 5841 });
  });

  it('matches the podium from the technical spec', () => {
    expect(result.slice(0, 5).map((team) => [team.rank, team.club, team.totalPoints])).toEqual([
      [1, 'CN VIRY-CHÂTILLON', 5841],
      [2, 'BOULOGNE BILLANCOURT NATATION', 5364],
      [3, 'AC CHERBOURG EN COTENTIN', 5201],
      [4, 'UAS ST-CLOUD', 5191],
      [5, 'EN CAEN', 5155],
    ]);
  });

  it('ranks CN BERGERAC last (38th) with 561 points', () => {
    expect(result[37]).toMatchObject({ rank: 38, club: 'CN BERGERAC', totalPoints: 561 });
  });

  it('matches the full reference ranking exactly (all 38 clubs, top 5 swimmers each)', () => {
    expect(result.map(stripSwimmerRank)).toEqual(expected);
  });

  it('assigns 1-indexed ranks with no gaps', () => {
    expect(result.map((team) => team.rank)).toEqual(Array.from({ length: 38 }, (_, i) => i + 1));
  });

  it('sorts club totals in strictly descending order', () => {
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.totalPoints).toBeLessThanOrEqual(result[i - 1]!.totalPoints);
    }
  });
});

describe('computeTeamRanking — algorithm behavior', () => {
  const rows = loadRows();

  it('keeps swimmerCount as the full club roster even when topN is smaller', () => {
    const result = computeTeamRanking(rows, { category: 'Classement Mixte', topN: 5 });
    const viry = result.find((team) => team.club === 'CN VIRY-CHÂTILLON');
    expect(viry?.swimmerCount).toBe(18);
    expect(viry?.swimmers).toHaveLength(5);
  });

  it('retains fewer than topN swimmers for a club with a smaller roster', () => {
    const result = computeTeamRanking(rows, { category: 'Classement Mixte', topN: 5 });
    const bergerac = result.find((team) => team.club === 'CN BERGERAC');
    expect(bergerac?.swimmerCount).toBe(1);
    expect(bergerac?.swimmers).toHaveLength(1);
  });

  it('changes totals when topN changes', () => {
    const top3 = computeTeamRanking(rows, { category: 'Classement Mixte', topN: 3 });
    const top5 = computeTeamRanking(rows, { category: 'Classement Mixte', topN: 5 });
    const viry3 = top3.find((team) => team.club === 'CN VIRY-CHÂTILLON')!;
    const viry5 = top5.find((team) => team.club === 'CN VIRY-CHÂTILLON')!;
    expect(viry3.totalPoints).toBeLessThan(viry5.totalPoints);
  });

  it('only includes rows from the requested category', () => {
    const result = computeTeamRanking(rows, { category: 'Classement Dames', topN: 5 });
    const totalSwimmers = result.reduce((sum, team) => sum + team.swimmerCount, 0);
    expect(totalSwimmers).toBe(90);
  });

  it('returns an empty ranking for an unknown category', () => {
    expect(computeTeamRanking(rows, { category: 'Classement Inexistant', topN: 5 })).toEqual([]);
  });
});

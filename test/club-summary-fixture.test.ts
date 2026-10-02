/**
 * Responsabilité : fige la situation de « Notre club » sur le vrai fichier du Meeting de la Mer (chiffres recalculés indépendamment à la relecture de la PR #63).
 * Appelé par : Vitest.
 * Suppression casserait : la garantie que la carte « Notre club » affiche les bons chiffres sur des données réelles.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCsv } from '../src/lib/csv-parser';
import { computeClubSummary } from '../src/lib/club-summary';

const rows = parseCsv(new Uint8Array(readFileSync(path.join(__dirname, 'fixtures', 'sample.csv')))).rows;

describe('computeClubSummary on the real meeting file', () => {
  it('places AS CHERBOURG NATATION 7th of 38 in Mixte (top 5), 23 pts behind the 6th and 14 ahead of the 8th', () => {
    const summary = computeClubSummary(rows, 'AS CHERBOURG NATATION', {
      categories: ['Classement Mixte'],
      topN: 5,
      minSwimmers: 0,
    });
    const mixte = summary?.categories[0];
    expect(mixte?.entered).toBe(30);
    expect(mixte?.status).toEqual({
      kind: 'ranked',
      rank: 7,
      tied: false,
      clubCount: 38,
      totalPoints: 4735,
      retained: 5,
      behind: { rank: 6, points: 23 },
      ahead: { rank: 8, points: 14 },
    });
  });
});

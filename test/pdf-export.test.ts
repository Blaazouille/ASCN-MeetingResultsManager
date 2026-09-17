import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCsv } from '../src/lib/csv-parser';
import { computeTeamRanking } from '../src/lib/ranking-engine';
import { buildPrintMeta } from '../src/lib/export-data';
import { buildRankingPdfBlob } from '../src/lib/pdf-export';

const FIXTURE_DIR = path.join(__dirname, 'fixtures');

const TEST_MEETING = {
  id: 1,
  name: 'Meeting de la Mer 2026',
  date: '2026-11-16',
  location: 'Cherbourg',
  status: 'provisional' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function loadRows() {
  const buffer = readFileSync(path.join(FIXTURE_DIR, 'sample.csv'));
  return parseCsv(new Uint8Array(buffer)).rows;
}

describe('buildRankingPdfBlob', () => {
  it('produces a non-empty application/pdf blob for the reference ranking', async () => {
    const rows = loadRows();
    const results = computeTeamRanking(rows, { category: 'Classement Mixte', topN: 5 });
    const meta = buildPrintMeta(TEST_MEETING);

    const blob = await buildRankingPdfBlob(meta, 'Classement Mixte', results);

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('resolves without throwing when there are no results', async () => {
    const meta = buildPrintMeta(TEST_MEETING);
    const blob = await buildRankingPdfBlob(meta, 'Classement Mixte', []);
    expect(blob.size).toBeGreaterThan(0);
  });
});

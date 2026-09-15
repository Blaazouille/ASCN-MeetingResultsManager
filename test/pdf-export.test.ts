import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCsv } from '../src/lib/csv-parser';
import { computeTeamRanking } from '../src/lib/ranking-engine';
import { buildPrintMeta } from '../src/lib/print-data';
import { buildRankingPdfBlob } from '../src/lib/pdf-export';

const FIXTURE_DIR = path.join(__dirname, 'fixtures');

function loadRows() {
  const buffer = readFileSync(path.join(FIXTURE_DIR, 'sample.csv'));
  return parseCsv(new Uint8Array(buffer)).rows;
}

describe('buildRankingPdfBlob', () => {
  it('produces a non-empty application/pdf blob for the reference ranking', async () => {
    const rows = loadRows();
    const results = computeTeamRanking(rows, { category: 'Classement Mixte', topN: 5 });
    const meta = buildPrintMeta();

    const blob = await buildRankingPdfBlob(meta, 'Classement Mixte', results);

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('resolves without throwing when there are no results', async () => {
    const meta = buildPrintMeta();
    const blob = await buildRankingPdfBlob(meta, 'Classement Mixte', []);
    expect(blob.size).toBeGreaterThan(0);
  });
});

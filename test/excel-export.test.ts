import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { parseCsv } from '../src/lib/csv-parser';
import { computeTeamRanking } from '../src/lib/ranking-engine';
import { buildPrintMeta } from '../src/lib/print-data';
import { buildRankingWorkbookBuffer } from '../src/lib/excel-export';

const FIXTURE_DIR = path.join(__dirname, 'fixtures');

const TEST_MEETING = {
  id: 1,
  name: 'Meeting de la Mer 2026',
  date: '2026-11-16',
  location: 'Cherbourg',
  status: 'provisional' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  defaultTopN: 5,
  minSwimmers: 0,
  activeCategories: null,
};

function loadRows() {
  const buffer = readFileSync(path.join(FIXTURE_DIR, 'sample.csv'));
  return parseCsv(new Uint8Array(buffer)).rows;
}

describe('buildRankingWorkbookBuffer', () => {
  it('produces a workbook with a sheet listing all 38 clubs, including ASCN', async () => {
    const rows = loadRows();
    const results = computeTeamRanking(rows, { category: 'Classement Mixte', topN: 5 });
    const meta = buildPrintMeta(TEST_MEETING);

    const buffer = await buildRankingWorkbookBuffer(meta, 'Classement Mixte', results);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0]!;

    // Header row + 38 club rows.
    expect(sheet.rowCount).toBe(39);

    const clubNames = sheet.getColumn(2)!.values!.slice(2) as string[];
    expect(clubNames).toContain('AS CHERBOURG NATATION');
    expect(clubNames).toHaveLength(38);
  });

  it('records the podium points at the right rows', async () => {
    const rows = loadRows();
    const results = computeTeamRanking(rows, { category: 'Classement Mixte', topN: 5 });
    const meta = buildPrintMeta(TEST_MEETING);

    const buffer = await buildRankingWorkbookBuffer(meta, 'Classement Mixte', results);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0]!;

    expect(sheet.getRow(2).getCell(2).value).toBe('CN VIRY-CHÂTILLON');
    expect(sheet.getRow(2).getCell(3).value).toBe(5841);
    expect(sheet.getRow(39).getCell(2).value).toBe('CN BERGERAC');
    expect(sheet.getRow(39).getCell(3).value).toBe(561);
  });

  it('strips characters Excel forbids in sheet names', async () => {
    const rows = loadRows();
    const results = computeTeamRanking(rows, { category: 'Classement Mixte', topN: 5 });
    const meta = buildPrintMeta(TEST_MEETING);

    const buffer = await buildRankingWorkbookBuffer(meta, 'Classement 100m [Dames]', results);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0]!;

    expect(sheet.name).not.toMatch(/[\\/?*:[\]]/);
    expect(sheet.name).toBe('100m Dames');
  });
});

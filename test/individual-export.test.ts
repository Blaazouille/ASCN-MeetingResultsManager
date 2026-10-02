import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { parseCsv } from '../src/lib/csv-parser';
import { computeCategoryRanking, type IndividualResult } from '../src/lib/individual-ranking';
import { buildExportMeta } from '../src/lib/export-data';
import { buildIndividualWorkbookBuffer } from '../src/lib/individual-excel-export';
import { buildIndividualPdfBlob } from '../src/lib/individual-pdf-export';

const TEST_MEETING = {
  id: 1,
  name: 'Meeting de la Mer 2026',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  defaultTopN: 5,
  minSwimmers: 0,
  activeCategories: null,
  resultCount: 0,
  lastImportedAt: null,
  clubCount: 0,
  swimmerCount: 0,
};

function loadDamesRanking(): IndividualResult[] {
  const buffer = readFileSync(path.join(__dirname, 'fixtures', 'sample.csv'));
  return computeCategoryRanking(parseCsv(new Uint8Array(buffer)).rows, 'Classement Dames');
}

async function loadSheet(buffer: ArrayBuffer): Promise<ExcelJS.Worksheet> {
  const workbook = new ExcelJS.Workbook();
  // ExcelJS types `load` with its own (non-exported) Buffer, an ArrayBuffer alias.
  await workbook.xlsx.load(buffer as Parameters<ExcelJS.Xlsx['load']>[0]);
  return workbook.worksheets[0]!;
}

describe('buildIndividualWorkbookBuffer', () => {
  it('names the sheet after the exported category, without the "Classement" prefix', async () => {
    const buffer = await buildIndividualWorkbookBuffer(
      buildExportMeta(TEST_MEETING),
      'Classement Dames',
      loadDamesRanking()
    );
    const sheet = await loadSheet(buffer);

    expect(sheet.name).toBe('Dames');
  });

  it('lists one row per swimmer of the category, without a "Catégorie" column', async () => {
    const results = loadDamesRanking();
    const buffer = await buildIndividualWorkbookBuffer(buildExportMeta(TEST_MEETING), 'Classement Dames', results);
    const sheet = await loadSheet(buffer);

    expect(sheet.rowCount).toBe(results.length + 1);
    const headers = (sheet.getRow(1).values as unknown[]).slice(1);
    expect(headers).toEqual(['Rang', 'Nom', 'Prénom', 'Naissance', 'Club', 'Points', 'Ex æquo']);
    expect(sheet.getRow(2).getCell(1).value).toBe(1);
    expect(sheet.getRow(2).getCell(6).value).toBe(results[0]!.points);
  });
});

describe('buildIndividualPdfBlob', () => {
  it('produces a non-empty application/pdf blob for a category ranking', async () => {
    const blob = await buildIndividualPdfBlob(buildExportMeta(TEST_MEETING), 'Classement Dames', loadDamesRanking());

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('resolves without throwing when there are no results', async () => {
    const blob = await buildIndividualPdfBlob(buildExportMeta(TEST_MEETING), 'Classement Dames', []);
    expect(blob.size).toBeGreaterThan(0);
  });
});

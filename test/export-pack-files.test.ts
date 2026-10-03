/**
 * Responsabilité : tests du contenu des fichiers du pack « Tout exporter » (export-pack-files.ts, palmares-pdf-export.tsx).
 * Appelé par : Vitest.
 * Suppression casserait : la garantie que le pack reprend les exports unitaires pour chaque catégorie exportée (issues #24 et #77).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { parseCsv } from '../src/lib/csv-parser';
import { buildExportMeta } from '../src/lib/export-data';
import { DEFAULT_OUR_CLUB } from '../src/lib/our-club';
import { buildPackFile, type ExportPackInput } from '../src/lib/export-pack-files';
import { planExportPack } from '../src/lib/export-pack-plan';
import { buildRankingWorkbookBuffer } from '../src/lib/excel-export';
import { computeTeamRanking } from '../src/lib/ranking-engine';
import { buildPalmaresPdfBlob } from '../src/lib/palmares-pdf-export';

const TEST_MEETING = {
  id: 1,
  name: 'Meeting de la Mer 2026',
  createdAt: '2026-01-01 00:00:00',
  updatedAt: '2026-01-01 00:00:00',
  defaultTopN: 5,
  minSwimmers: 0,
  activeCategories: null,
  resultCount: 0,
  lastImportedAt: null,
  clubCount: 0,
  swimmerCount: 0,
  isDemo: false,
};

const rows = parseCsv(new Uint8Array(readFileSync(path.join(__dirname, 'fixtures', 'sample.csv')))).rows;

function packInput(categories: string[]): ExportPackInput {
  return { meta: buildExportMeta(TEST_MEETING, DEFAULT_OUR_CLUB), rows, categories, topN: 5, minSwimmers: 0 };
}

async function loadWorkbook(bytes: Uint8Array): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  // Under Node, ExcelJS only reads a Node Buffer (not a plain Uint8Array); its
  // typings name their own non-exported Buffer type, hence the cast.
  await workbook.xlsx.load(Buffer.from(bytes) as unknown as Parameters<ExcelJS.Xlsx['load']>[0]);
  return workbook;
}

function sheetValues(sheet: ExcelJS.Worksheet): unknown[][] {
  const values: unknown[][] = [];
  sheet.eachRow((row) => values.push(row.values as unknown[]));
  return values;
}

function isPdf(bytes: Uint8Array): boolean {
  return new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';
}

describe('buildPackFile — team Excel', () => {
  it('holds one sheet per active category, in the given order', async () => {
    const bytes = await buildPackFile('team-excel', packInput(['Classement Dames', 'Classement Mixte']));
    const workbook = await loadWorkbook(bytes);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Dames', 'Mixte']);
  });

  it('gives each category the same sheet as its single-category export', async () => {
    const pack = await loadWorkbook(await buildPackFile('team-excel', packInput(['Classement Dames', 'Classement Mixte'])));
    const unit = await loadWorkbook(
      new Uint8Array(await buildRankingWorkbookBuffer(buildExportMeta(TEST_MEETING, DEFAULT_OUR_CLUB), [
        { category: 'Classement Mixte', results: computeTeamRanking(rows, { category: 'Classement Mixte', topN: 5 }) },
      ]))
    );
    expect(sheetValues(pack.getWorksheet('Mixte')!)).toEqual(sheetValues(unit.worksheets[0]!));
  });

  it('applies the top N of the request (reference ranking: Mixte, top 5)', async () => {
    const workbook = await loadWorkbook(await buildPackFile('team-excel', packInput(['Classement Mixte'])));
    const sheet = workbook.worksheets[0]!;
    expect(sheet.getRow(2).getCell(2).value).toBe('CN VIRY-CHÂTILLON');
    expect(sheet.getRow(2).getCell(3).value).toBe(5841);
    expect(sheet.rowCount).toBe(39);
  });

  it('leaves out inactive categories', async () => {
    const workbook = await loadWorkbook(await buildPackFile('team-excel', packInput(['Classement Mixte'])));
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Mixte']);
  });
});

describe('buildPackFile — individual Excel', () => {
  it('holds one sheet per active category listing every swimmer of that category', async () => {
    const workbook = await loadWorkbook(
      await buildPackFile('individual-excel', packInput(['Classement Dames', 'Classement Messieurs']))
    );
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Dames', 'Messieurs']);
    const damesCount = rows.filter((row) => row.name === 'Classement Dames').length;
    expect(workbook.getWorksheet('Dames')!.rowCount).toBe(damesCount + 1);
  });
});

// Issue #77: a category unticked in « Exporter le meeting » appears in no file of the pack.
describe('buildPackFile — pack planned with the ticked categories only', () => {
  const ACTIVE = ['Classement Dames', 'Classement Messieurs', 'Classement Mixte'];

  it.each(['team-excel', 'individual-excel'] as const)('%s holds only the ticked categories', async (kind) => {
    const plan = planExportPack(TEST_MEETING.name, ACTIVE, ['Classement Mixte', 'Classement Dames'], new Date());
    const workbook = await loadWorkbook(await buildPackFile(kind, packInput(plan.categories)));
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Dames', 'Mixte']);
  });
});

describe('buildPackFile — PDF files', () => {
  it.each(['team-pdf', 'individual-pdf', 'palmares-pdf'] as const)('%s is a PDF document', async (kind) => {
    const bytes = await buildPackFile(kind, packInput(['Classement Dames', 'Classement Mixte']));
    expect(isPdf(bytes)).toBe(true);
  });
});

describe('buildPalmaresPdfBlob', () => {
  it('still produces a PDF when a category has no prize', async () => {
    const blob = await buildPalmaresPdfBlob(buildExportMeta(TEST_MEETING, DEFAULT_OUR_CLUB), [{ category: 'Classement Dames', results: [] }]);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });
});

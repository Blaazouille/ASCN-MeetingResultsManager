/**
 * Responsabilité : vérifie que tout export (PDF/Excel, équipes/individuel, déroulé de cérémonie, pack « Tout exporter ») du meeting d'entraînement porte la mention « EXEMPLE — non officiel », et aucun export d'un vrai meeting.
 * Appelé par : Vitest.
 * Suppression casserait : le garde-fou qui empêche une feuille d'exemple de passer pour des résultats officiels.
 */
import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buildExportMeta, DEMO_EXPORT_NOTICE } from '../src/lib/export-data';
import { DEFAULT_OUR_CLUB } from '../src/lib/our-club';
import { pdfText } from './pdf-text';
import type { Meeting } from '../src/lib/db';
import { computeTeamRanking } from '../src/lib/ranking-engine';
import { computeCategoryRanking } from '../src/lib/individual-ranking';
import type { RawSwimmerRow } from '../src/lib/csv-parser';
import { buildRankingPdfBlob } from '../src/lib/pdf-export';
import { buildRankingWorkbookBuffer } from '../src/lib/excel-export';
import { buildIndividualPdfBlob } from '../src/lib/individual-pdf-export';
import { buildIndividualWorkbookBuffer } from '../src/lib/individual-excel-export';
import { buildCeremonyPdfBlob } from '../src/lib/ceremony-pdf-export';
import { buildCeremonyScript } from '../src/lib/ceremony-script';
import { buildPackFile } from '../src/lib/export-pack-files';
import { planExportPack } from '../src/lib/export-pack-plan';

const BASE_MEETING: Meeting = {
  id: 1,
  name: 'Entraînement',
  createdAt: '2026-10-01 10:00:00',
  updatedAt: '2026-10-01 10:00:00',
  defaultTopN: 5,
  minSwimmers: 0,
  activeCategories: null,
  resultCount: 1,
  lastImportedAt: null,
  clubCount: 1,
  swimmerCount: 1,
  isDemo: true,
};
const DEMO = BASE_MEETING;
const REAL: Meeting = { ...BASE_MEETING, name: 'Meeting de la Mer 2026', isDemo: false };

const ROWS: RawSwimmerRow[] = [
  { name: 'Classement Dames', place: 1, lastname: 'DURAND', firstname: 'Alice', birthyear: 1980, nation: 'FRA', club: 'CN TEST', points: 900, comment: '' },
];
const CATEGORY = 'Classement Dames';

async function firstSheet(buffer: ArrayBuffer): Promise<ExcelJS.Worksheet> {
  const workbook = new ExcelJS.Workbook();
  // ExcelJS types `load` with its own (non-exported) Buffer, an ArrayBuffer alias.
  await workbook.xlsx.load(buffer as Parameters<ExcelJS.Xlsx['load']>[0]);
  return workbook.worksheets[0]!;
}

describe('buildExportMeta notice', () => {
  it('carries "EXEMPLE — non officiel" for the training meeting only', () => {
    expect(DEMO_EXPORT_NOTICE).toBe('EXEMPLE — non officiel');
    expect(buildExportMeta(DEMO, DEFAULT_OUR_CLUB).notice).toBe(DEMO_EXPORT_NOTICE);
    expect(buildExportMeta(REAL, DEFAULT_OUR_CLUB).notice).toBeNull();
  });
});

describe('PDF exports of the training meeting', () => {
  it('print the notice on the team ranking, and not on a real meeting', async () => {
    const results = computeTeamRanking(ROWS, { category: CATEGORY, topN: 5 });

    expect(await pdfText(await buildRankingPdfBlob(buildExportMeta(DEMO, DEFAULT_OUR_CLUB), [{ category: CATEGORY, results }]))).toContain(DEMO_EXPORT_NOTICE);
    expect(await pdfText(await buildRankingPdfBlob(buildExportMeta(REAL, DEFAULT_OUR_CLUB), [{ category: CATEGORY, results }]))).not.toContain('EXEMPLE');
  });

  it('print the notice on the individual ranking', async () => {
    const results = computeCategoryRanking(ROWS, CATEGORY);
    const text = await pdfText(await buildIndividualPdfBlob(buildExportMeta(DEMO, DEFAULT_OUR_CLUB), [{ category: CATEGORY, results }]));

    expect(text).toContain(DEMO_EXPORT_NOTICE);
  });

  it('print the notice on the ceremony sheet, and not on a real meeting', async () => {
    const steps = buildCeremonyScript(DEMO, ROWS, { blocks: ['individual-prizes'], teamPlaces: 3 });

    expect(await pdfText(await buildCeremonyPdfBlob(buildExportMeta(DEMO, DEFAULT_OUR_CLUB), steps))).toContain(DEMO_EXPORT_NOTICE);
    expect(await pdfText(await buildCeremonyPdfBlob(buildExportMeta(REAL, DEFAULT_OUR_CLUB), steps))).not.toContain('EXEMPLE');
  });
});

describe('Excel exports of the training meeting', () => {
  it('open on the notice, above the unchanged team ranking table', async () => {
    const results = computeTeamRanking(ROWS, { category: CATEGORY, topN: 5 });
    const sheet = await firstSheet(await buildRankingWorkbookBuffer(buildExportMeta(DEMO, DEFAULT_OUR_CLUB), [{ category: CATEGORY, results }]));

    expect(sheet.getRow(1).getCell(1).value).toBe(DEMO_EXPORT_NOTICE);
    expect(sheet.getRow(2).getCell(1).value).toBe('Rang');
    expect(sheet.getRow(3).getCell(2).value).toBe('CN TEST');
  });

  it('open on the notice above the individual ranking table', async () => {
    const results = computeCategoryRanking(ROWS, CATEGORY);
    const sheet = await firstSheet(await buildIndividualWorkbookBuffer(buildExportMeta(DEMO, DEFAULT_OUR_CLUB), [{ category: CATEGORY, results }]));

    expect(sheet.getRow(1).getCell(1).value).toBe(DEMO_EXPORT_NOTICE);
    expect(sheet.getRow(2).getCell(1).value).toBe('Rang');
    expect(sheet.getRow(3).getCell(2).value).toBe('DURAND');
  });

  it('carry no notice for a real meeting', async () => {
    const results = computeTeamRanking(ROWS, { category: CATEGORY, topN: 5 });
    const sheet = await firstSheet(await buildRankingWorkbookBuffer(buildExportMeta(REAL, DEFAULT_OUR_CLUB), [{ category: CATEGORY, results }]));

    expect(sheet.getRow(1).getCell(1).value).toBe('Rang');
  });
});

describe('« Tout exporter » pack of the training meeting', () => {
  const PACK_ROWS: RawSwimmerRow[] = [
    ...ROWS,
    { name: 'Classement Messieurs', place: 1, lastname: 'MARTIN', firstname: 'Paul', birthyear: 1990, nation: 'FRA', club: 'CN TEST', points: 800, comment: '' },
  ];
  const CATEGORIES = ['Classement Dames', 'Classement Messieurs'];
  const packInput = (meeting: Meeting) => ({ meta: buildExportMeta(meeting, DEFAULT_OUR_CLUB), rows: PACK_ROWS, categories: CATEGORIES, topN: 5, minSwimmers: 0 });
  const files = planExportPack(DEMO.name, CATEGORIES, new Date()).files;
  const countNotices = (text: string): number => text.split(DEMO_EXPORT_NOTICE).length - 1;

  it.each(files.filter((file) => file.fileName.endsWith('.pdf')))('prints the notice on every page of $fileName', async ({ kind }) => {
    const bytes = await buildPackFile(kind, packInput(DEMO));
    const text = await pdfText(new Blob([bytes]));
    // One page per category, each opening on the notice.
    expect(countNotices(text)).toBe(CATEGORIES.length);
  });

  it.each(files.filter((file) => file.fileName.endsWith('.xlsx')))('opens every sheet of $fileName on the notice', async ({ kind }) => {
    const workbook = new ExcelJS.Workbook();
    const bytes = await buildPackFile(kind, packInput(DEMO));
    await workbook.xlsx.load(Buffer.from(bytes) as unknown as Parameters<ExcelJS.Xlsx['load']>[0]);
    expect(workbook.worksheets).toHaveLength(CATEGORIES.length);
    for (const sheet of workbook.worksheets) {
      expect(sheet.getRow(1).getCell(1).value).toBe(DEMO_EXPORT_NOTICE);
    }
  });

  it('carries no notice for a real meeting', async () => {
    const text = await pdfText(new Blob([await buildPackFile('palmares-pdf', packInput(REAL))]));
    expect(text).not.toContain('EXEMPLE');
  });
});

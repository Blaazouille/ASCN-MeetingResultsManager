/**
 * Responsabilité : vérifie que tout export (PDF/Excel, équipes/individuel) du meeting d'entraînement porte la mention « EXEMPLE — non officiel », et aucun export d'un vrai meeting.
 * Appelé par : Vitest.
 * Suppression casserait : le garde-fou qui empêche une feuille d'exemple de passer pour des résultats officiels.
 */
import { describe, expect, it } from 'vitest';
import { inflateSync } from 'node:zlib';
import ExcelJS from 'exceljs';
import { buildExportMeta, DEMO_EXPORT_NOTICE } from '../src/lib/export-data';
import type { Meeting } from '../src/lib/db';
import { computeTeamRanking } from '../src/lib/ranking-engine';
import { computeCategoryRanking } from '../src/lib/individual-ranking';
import type { RawSwimmerRow } from '../src/lib/csv-parser';
import { buildRankingPdfBlob } from '../src/lib/pdf-export';
import { buildRankingWorkbookBuffer } from '../src/lib/excel-export';
import { buildIndividualPdfBlob } from '../src/lib/individual-pdf-export';
import { buildIndividualWorkbookBuffer } from '../src/lib/individual-excel-export';

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

/**
 * Text drawn on the PDF pages. @react-pdf writes each line as a TJ array of
 * hex strings in the standard WinAnsi encoding, inside Flate-compressed
 * content streams: inflate them and join the hex runs of every TJ.
 */
async function pdfText(blob: Blob): Promise<string> {
  const bytes = Buffer.from(await blob.arrayBuffer());
  const raw = bytes.toString('latin1');
  const lines: string[] = [];
  for (const match of raw.matchAll(/(?<!end)stream\r?\n/g)) {
    const start = match.index + match[0].length;
    const end = raw.indexOf('endstream', start);
    let content: string;
    try {
      content = inflateSync(bytes.subarray(start, end)).toString('latin1');
    } catch {
      continue; // Fonts and images: not text.
    }
    for (const tj of content.matchAll(/\[([^\]]*)\]\s*TJ/g)) {
      const hex = [...tj[1]!.matchAll(/<([0-9a-fA-F]*)>/g)].map((h) => h[1]).join('');
      // WinAnsi is Latin-1 except 0x80-0x9F; the em dash (0x97) is the only one these exports use.
      lines.push(Buffer.from(hex, 'hex').toString('latin1').replace(/\x97/g, '—'));
    }
  }
  return lines.join('\n');
}

async function firstSheet(buffer: ArrayBuffer): Promise<ExcelJS.Worksheet> {
  const workbook = new ExcelJS.Workbook();
  // ExcelJS types `load` with its own (non-exported) Buffer, an ArrayBuffer alias.
  await workbook.xlsx.load(buffer as Parameters<ExcelJS.Xlsx['load']>[0]);
  return workbook.worksheets[0]!;
}

describe('buildExportMeta notice', () => {
  it('carries "EXEMPLE — non officiel" for the training meeting only', () => {
    expect(DEMO_EXPORT_NOTICE).toBe('EXEMPLE — non officiel');
    expect(buildExportMeta(DEMO).notice).toBe(DEMO_EXPORT_NOTICE);
    expect(buildExportMeta(REAL).notice).toBeNull();
  });
});

describe('PDF exports of the training meeting', () => {
  it('print the notice on the team ranking, and not on a real meeting', async () => {
    const results = computeTeamRanking(ROWS, { category: CATEGORY, topN: 5 });

    expect(await pdfText(await buildRankingPdfBlob(buildExportMeta(DEMO), CATEGORY, results))).toContain(DEMO_EXPORT_NOTICE);
    expect(await pdfText(await buildRankingPdfBlob(buildExportMeta(REAL), CATEGORY, results))).not.toContain('EXEMPLE');
  });

  it('print the notice on the individual ranking', async () => {
    const results = computeCategoryRanking(ROWS, CATEGORY);
    const text = await pdfText(await buildIndividualPdfBlob(buildExportMeta(DEMO), CATEGORY, results));

    expect(text).toContain(DEMO_EXPORT_NOTICE);
  });
});

describe('Excel exports of the training meeting', () => {
  it('open on the notice, above the unchanged team ranking table', async () => {
    const results = computeTeamRanking(ROWS, { category: CATEGORY, topN: 5 });
    const sheet = await firstSheet(await buildRankingWorkbookBuffer(buildExportMeta(DEMO), CATEGORY, results));

    expect(sheet.getRow(1).getCell(1).value).toBe(DEMO_EXPORT_NOTICE);
    expect(sheet.getRow(2).getCell(1).value).toBe('Rang');
    expect(sheet.getRow(3).getCell(2).value).toBe('CN TEST');
  });

  it('open on the notice above the individual ranking table', async () => {
    const results = computeCategoryRanking(ROWS, CATEGORY);
    const sheet = await firstSheet(await buildIndividualWorkbookBuffer(buildExportMeta(DEMO), CATEGORY, results));

    expect(sheet.getRow(1).getCell(1).value).toBe(DEMO_EXPORT_NOTICE);
    expect(sheet.getRow(2).getCell(1).value).toBe('Rang');
    expect(sheet.getRow(3).getCell(2).value).toBe('DURAND');
  });

  it('carry no notice for a real meeting', async () => {
    const results = computeTeamRanking(ROWS, { category: CATEGORY, topN: 5 });
    const sheet = await firstSheet(await buildRankingWorkbookBuffer(buildExportMeta(REAL), CATEGORY, results));

    expect(sheet.getRow(1).getCell(1).value).toBe('Rang');
  });
});

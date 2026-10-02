/**
 * Responsabilité : génère et télécharge le classeur Excel du classement individuel.
 * Appelé par : use-individual-export.ts (bouton "Export Excel" de IndividualPage).
 * Suppression casserait : l'export Excel du classement individuel.
 */
import ExcelJS from 'exceljs';
import type { IndividualResult } from './individual-ranking';
import { tiedRanks } from './rank-ties';
import type { ExportMeta } from './export-data';
import { excelSheetName, individualExportFileName } from './export-data';
import { downloadBlob } from './download';

/** Builds the workbook without downloading it, so tests can inspect its content. */
export async function buildIndividualWorkbookBuffer(
  meta: ExportMeta,
  category: string,
  results: IndividualResult[]
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = meta.meetingName;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(excelSheetName(category));

  sheet.columns = [
    { header: 'Rang', key: 'rank', width: 8 },
    { header: 'Nom', key: 'lastname', width: 18 },
    { header: 'Prénom', key: 'firstname', width: 16 },
    { header: 'Naissance', key: 'birthyear', width: 12 },
    { header: 'Club', key: 'club', width: 36 },
    { header: 'Points', key: 'points', width: 10 },
    // Last column: the rank stays a number so sorting and formulas keep working.
    { header: 'Ex æquo', key: 'tied', width: 10 },
  ];
  sheet.getRow(1).font = { bold: true };

  const tied = tiedRanks(results);
  for (const r of results) {
    sheet.addRow({
      rank: r.rank,
      lastname: r.lastname,
      firstname: r.firstname,
      birthyear: r.birthyear,
      club: r.club,
      points: r.points,
      tied: tied.has(r.rank) ? 'ex.' : '',
    });
  }

  // Inserted last, above the header row, so it is the first line seen when the file opens.
  if (meta.notice) {
    sheet.spliceRows(1, 0, [meta.notice]);
    sheet.getRow(1).font = { bold: true, color: { argb: 'FF92400E' } };
  }

  return workbook.xlsx.writeBuffer();
}

/** Builds the individual ranking workbook and triggers a browser download. */
export async function exportIndividualToExcel(
  meta: ExportMeta,
  category: string,
  results: IndividualResult[]
): Promise<void> {
  const buffer = await buildIndividualWorkbookBuffer(meta, category, results);
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, individualExportFileName(category, 'xlsx'));
}

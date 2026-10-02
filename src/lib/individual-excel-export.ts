/**
 * Responsabilité : génère et télécharge le classeur Excel du classement individuel (une feuille par catégorie).
 * Appelé par : use-individual-export.ts (bouton "Export Excel" de IndividualPage), export-pack-files.ts (« Tout exporter »).
 * Suppression casserait : l'export Excel du classement individuel et le pack de fin de meeting.
 */
import ExcelJS from 'exceljs';
import type { IndividualResult } from './individual-ranking';
import { tiedRanks } from './rank-ties';
import type { ExportMeta, ExportSection } from './export-data';
import { excelSheetName, individualExportFileName } from './export-data';
import { downloadBlob } from './download';

function addIndividualSheet(workbook: ExcelJS.Workbook, { category, results }: ExportSection<IndividualResult>): void {
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
}

/**
 * Builds the workbook without downloading it (tests inspect its content), one
 * sheet per section so the single-category export and the full-meeting pack share one layout.
 */
export async function buildIndividualWorkbookBuffer(
  meta: ExportMeta,
  sections: ExportSection<IndividualResult>[]
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = meta.meetingName;
  workbook.created = new Date();
  for (const section of sections) {
    addIndividualSheet(workbook, section);
  }
  return workbook.xlsx.writeBuffer();
}

/** Builds the individual ranking workbook and triggers a browser download. */
export async function exportIndividualToExcel(
  meta: ExportMeta,
  category: string,
  results: IndividualResult[]
): Promise<void> {
  const buffer = await buildIndividualWorkbookBuffer(meta, [{ category, results }]);
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, individualExportFileName(category, 'xlsx'));
}

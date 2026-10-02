/**
 * Responsabilité : génère et télécharge le classeur Excel du classement individuel.
 * Appelé par : use-individual-export.ts (bouton "Export Excel" de IndividualPage).
 * Suppression casserait : l'export Excel du classement individuel.
 */
import ExcelJS from 'exceljs';
import type { IndividualResult } from './individual-ranking';
import { tiedRanks } from './rank-ties';
import type { ExportMeta } from './export-data';
import { downloadBlob } from './download';

export async function exportIndividualToExcel(
  meta: ExportMeta,
  category: string,
  results: IndividualResult[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = meta.meetingName;
  workbook.created = new Date();

  const sheetLabel = category === 'Tous' ? 'Toutes catégories' : category.replace(/^Classement\s+/i, '');
  const sheet = workbook.addWorksheet(sheetLabel);

  const showCategory = category === 'Tous';

  const columns: Partial<ExcelJS.Column>[] = [
    { header: 'Rang', key: 'rank', width: 8 },
    { header: 'Nom', key: 'lastname', width: 18 },
    { header: 'Prénom', key: 'firstname', width: 16 },
    { header: 'Naissance', key: 'birthyear', width: 12 },
    { header: 'Club', key: 'club', width: 36 },
    { header: 'Points', key: 'points', width: 10 },
  ];
  if (showCategory) {
    columns.push({ header: 'Catégorie', key: 'category', width: 16 });
  }
  // Last column: the rank stays a number so sorting and formulas keep working.
  columns.push({ header: 'Ex æquo', key: 'tied', width: 10 });
  sheet.columns = columns as ExcelJS.Column[];
  sheet.getRow(1).font = { bold: true };

  const tied = tiedRanks(results);
  for (const r of results) {
    const row: Record<string, unknown> = {
      rank: r.rank,
      lastname: r.lastname,
      firstname: r.firstname,
      birthyear: r.birthyear,
      club: r.club,
      points: r.points,
      tied: tied.has(r.rank) ? 'ex.' : '',
    };
    if (showCategory) {
      row['category'] = r.category.replace(/^Classement\s+/i, '');
    }
    sheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const today = new Date().toISOString().slice(0, 10);
  const slug = category.replace(/^Classement\s+/i, '').toLowerCase().replace(/\s+/g, '-') || 'tous';
  downloadBlob(blob, `classement-individuel-${slug}-${today}.xlsx`);
}

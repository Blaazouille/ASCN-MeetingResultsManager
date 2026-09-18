/**
 * Responsabilité : génère et télécharge le classeur Excel du classement individuel.
 * Appelé par : use-individual-export.ts (bouton "Export Excel" de IndividualPage).
 * Suppression casserait : l'export Excel du classement individuel.
 */
import ExcelJS from 'exceljs';
import type { IndividualResult } from './individual-ranking';
import type { PrintMeta } from './export-data';
import { downloadBlob } from './download';

const GENDER_LABEL: Record<string, string> = {
  all: 'Tous',
  F: 'Dames',
  M: 'Messieurs',
};

const GENDER_SLUG: Record<string, string> = {
  all: 'tous',
  F: 'dames',
  M: 'messieurs',
};

export async function exportIndividualToExcel(
  meta: PrintMeta,
  genderFilter: string,
  results: IndividualResult[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = meta.meetingName;
  workbook.created = new Date();

  const sheetLabel = GENDER_LABEL[genderFilter] ?? genderFilter;
  const sheet = workbook.addWorksheet(sheetLabel);

  const showCategory = genderFilter === 'all';

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
  sheet.columns = columns as ExcelJS.Column[];
  sheet.getRow(1).font = { bold: true };

  for (const r of results) {
    const row: Record<string, unknown> = {
      rank: r.rank,
      lastname: r.lastname,
      firstname: r.firstname,
      birthyear: r.birthyear,
      club: r.club,
      points: r.points,
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
  const slug = GENDER_SLUG[genderFilter] ?? genderFilter;
  downloadBlob(blob, `classement-individuel-${slug}-${today}.xlsx`);
}

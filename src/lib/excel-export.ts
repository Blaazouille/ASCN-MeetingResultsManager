import ExcelJS from 'exceljs';
import type { TeamResult } from './ranking-engine';
import type { PrintMeta } from './print-data';
import { slugifyCategory } from './print-data';
import { downloadBlob } from './download';

const COLUMN_HEADERS = ['Rang', 'Club', 'Points', 'Nageurs retenus'];

function formatSwimmerList(team: TeamResult): string {
  return team.swimmers.map((swimmer) => `${swimmer.lastname} ${swimmer.firstname}`).join(', ');
}

/** Builds the ranking workbook and returns its raw bytes, without triggering a download. */
export async function buildRankingWorkbookBuffer(
  meta: PrintMeta,
  category: string,
  results: TeamResult[]
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = meta.meetingName;
  workbook.created = new Date();

  const sheetName = category.replace(/^Classement\s+/i, '').slice(0, 31) || 'Classement';
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = [
    { header: COLUMN_HEADERS[0], key: 'rank', width: 8 },
    { header: COLUMN_HEADERS[1], key: 'club', width: 36 },
    { header: COLUMN_HEADERS[2], key: 'points', width: 12 },
    { header: COLUMN_HEADERS[3], key: 'swimmers', width: 60 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const team of results) {
    sheet.addRow({
      rank: team.rank,
      club: team.club,
      points: team.totalPoints,
      swimmers: formatSwimmerList(team),
    });
  }

  return workbook.xlsx.writeBuffer();
}

/** Builds the ranking workbook and triggers a browser download. */
export async function exportRankingToExcel(
  meta: PrintMeta,
  category: string,
  results: TeamResult[]
): Promise<void> {
  const buffer = await buildRankingWorkbookBuffer(meta, category, results);
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const today = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `classement-${slugifyCategory(category)}-${today}.xlsx`);
}

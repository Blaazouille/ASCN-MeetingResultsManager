/**
 * Responsabilité : génère et télécharge le classeur Excel du classement par équipes.
 * Appelé par : use-ranking-export.ts (bouton "Export Excel" de RankingPage).
 * Suppression casserait : l'export Excel du classement.
 */
import ExcelJS from 'exceljs';
import type { TeamResult } from './ranking-engine';
import { tiedRanks } from './rank-ties';
import type { ExportMeta } from './export-data';
import { slugifyCategory } from './export-data';
import { downloadBlob } from './download';

const COLUMN_HEADERS = ['Rang', 'Club', 'Points', 'Nageurs retenus'];

function formatSwimmerList(team: TeamResult): string {
  return team.swimmers.map((swimmer) => `${swimmer.lastname} ${swimmer.firstname}`).join(', ');
}

export async function buildRankingWorkbookBuffer(
  meta: ExportMeta,
  category: string,
  results: TeamResult[]
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = meta.meetingName;
  workbook.created = new Date();

  const sheetName =
    category
      .replace(/^Classement\s+/i, '')
      .replace(/[\\/?*:[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 31) || 'Classement';
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = [
    { header: COLUMN_HEADERS[0], key: 'rank', width: 8 },
    { header: COLUMN_HEADERS[1], key: 'club', width: 36 },
    { header: COLUMN_HEADERS[2], key: 'points', width: 12 },
    { header: COLUMN_HEADERS[3], key: 'swimmers', width: 60 },
    // Separate column: the rank stays a number so sorting and formulas keep working.
    { header: 'Ex æquo', key: 'tied', width: 10 },
  ];
  sheet.getRow(1).font = { bold: true };

  const tied = tiedRanks(results);
  for (const team of results) {
    sheet.addRow({
      rank: team.rank,
      tied: tied.has(team.rank) ? 'ex.' : '',
      club: team.club,
      points: team.totalPoints,
      swimmers: formatSwimmerList(team),
    });
  }

  return workbook.xlsx.writeBuffer();
}

/** Builds the ranking workbook and triggers a browser download. */
export async function exportRankingToExcel(
  meta: ExportMeta,
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

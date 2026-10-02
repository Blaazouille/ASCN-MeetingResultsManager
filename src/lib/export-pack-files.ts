/**
 * Responsabilité : produit le contenu (octets) de chaque fichier du pack de fin de meeting à partir des générateurs d'export existants.
 * Appelé par : use-export-pack.ts.
 * Suppression casserait : le bouton « Tout exporter » de l'écran Classement (aucun fichier ne serait généré).
 */
import type { RawSwimmerRow } from './csv-parser';
import type { ExportMeta, ExportSection } from './export-data';
import type { ExportPackFileKind } from './export-pack-plan';
import { computeTeamRanking, type TeamResult } from './ranking-engine';
import { computeCategoryRanking, type IndividualResult } from './individual-ranking';
import { computeFunAwards, type FunAward } from './fun-awards';
import { buildRankingPdfBlob } from './pdf-export';
import { buildRankingWorkbookBuffer } from './excel-export';
import { buildIndividualPdfBlob } from './individual-pdf-export';
import { buildIndividualWorkbookBuffer } from './individual-excel-export';
import { buildPalmaresPdfBlob } from './palmares-pdf-export';

export interface ExportPackInput {
  meta: ExportMeta;
  rows: RawSwimmerRow[];
  /** Active categories of the meeting, in display order. */
  categories: string[];
  topN: number;
  minSwimmers: number;
}

function sections<T>(categories: string[], compute: (category: string) => T[]): ExportSection<T>[] {
  return categories.map((category) => ({ category, results: compute(category) }));
}

function teamSections({ rows, categories, topN, minSwimmers }: ExportPackInput): ExportSection<TeamResult>[] {
  return sections(categories, (category) => computeTeamRanking(rows, { category, topN, minSwimmers }));
}

function individualSections({ rows, categories }: ExportPackInput): ExportSection<IndividualResult>[] {
  return sections(categories, (category) => computeCategoryRanking(rows, category));
}

// Same per-category filter as PalmaresPage, so the PDF shows the prizes seen on screen.
function palmaresSections({ rows, categories }: ExportPackInput): ExportSection<FunAward>[] {
  return sections(categories, (category) => computeFunAwards(rows.filter((row) => row.name === category)));
}

async function blobBytes(blob: Promise<Blob>): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await (await blob).arrayBuffer());
}

async function bufferBytes(buffer: Promise<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await buffer);
}

/**
 * A lookup map rather than a switch: each kind reuses the unit export's
 * generator with every active category as a section, so a pack file is laid
 * out exactly like the single-category export (acceptance criterion of #24).
 */
const BUILDERS: Record<ExportPackFileKind, (input: ExportPackInput) => Promise<Uint8Array<ArrayBuffer>>> = {
  'team-pdf': (input) => blobBytes(buildRankingPdfBlob(input.meta, teamSections(input))),
  'team-excel': (input) => bufferBytes(buildRankingWorkbookBuffer(input.meta, teamSections(input))),
  'individual-pdf': (input) => blobBytes(buildIndividualPdfBlob(input.meta, individualSections(input))),
  'individual-excel': (input) => bufferBytes(buildIndividualWorkbookBuffer(input.meta, individualSections(input))),
  'palmares-pdf': (input) => blobBytes(buildPalmaresPdfBlob(input.meta, palmaresSections(input))),
};

/** Bytes of one pack file; rejects if its generator fails, so the caller can skip just that file. */
export function buildPackFile(kind: ExportPackFileKind, input: ExportPackInput): Promise<Uint8Array<ArrayBuffer>> {
  return BUILDERS[kind](input);
}

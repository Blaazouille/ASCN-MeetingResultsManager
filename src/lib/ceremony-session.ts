/**
 * Responsabilité : déroulé figé au lancement (étapes + progression) et sa relecture depuis le stockage de session.
 * Appelé par : use-ceremony.ts et les tests.
 * Suppression casserait : la reprise du déroulé après un passage par un autre écran (ex. un réimport).
 */
import { CEREMONY_BLOCKS, type CeremonyStep, type CeremonyWinner } from './ceremony-script';
import type { CeremonyProgress } from './ceremony-navigation';

/** A ceremony in progress: the script frozen at launch, so a re-import can't reshuffle it mid-ceremony. */
export interface CeremonyRun {
  meetingId: number;
  /** The meeting's lastImportedAt when the script was built: a different value means newer data exist. */
  importedAt: string | null;
  steps: CeremonyStep[];
  progress: CeremonyProgress;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || typeof value === 'number';
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isWinner(value: unknown): value is CeremonyWinner {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.club === 'string' &&
    isNumberOrNull(value.points) &&
    isStringOrNull(value.detail) &&
    Array.isArray(value.swimmers) &&
    value.swimmers.every((swimmer) => typeof swimmer === 'string')
  );
}

function isStep(value: unknown): value is CeremonyStep {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    (CEREMONY_BLOCKS as readonly unknown[]).includes(value.block) &&
    typeof value.category === 'string' &&
    isNumberOrNull(value.rank) &&
    isStringOrNull(value.awardTitle) &&
    Array.isArray(value.winners) &&
    value.winners.every(isWinner) &&
    isNumberOrNull(value.gapToNext)
  );
}

function isStepIndex(value: unknown, total: number): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < total;
}

function isProgress(value: unknown, total: number): value is CeremonyProgress {
  return (
    isRecord(value) &&
    isStepIndex(value.current, total) &&
    Array.isArray(value.shown) &&
    value.shown.every((index) => isStepIndex(index, total)) &&
    typeof value.finished === 'boolean'
  );
}

/**
 * Reads back a stored run. Anything unexpected (absent, corrupted, written by
 * another version of the app) gives null: the manager simply prepares the
 * ceremony again rather than reading a broken script.
 */
export function parseCeremonyRun(raw: string | null): CeremonyRun | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !isRecord(value) ||
    typeof value.meetingId !== 'number' ||
    !isStringOrNull(value.importedAt) ||
    !Array.isArray(value.steps) ||
    value.steps.length === 0 ||
    !value.steps.every(isStep) ||
    !isProgress(value.progress, value.steps.length)
  ) {
    return null;
  }
  return { meetingId: value.meetingId, importedAt: value.importedAt, steps: value.steps, progress: value.progress };
}

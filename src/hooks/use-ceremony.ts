/**
 * Responsabilité : état de l'écran Cérémonie (préparation, catégories annoncées, déroulé figé, annonce courante, confirmation de sortie).
 * Appelé par : CeremonyPage.tsx.
 * Suppression casserait : l'écran Cérémonie.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RawSwimmerRow } from '@/lib/csv-parser';
import type { Meeting } from '@/lib/db';
import { buildCeremonyScript, ceremonyCategories, DEFAULT_TEAM_PLACES, type CeremonyBlock, type CeremonyStep } from '@/lib/ceremony-script';
import {
  DEFAULT_PLAN,
  moveBlock,
  planToOptions,
  resolveCeremonyCategories,
  toggleBlock,
  type PlannedBlock,
} from '@/lib/ceremony-plan';
import { isMissingPickedCategory, togglePickedCategory } from '@/lib/category-picking';
import { goToStep, moveStep, START_PROGRESS, type CeremonyMove } from '@/lib/ceremony-navigation';
import { parseCeremonyRun, type CeremonyRun } from '@/lib/ceremony-session';
import { ceremonyWarnings, type CeremonyWarning } from '@/lib/ceremony-warnings';
import { useCeremonyShortcuts } from './use-ceremony-shortcuts';

// sessionStorage, not SQLite: the run only has to survive a detour through
// another screen (e.g. a re-import) during the ceremony; losing it when the
// app closes is fine, and it keeps the database schema untouched.
const STORAGE_KEY = 'ceremony-run';

function readStoredRun(): CeremonyRun | null {
  try {
    return parseCeremonyRun(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function storeRun(run: CeremonyRun | null): void {
  try {
    if (run === null) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(run));
  } catch {
    // Storage unavailable: the ceremony still works, it just won't survive leaving the screen.
  }
}

export interface UseCeremonyResult {
  plan: PlannedBlock[];
  toggleBlock: (block: CeremonyBlock) => void;
  moveBlock: (index: number, delta: -1 | 1) => void;
  teamPlaces: number;
  setTeamPlaces: (places: number) => void;
  /** Categories that can be announced: the meeting's active categories found in the data. */
  availableCategories: string[];
  /** Categories ticked for the ceremony (Mixte only by default); empty when the manager unticked them all. */
  categories: string[];
  /** True when categories are available but none is ticked: launching and printing are blocked. */
  isMissingCategory: boolean;
  toggleCategory: (category: string) => void;
  /** The script as it would be launched now, from the current data and plan. */
  preview: CeremonyStep[];
  warnings: CeremonyWarning[];
  /** The frozen script being announced; null while preparing. */
  run: CeremonyRun | null;
  /** True when results were imported after the run was launched. */
  hasNewerData: boolean;
  start: () => void;
  /** True while the « Abandonner le déroulé ? » confirmation is open. */
  isLeaving: boolean;
  /** Asks for confirmation before dropping the run: its progress can't be recovered. */
  requestLeave: () => void;
  cancelLeave: () => void;
  confirmLeave: () => void;
  step: (move: CeremonyMove) => void;
  goTo: (index: number) => void;
}

export function useCeremony(meeting: Meeting | null, rows: RawSwimmerRow[]): UseCeremonyResult {
  const [plan, setPlan] = useState<PlannedBlock[]>([...DEFAULT_PLAN]);
  const [teamPlaces, setTeamPlaces] = useState(DEFAULT_TEAM_PLACES);
  // null until the manager touches a box: the default then follows the data,
  // which loads after the first render. Kept in memory only, like the rest of
  // the preparation; once launched, the run carries its own frozen steps.
  const [chosenCategories, setChosenCategories] = useState<string[] | null>(null);
  const [storedRun, setStoredRun] = useState<CeremonyRun | null>(readStoredRun);
  // A run stored for another meeting is ignored, not shown under this one.
  const run = storedRun !== null && storedRun.meetingId === meeting?.id ? storedRun : null;

  useEffect(() => storeRun(storedRun), [storedRun]);

  const availableCategories = useMemo(() => (meeting === null ? [] : ceremonyCategories(meeting, rows)), [meeting, rows]);
  const categories = useMemo(
    () => resolveCeremonyCategories(availableCategories, chosenCategories),
    [availableCategories, chosenCategories]
  );

  const preview = useMemo(
    () => (meeting === null ? [] : buildCeremonyScript(meeting, rows, planToOptions(plan, teamPlaces, categories))),
    [meeting, rows, plan, teamPlaces, categories]
  );
  const warnings = useMemo(
    () => (meeting === null ? [] : ceremonyWarnings(meeting, rows, preview, categories, new Date())),
    [meeting, rows, preview, categories]
  );

  const start = useCallback((): void => {
    if (meeting === null || preview.length === 0) return;
    setStoredRun({ meetingId: meeting.id, importedAt: meeting.lastImportedAt, steps: preview, progress: START_PROGRESS });
  }, [meeting, preview]);

  const [isLeaving, setIsLeaving] = useState(false);
  const confirmLeave = useCallback((): void => {
    setIsLeaving(false);
    setStoredRun(null);
  }, []);

  const step = useCallback((move: CeremonyMove): void => {
    setStoredRun((current) => current && { ...current, progress: moveStep(current.progress, move, current.steps.length) });
  }, []);

  const goTo = useCallback((index: number): void => {
    setStoredRun((current) => current && { ...current, progress: goToStep(current.progress, index, current.steps.length) });
  }, []);

  useCeremonyShortcuts(run !== null, isLeaving, step);

  return {
    plan,
    toggleBlock: (block) => setPlan((current) => toggleBlock(current, block)),
    moveBlock: (index, delta) => setPlan((current) => moveBlock(current, index, delta)),
    teamPlaces,
    setTeamPlaces,
    availableCategories,
    categories,
    isMissingCategory: isMissingPickedCategory(availableCategories, categories),
    // Toggled from what is shown (resolved), not from the raw choice, so the
    // first click on a default box behaves exactly as it looks.
    toggleCategory: (category) =>
      setChosenCategories((current) => togglePickedCategory(resolveCeremonyCategories(availableCategories, current), category)),
    preview,
    warnings,
    run,
    hasNewerData: run !== null && meeting !== null && meeting.lastImportedAt !== run.importedAt,
    start,
    isLeaving,
    requestLeave: () => setIsLeaving(true),
    cancelLeave: () => setIsLeaving(false),
    confirmLeave,
    step,
    goTo,
  };
}

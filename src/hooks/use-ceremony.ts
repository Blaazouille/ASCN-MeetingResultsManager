/**
 * Responsabilité : état de l'écran Cérémonie (préparation, déroulé figé, annonce courante, raccourcis clavier).
 * Appelé par : CeremonyPage.tsx.
 * Suppression casserait : l'écran Cérémonie.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RawSwimmerRow } from '@/lib/csv-parser';
import type { Meeting } from '@/lib/db';
import { buildCeremonyScript, DEFAULT_TEAM_PLACES, type CeremonyBlock, type CeremonyStep } from '@/lib/ceremony-script';
import { DEFAULT_PLAN, moveBlock, planToOptions, toggleBlock, type PlannedBlock } from '@/lib/ceremony-plan';
import { goToStep, keyToMove, moveStep, START_PROGRESS, type CeremonyMove } from '@/lib/ceremony-navigation';
import { parseCeremonyRun, type CeremonyRun } from '@/lib/ceremony-session';
import { ceremonyWarnings, type CeremonyWarning } from '@/lib/ceremony-warnings';

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

/** Shortcuts must not hijack typing, nor double a space that already clicks the focused button. */
function shortcutMove(event: KeyboardEvent): CeremonyMove | null {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return null;
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('input, textarea, select')) return null;
  if (event.key === ' ' && target?.closest('button, a')) return null;
  return keyToMove(event.key);
}

export interface UseCeremonyResult {
  plan: PlannedBlock[];
  toggleBlock: (block: CeremonyBlock) => void;
  moveBlock: (index: number, delta: -1 | 1) => void;
  teamPlaces: number;
  setTeamPlaces: (places: number) => void;
  /** The script as it would be launched now, from the current data and plan. */
  preview: CeremonyStep[];
  warnings: CeremonyWarning[];
  /** The frozen script being announced; null while preparing. */
  run: CeremonyRun | null;
  /** True when results were imported after the run was launched. */
  hasNewerData: boolean;
  start: () => void;
  stop: () => void;
  step: (move: CeremonyMove) => void;
  goTo: (index: number) => void;
}

export function useCeremony(meeting: Meeting | null, rows: RawSwimmerRow[]): UseCeremonyResult {
  const [plan, setPlan] = useState<PlannedBlock[]>([...DEFAULT_PLAN]);
  const [teamPlaces, setTeamPlaces] = useState(DEFAULT_TEAM_PLACES);
  const [storedRun, setStoredRun] = useState<CeremonyRun | null>(readStoredRun);
  // A run stored for another meeting is ignored, not shown under this one.
  const run = storedRun !== null && storedRun.meetingId === meeting?.id ? storedRun : null;

  useEffect(() => storeRun(storedRun), [storedRun]);

  const preview = useMemo(
    () => (meeting === null ? [] : buildCeremonyScript(meeting, rows, planToOptions(plan, teamPlaces))),
    [meeting, rows, plan, teamPlaces]
  );
  const warnings = useMemo(
    () => (meeting === null ? [] : ceremonyWarnings(meeting, rows, preview, new Date())),
    [meeting, rows, preview]
  );

  const start = useCallback((): void => {
    if (meeting === null || preview.length === 0) return;
    setStoredRun({ meetingId: meeting.id, importedAt: meeting.lastImportedAt, steps: preview, progress: START_PROGRESS });
  }, [meeting, preview]);

  const stop = useCallback((): void => setStoredRun(null), []);

  const step = useCallback((move: CeremonyMove): void => {
    setStoredRun((current) => current && { ...current, progress: moveStep(current.progress, move, current.steps.length) });
  }, []);

  const goTo = useCallback((index: number): void => {
    setStoredRun((current) => current && { ...current, progress: goToStep(current.progress, index, current.steps.length) });
  }, []);

  const isRunning = run !== null;
  useEffect(() => {
    if (!isRunning) return undefined;
    function onKeyDown(event: KeyboardEvent): void {
      const move = shortcutMove(event);
      if (move === null) return;
      event.preventDefault(); // Space would otherwise scroll the page.
      step(move);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isRunning, step]);

  return {
    plan,
    toggleBlock: (block) => setPlan((current) => toggleBlock(current, block)),
    moveBlock: (index, delta) => setPlan((current) => moveBlock(current, index, delta)),
    teamPlaces,
    setTeamPlaces,
    preview,
    warnings,
    run,
    hasNewerData: run !== null && meeting !== null && meeting.lastImportedAt !== run.importedAt,
    start,
    stop,
    step,
    goTo,
  };
}

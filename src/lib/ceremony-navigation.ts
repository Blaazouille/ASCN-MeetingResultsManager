/**
 * Responsabilité : progression dans le déroulé (annonce courante, annonces faites, raccourcis clavier).
 * Appelé par : use-ceremony.ts, ceremony-session.ts, les composants de src/components/ceremony/ et les tests.
 * Suppression casserait : la navigation Précédent / Suivant et le cochage des annonces faites.
 */

export interface CeremonyProgress {
  /** Index of the announcement on screen. */
  current: number;
  /**
   * Announcements that have been on screen, ascending. Only these can be
   * ticked: jumping ahead through the list leaves the skipped ones unticked,
   * so the manager sees what was never announced.
   */
  shown: number[];
  /** "Terminer" was pressed on the last announcement. */
  finished: boolean;
}

export type CeremonyMove = 'next' | 'previous';

export const START_PROGRESS: CeremonyProgress = { current: 0, shown: [0], finished: false };

function withShown(shown: number[], index: number): number[] {
  return shown.includes(index) ? shown : [...shown, index].sort((a, b) => a - b);
}

/** Jumps to an announcement (clamped to the script) and records it as shown. */
export function goToStep(progress: CeremonyProgress, index: number, total: number): CeremonyProgress {
  if (total === 0) return START_PROGRESS;
  const current = Math.min(Math.max(index, 0), total - 1);
  return { ...progress, current, shown: withShown(progress.shown, current) };
}

/** Next / previous announcement. "Next" on the last one doesn't move: it ends the ceremony. */
export function moveStep(progress: CeremonyProgress, move: CeremonyMove, total: number): CeremonyProgress {
  if (move === 'previous') return goToStep(progress, progress.current - 1, total);
  if (progress.current >= total - 1) return { ...progress, finished: true };
  return goToStep(progress, progress.current + 1, total);
}

/**
 * Ticked once it has been shown and left behind. The one on screen is still
 * being read, so it is only ticked once the ceremony is finished.
 */
export function isStepDone(progress: CeremonyProgress, index: number): boolean {
  return progress.shown.includes(index) && (index !== progress.current || progress.finished);
}

/** Never shown although a later announcement was: jumped over, so not announced yet. */
export function isStepSkipped(progress: CeremonyProgress, index: number): boolean {
  return !progress.shown.includes(index) && progress.shown.some((shown) => shown > index);
}

/** How many announcements are ticked. */
export function doneCount(progress: CeremonyProgress, total: number): number {
  let count = 0;
  for (let index = 0; index < total; index++) {
    if (isStepDone(progress, index)) count++;
  }
  return count;
}

/** What the keyboard handler knows about a key press. */
export interface ShortcutKey {
  key: string;
  repeat: boolean;
  /** Alt, Ctrl or Meta held: leave browser and system shortcuts alone. */
  withModifier: boolean;
  /** Focus is in an input, textarea or select: the key is typing, not navigation. */
  inField: boolean;
  /** A dialog is open on top of the run: its own buttons own the keyboard. */
  dialogOpen: boolean;
}

/**
 * → or space for the next announcement, ← for the previous one; null when the
 * key must be left to the page. Space is taken even when a button has focus,
 * so it never clicks that button instead (e.g. jumping to a list entry).
 * Held keys are ignored: auto-repeat would race through announcements.
 */
export function shortcutMove({ key, repeat, withModifier, inField, dialogOpen }: ShortcutKey): CeremonyMove | null {
  if (repeat || withModifier || inField || dialogOpen) return null;
  if (key === 'ArrowRight' || key === ' ') return 'next';
  if (key === 'ArrowLeft') return 'previous';
  return null;
}

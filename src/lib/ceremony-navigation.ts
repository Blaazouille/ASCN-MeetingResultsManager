/**
 * Responsabilité : progression dans le déroulé (annonce courante, annonces faites, raccourcis clavier).
 * Appelé par : use-ceremony.ts, ceremony-session.ts et les tests.
 * Suppression casserait : la navigation Précédent / Suivant et le cochage des annonces faites.
 */

export interface CeremonyProgress {
  /** Index of the announcement on screen. */
  current: number;
  /**
   * Furthest point reached: every announcement before it has been read. Kept
   * apart from `current` so going back to check a name doesn't untick the
   * announcements already made. Equals the step count once the last one is done.
   */
  reached: number;
}

export type CeremonyMove = 'next' | 'previous';

export const START_PROGRESS: CeremonyProgress = { current: 0, reached: 0 };

/** Jumps to an announcement (clamped to the script); passing it marks everything before as read. */
export function goToStep(progress: CeremonyProgress, index: number, total: number): CeremonyProgress {
  if (total === 0) return START_PROGRESS;
  const current = Math.min(Math.max(index, 0), total - 1);
  return { current, reached: Math.max(progress.reached, current) };
}

/**
 * Next / previous announcement. "Next" on the last one doesn't move: it marks
 * it read, which ends the ceremony.
 */
export function moveStep(progress: CeremonyProgress, move: CeremonyMove, total: number): CeremonyProgress {
  if (move === 'previous') return goToStep(progress, progress.current - 1, total);
  if (progress.current >= total - 1) return { current: progress.current, reached: total };
  return goToStep(progress, progress.current + 1, total);
}

/** An announcement is ticked once read, except the one on screen while it is still being read. */
export function isStepDone(progress: CeremonyProgress, index: number, total: number): boolean {
  return index < progress.reached && (index !== progress.current || isCeremonyFinished(progress, total));
}

export function isCeremonyFinished(progress: CeremonyProgress, total: number): boolean {
  return total > 0 && progress.reached >= total;
}

/** Keyboard shortcuts: → or space for the next announcement, ← for the previous one. */
export function keyToMove(key: string): CeremonyMove | null {
  if (key === 'ArrowRight' || key === ' ') return 'next';
  if (key === 'ArrowLeft') return 'previous';
  return null;
}

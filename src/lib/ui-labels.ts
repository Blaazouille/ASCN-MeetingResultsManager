/**
 * Responsabilité : libellés et valeurs d'affichage dérivés des données (places, écarts, statuts, catégories).
 * Appelé par : les composants de classement, d'accueil, d'import et la barre latérale.
 * Suppression casserait : les textes calculés de l'interface (« 1re place », « −477 », « À importer »…).
 */
import type { Meeting, MeetingStatus } from './db';
import type { Gender } from './individual-ranking';
import { formatPoints } from './utils';

/** "1re place", "2e place"… French ordinal of a podium place. */
export function placeLabel(rank: number): string {
  return `${rank === 1 ? '1re' : `${rank}e`} place`;
}

/** Gap to the leader with a real minus sign (U+2212), or "—" for the leader itself. */
export function formatGap(points: number, leaderPoints: number): string {
  const gap = leaderPoints - points;
  return gap > 0 ? `−${formatPoints(gap)}` : '—';
}

/** Share of the leader's points, clamped to 0…1: drives the width of the points bar. */
export function leaderRatio(points: number, leaderPoints: number): number {
  if (leaderPoints <= 0) return 0;
  return Math.min(1, Math.max(0, points / leaderPoints));
}

/** "Née en 1991" / "Né en 1970"; mixed categories don't tell the gender, so "Année 1970". */
export function birthLabel(birthyear: number, gender: Gender): string {
  if (gender === 'F') return `Née en ${birthyear}`;
  if (gender === 'M') return `Né en ${birthyear}`;
  return `Année ${birthyear}`;
}

/** Drill-down sentence: swimmers counted in the team total, then those left out. */
export function countedSummary(counted: number, entered: number): string {
  const head = counted >= 2 ? `${counted} nageurs comptés` : `${counted} nageur compté`;
  const others = entered - counted;
  if (others <= 0) return head;
  const tail = others >= 2 ? 'autres nageurs du club ne comptent' : 'autre nageur du club ne compte';
  return `${head} · ${others} ${tail} pas dans le total`;
}

/** "422 résultats importés" / "Aucun résultat importé". */
export function resultCountLabel(count: number): string {
  if (count === 0) return 'Aucun résultat importé';
  return count === 1 ? '1 résultat importé' : `${formatPoints(count)} résultats importés`;
}

export type BadgeStatus = MeetingStatus | 'pending';

/** A meeting with nothing imported reads "À importer" whatever its status. */
export function meetingBadgeStatus(meeting: Pick<Meeting, 'status' | 'resultCount'>): BadgeStatus {
  return meeting.resultCount === 0 ? 'pending' : meeting.status;
}

/** "Classement Mixte" → "Mixte": the prefix repeats on every tab and adds nothing. */
export function categoryShortLabel(category: string): string {
  return category.replace(/^Classement\s+/i, '');
}

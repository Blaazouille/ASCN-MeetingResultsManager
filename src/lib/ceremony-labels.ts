/**
 * Responsabilité : textes du déroulé de cérémonie (intitulé d'une annonce, progression, écarts, alertes).
 * Appelé par : les composants de src/components/ceremony/, ceremony-pdf-export.tsx et les tests.
 * Suppression casserait : tous les libellés de l'écran Cérémonie et de la fiche PDF.
 */
import type { CeremonyBlock, CeremonyStep, CeremonyWinner } from './ceremony-script';
import type { CeremonyWarning } from './ceremony-warnings';
import { categoryShortLabel, placeLabel, prizeLabel } from './ui-labels';
import { formatPoints } from './utils';

export const CEREMONY_BLOCK_LABELS: Record<CeremonyBlock, string> = {
  'fun-awards': 'Palmarès des rigolos',
  'individual-prizes': 'Prix individuels',
  'team-ranking': 'Classement par équipes',
};

/** What is being awarded: "3e place", "1er Prix ex æquo", "La Doyenne". */
export function stepHeading(step: CeremonyStep): string {
  if (step.rank === null) return step.awardTitle ?? '';
  const base = step.block === 'team-ranking' ? placeLabel(step.rank) : prizeLabel(step.rank);
  return step.winners.length > 1 ? `${base} ex æquo` : base;
}

/** Where the announcement belongs: "Classement par équipes · Mixte". */
export function stepContext(step: CeremonyStep): string {
  return `${CEREMONY_BLOCK_LABELS[step.block]} · ${categoryShortLabel(step.category)}`;
}

/** "Annonce 7 / 18" — `index` is 0-based. */
export function progressLabel(index: number, total: number): string {
  return `Annonce ${index + 1} / ${total}`;
}

/** "18 annonces", "1 annonce", "Aucune annonce". */
export function stepCountLabel(count: number): string {
  if (count === 0) return 'Aucune annonce';
  return count === 1 ? '1 annonce' : `${count} annonces`;
}

/** Message once « Terminer » is pressed; announcements jumped over are counted so none is forgotten. */
export function finishedLabel(notDone: number): string {
  if (notDone === 0) return 'Toutes les annonces ont été faites. Bravo\u00a0!';
  const what = notDone === 1 ? "1 annonce n'a pas été faite" : `${notDone} annonces n'ont pas été faites`;
  return `Fin du déroulé\u00a0: ${what}. Elles ne sont pas cochées dans la liste.`;
}

/** "1 274 points", "1 point": a winner's score as read out. */
export function pointsLabel(points: number): string {
  return `${formatPoints(points)} ${points >= 2 ? 'points' : 'point'}`;
}

/** The line under a winner's name: "EN CAEN · 1 274 points", "Née en 1950 (76 ans)". A club prize doesn't repeat the club. */
export function winnerLine(winner: CeremonyWinner): string {
  const parts = [winner.club !== winner.name ? winner.club : null, winner.points !== null ? pointsLabel(winner.points) : null, winner.detail];
  return parts.filter((part): part is string => part !== null).join(' · ');
}

/** "12 points d'avance sur le suivant". */
export function gapLabel(gap: number): string {
  return `${pointsLabel(gap)} d'avance sur le suivant`;
}

/** "45 min", "2 h": how old the last import is. */
function durationLabel(minutes: number): string {
  return minutes < 120 ? `${minutes} min` : `${Math.floor(minutes / 60)} h`;
}

/** One line per point to check before the ceremony. */
export function warningLabel(warning: CeremonyWarning): string {
  switch (warning.kind) {
    case 'tie':
      return `${stepHeading(warning.step)} (${stepContext(warning.step)})\u00a0: ${warning.step.winners.length} ex æquo, annoncés ensemble. À départager si un seul prix est prévu.`;
    case 'stale-import':
      return `Dernier import il y a ${durationLabel(warning.minutes)}\u00a0: vérifiez que tous les résultats sont arrivés.`;
    case 'empty-category':
      return `${categoryShortLabel(warning.category)}\u00a0: aucun résultat à annoncer pour cette catégorie.`;
  }
}

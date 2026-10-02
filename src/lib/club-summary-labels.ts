/**
 * Responsabilité : textes de la carte « Notre club » (rang « 7e / 38 », écarts, nageurs, meilleur nageur) à partir de computeClubSummary.
 * Appelé par : OurClubCard.tsx et les tests.
 * Suppression casserait : les phrases de la carte « Notre club » de l'écran Classement.
 */
import type { BestSwimmer, ClubCategoryStatus } from './club-summary';
import { detectGender } from './individual-ranking';
import { placeLabel, swimmerCountLabel } from './ui-labels';
import { formatPoints, formatRetainedSwimmers } from './utils';

const NBSP = ' ';

/** "1 274 pts", the number never separated from its unit. */
function pointsLabel(points: number): string {
  return `${formatPoints(points)}${NBSP}pts`;
}

/** "1er", "7e": a club's or a swimmer's rank (masculine). Plain letters like placeLabel, the embedded fonts have no superscript ᵉ. */
function clubOrdinal(rank: number): string {
  return rank === 1 ? '1er' : `${rank}e`;
}

/** "7e / 38", "3e ex æquo / 38". */
export function clubRankLabel(rank: number, tied: boolean, clubCount: number): string {
  return `${clubOrdinal(rank)}${tied ? ' ex æquo' : ''}${NBSP}/${NBSP}${clubCount}`;
}

/**
 * What the volunteer reads in the « Écart » column: the points missing for
 * the place above, then the lead on the club below. The 1st only has a lead,
 * the last only a deficit; a club with no other club ranked has neither.
 */
export function clubGapLabels(status: ClubCategoryStatus): string[] {
  if (status.kind === 'below-threshold') {
    return [`Non classé${NBSP}: moins de ${status.minSwimmers} nageurs`];
  }
  if (status.kind === 'absent') {
    return ['Aucun nageur dans cette catégorie'];
  }
  const labels: string[] = [];
  if (status.behind) {
    labels.push(`−${pointsLabel(status.behind.points)} pour la ${placeLabel(status.behind.rank)}`);
  }
  if (status.ahead) {
    labels.push(`+${pointsLabel(status.ahead.points)} d'avance sur le ${clubOrdinal(status.ahead.rank)}`);
  }
  return labels;
}

/** "5 retenus sur 18" once ranked, else "2 nageurs engagés" (none retained: the club isn't ranked). */
export function clubSwimmersLabel(status: ClubCategoryStatus, entered: number): string {
  if (status.kind === 'ranked') {
    return formatRetainedSwimmers(status.retained, entered);
  }
  return `${swimmerCountLabel(entered)} ${entered >= 2 ? 'engagés' : 'engagé'}`;
}

/** "Meilleure nageuse : Léa Martin, 12e (1 274 pts)" — « nageuse » in the Dames category only, the others can't tell. */
export function bestSwimmerLabel(swimmer: BestSwimmer, category: string): string {
  const female = detectGender(category) === 'F';
  const who = female ? 'Meilleure nageuse' : 'Meilleur nageur';
  const ordinal = female && swimmer.rank === 1 ? '1re' : clubOrdinal(swimmer.rank);
  const rank = `${ordinal}${swimmer.tied ? ' ex æquo' : ''}`;
  return `${who}${NBSP}: ${swimmer.firstname} ${swimmer.lastname}, ${rank} (${pointsLabel(swimmer.points)})`;
}

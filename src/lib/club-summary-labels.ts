/**
 * Responsabilité : textes de la ligne « Notre club » (« 7e / 38 », « 4 735 pts », « −23 pour la 6e », « +14 sur le 8e ») à partir de computeClubSummary.
 * Appelé par : OurClubLine.tsx et les tests.
 * Suppression casserait : les textes de la ligne « Notre club » de l'écran Classement.
 */
import type { ClubCategoryStatus } from './club-summary';
import { formatPoints } from './utils';

const NBSP = ' ';

/** "1er", "7e": a club's rank (masculine). Plain letters like placeLabel, the embedded fonts have no superscript ᵉ. */
function clubOrdinal(rank: number): string {
  return rank === 1 ? '1er' : `${rank}e`;
}

/** "1re", "6e": the place (feminine) a club could reach. */
function placeOrdinal(rank: number): string {
  return rank === 1 ? '1re' : `${rank}e`;
}

/** "7e / 38", "3e ex æquo / 38". */
export function clubRankLabel(rank: number, tied: boolean, clubCount: number): string {
  return `${clubOrdinal(rank)}${tied ? ' ex æquo' : ''}${NBSP}/${NBSP}${clubCount}`;
}

/**
 * What follows the rank on the line, one part per « · »: the total, the
 * points missing for the place above, then the lead on the club below.
 * The 1st only has a lead, the last only a deficit. The gaps carry no
 * « pts »: the total just before already says the unit, and the line must
 * stay on one row. An unranked club gets a single sentence instead.
 */
export function clubStandingParts(status: ClubCategoryStatus): string[] {
  if (status.kind === 'below-threshold') {
    return [`Non classé${NBSP}: moins de ${status.minSwimmers} nageurs`];
  }
  if (status.kind === 'absent') {
    return ['Aucun nageur dans cette catégorie'];
  }
  const parts = [`${formatPoints(status.totalPoints)}${NBSP}pts`];
  if (status.behind) {
    parts.push(`−${formatPoints(status.behind.points)} pour la ${placeOrdinal(status.behind.rank)}`);
  }
  if (status.ahead) {
    parts.push(`+${formatPoints(status.ahead.points)} sur le ${clubOrdinal(status.ahead.rank)}`);
  }
  return parts;
}

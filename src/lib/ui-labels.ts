/**
 * Responsabilité : libellés et valeurs d'affichage dérivés des données (places, écarts, catégories).
 * Appelé par : les composants de classement, d'accueil, d'import et la barre latérale.
 * Suppression casserait : les textes calculés de l'interface (« 1re place », « −477 », « À importer »…).
 */
import type { ExcludedSwimmer } from './csv-parser';
import type { Gender } from './individual-ranking';
import type { ImportChanges, Movement } from './import-diff';
import { formatPoints } from './utils';

/** "1re place", "2e place"… French ordinal of a podium place. */
export function placeLabel(rank: number): string {
  return `${rank === 1 ? '1re' : `${rank}e`} place`;
}

/** "1er Prix", "2e Prix": the individual prize of a rank (Individuels screen and ceremony). */
export function prizeLabel(rank: number): string {
  return rank === 1 ? '1er Prix' : `${rank}e Prix`;
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

/** "38 clubs" — French treats 0 as singular, so the plural starts at 2. */
export function clubCountLabel(count: number): string {
  return count < 2 ? `${count} club` : `${formatPoints(count)} clubs`;
}

/** "412 nageurs" — counts people, not rows (see Meeting.swimmerCount). */
export function swimmerCountLabel(count: number): string {
  return count < 2 ? `${count} nageur` : `${formatPoints(count)} nageurs`;
}

/** "2 clubs non classés : moins de 3 nageurs" — explains why clubs are missing from the team ranking. */
export function unrankedClubsLabel(count: number, minSwimmers: number): string {
  const clubs = count >= 2 ? `${count} clubs non classés` : `${count} club non classé`;
  return `${clubs} : moins de ${minSwimmers} nageurs dans la catégorie`;
}

/** "38 clubs · 412 nageurs": the one-line size of an imported meeting, shared by both Accueil cards. */
export function meetingStatsLabel(clubCount: number, swimmerCount: number): string {
  return `${clubCountLabel(clubCount)} · ${swimmerCountLabel(swimmerCount)}`;
}

/** "Dernier import le 27 sept. 2026 à 14 h 32": takes the already-formatted date from formatMeetingImportedAt. */
export function lastImportLabel(formattedDate: string): string {
  return `Dernier import le ${formattedDate}`;
}

/** "Classement Mixte" → "Mixte": the prefix repeats on every tab and adds nothing. */
export function categoryShortLabel(category: string): string {
  return category.replace(/^Classement\s+/i, '');
}

/**
 * Step 2 of the delete confirmation: the typed text must match the meeting name.
 * Case-sensitive on purpose (it forces reading the name); trimmed because a stray
 * space is not a reason to block a deliberate action. An empty entry never matches.
 */
export function isDeleteConfirmed(typed: string, meetingName: string): boolean {
  const entry = typed.trim();
  return entry !== '' && entry === meetingName.trim();
}

/** Rank for exports: "3 ex." when shared, the plain number otherwise. */
export function rankText(rank: number, tied: boolean): string {
  return tied ? `${rank} ex.` : String(rank);
}

/** Banner text for a tie on a podium place or prize, e.g. "Égalité pour la 3e place en Mixte : à départager". */
export function tieAlertLabel(ranks: number[], category: string): string {
  const places = ranks.length === 1 ? `la ${placeLabel(ranks[0]!)}` : `les places ${[ranks.slice(0, -1).join(', '), ranks.at(-1)].join(' et ')}`;
  return `Égalité pour ${places} en ${categoryShortLabel(category)} : à départager`;
}

/** "↑2", "↓1" or "+" (new entry): the arrow and the number carry the meaning, colour only backs them up. */
export function movementText(movement: Movement): string {
  if (movement === 'new') return '+';
  return movement > 0 ? `↑${movement}` : `↓${-movement}`;
}

/** Spoken form of movementText, for screen readers. */
export function movementAriaLabel(movement: Movement): string {
  if (movement === 'new') return 'Nouveau dans le classement';
  const places = Math.abs(movement);
  const unit = places >= 2 ? `${places} places` : '1 place';
  return movement > 0 ? `Gagne ${unit}` : `Perd ${unit}`;
}

/** Heading of the import summary; the previous import's time is unknown for meetings imported before it was recorded. */
export function sinceImportLabel(formattedDate: string | null): string {
  return formattedDate === null ? "Depuis l'import précédent" : `Depuis l'import du ${formattedDate}`;
}

/** Non-zero parts of the import summary ("+12 nageurs", "−1 nageur", "38 résultats modifiés", "3 clubs ont changé de rang"). */
export function importChangeParts(changes: ImportChanges): string[] {
  const parts: string[] = [];
  if (changes.addedSwimmers > 0) parts.push(`+${swimmerCountLabel(changes.addedSwimmers)}`);
  if (changes.removedSwimmers > 0) parts.push(`−${swimmerCountLabel(changes.removedSwimmers)}`);
  if (changes.changedResults > 0) {
    parts.push(`${formatPoints(changes.changedResults)} ${changes.changedResults >= 2 ? 'résultats modifiés' : 'résultat modifié'}`);
  }
  if (changes.clubsMoved > 0) {
    parts.push(changes.clubsMoved >= 2 ? `${changes.clubsMoved} clubs ont changé de rang` : '1 club a changé de rang');
  }
  return parts;
}

/** « Dames », « Dames et Mixte », « Dames, Messieurs et Mixte ». */
function joinCategories(categories: string[]): string {
  const labels = categories.map(categoryShortLabel);
  return labels.length < 2 ? labels.join('') : `${labels.slice(0, -1).join(', ')} et ${labels.at(-1)}`;
}

/**
 * « À savoir » line naming the swimmers left out of an import for an unreadable birth year, and what it costs them.
 * Each one comes with their club (namesakes from two clubs are two swimmers) and the categories they were left out of:
 * a swimmer can be left out of one category and imported in another, so « aucun classement » would be false.
 */
export function excludedSwimmersNotice(swimmers: ExcludedSwimmer[]): string {
  const several = swimmers.length >= 2;
  const what = several ? 'non importés' : 'non importé';
  const list = swimmers.map((s) => `${s.firstname} ${s.lastname} (${s.club.trim()}) en ${joinCategories(s.categories)}`).join(' ; ');
  const rankings = new Set(swimmers.flatMap((s) => s.categories)).size >= 2 ? 'ces classements' : 'ce classement';
  return `${swimmerCountLabel(swimmers.length)} ${what} (année de naissance vide ou illisible dans le fichier) : ${list}. ${several ? 'Leurs' : 'Ses'} points ne comptent pas dans ${rankings}.`;
}

// French words left in lower case inside a club name (« Cherbourg en Cotentin »).
const CLUB_NAME_PARTICLES = new Set(['DE', 'DU', 'DES', 'LA', 'LE', 'LES', 'EN', 'ET', 'SUR', 'SOUS', 'AUX']);

/**
 * A club name as the FFN writes it (« AS CHERBOURG NATATION ») made easy to
 * read (« AS Cherbourg Natation ») for the sidebar. Short words stay in
 * capitals since club names start with initials (AS, CN, UAS); a name already
 * typed in mixed case is left alone, the volunteer chose that spelling.
 */
export function readableClubName(club: string): string {
  if (club !== club.toLocaleUpperCase('fr-FR')) {
    return club;
  }
  return club
    .split(' ')
    .map((word, index) => {
      if (index > 0 && CLUB_NAME_PARTICLES.has(word)) return word.toLocaleLowerCase('fr-FR');
      if (word.length <= 3 && !word.includes('-')) return word;
      return word
        .split('-')
        .map((part) => part.charAt(0) + part.slice(1).toLocaleLowerCase('fr-FR'))
        .join('-');
    })
    .join(' ');
}

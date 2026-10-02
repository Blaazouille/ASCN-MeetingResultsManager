/**
 * Responsabilité : reconnaît « Notre club » parmi les clubs des résultats (valeur par défaut, correspondance, choix proposés, alerte d'absence).
 * Appelé par : use-our-club.ts, app-settings.ts, OurClubSection.tsx, ImportPage.tsx, les tableaux de classement, la cérémonie et les exports PDF.
 * Suppression casserait : la mise en avant de notre club partout dans l'application.
 */

/** Club highlighted until the volunteer picks another one in Paramètres (issue #26): the app's behaviour before it became configurable. */
export const DEFAULT_OUR_CLUB = 'AS CHERBOURG NATATION';

/** Leading, trailing and doubled spaces removed: how the setting is stored. */
export function tidyClubName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Only case and stray spaces are forgiven. Nothing fuzzier (no accent folding,
 * no "contains"): the real file also lists « AC CHERBOURG EN COTENTIN », a
 * different local club that an approximate match would happily highlight.
 */
function normalizeClubName(name: string): string {
  return tidyClubName(name).toLocaleUpperCase('fr-FR');
}

export function isOurClub(club: string, ourClub: string): boolean {
  return normalizeClubName(club) === normalizeClubName(ourClub);
}

interface OurClubChoices {
  /** Clubs to list, alphabetical; the configured club comes first when the meeting doesn't have it. */
  clubs: string[];
  /** The option to preselect: the meeting's own spelling when it matches, else the configured value. */
  selected: string;
  /** True when the configured club isn't among the meeting's clubs (shown « non trouvé dans ce meeting »). */
  missing: boolean;
}

/** What the « Notre club » drop-down offers for a meeting whose results list `meetingClubs` (duplicates allowed). */
export function ourClubChoices(meetingClubs: readonly string[], ourClub: string): OurClubChoices {
  const clubs = [...new Set(meetingClubs)].sort((a, b) => a.localeCompare(b, 'fr'));
  const match = clubs.find((club) => isOurClub(club, ourClub));
  if (match !== undefined) {
    return { clubs, selected: match, missing: false };
  }
  // Kept in the list so opening Paramètres never silently swaps the setting for the first club.
  return { clubs: [ourClub, ...clubs], selected: ourClub, missing: true };
}

/**
 * The « À savoir » line shown after an import when none of the file's rows
 * belongs to our club, or null when it does. Without it, a renamed club in the
 * FFN file would just stop being highlighted with no hint why.
 */
export function ourClubMissingNotice(rows: ReadonlyArray<{ club: string }>, ourClub: string): string | null {
  if (rows.some((row) => isOurClub(row.club, ourClub))) {
    return null;
  }
  return `Notre club (${ourClub}) n'apparaît pas dans ce fichier — vérifiez le réglage dans Paramètres.`;
}

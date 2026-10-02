/**
 * Responsabilité : types de sauvegarde JSON et validation d'un fichier de backup externe.
 * Appelé par : src/lib/backup.ts (exportDatabase produit ce format, restoreDatabase le consomme).
 * Suppression casserait : la capacité à distinguer un fichier de backup valide d'un fichier corrompu/modifié à la main.
 */

export interface BackupData {
  version: 1;
  appName: string;
  exportedAt: string;
  /**
   * « Notre club » (issue #26). Optional: backups made before it existed lack
   * it and restore the default club. A top-level field on purpose: older app
   * versions' validateBackup ignores unknown top-level keys, so they can still
   * restore a backup made by this one (without the setting) — no version bump.
   */
  ourClub?: string;
  meetings: MeetingBackup[];
}

export interface MeetingBackup {
  name: string;
  createdAt: string;
  updatedAt: string;
  /** Optional: backups made before v1.3 don't have it (restored as "never imported"). */
  lastImportedAt?: string | null;
  defaultTopN: number;
  minSwimmers: number;
  activeCategories: string[] | null;
  swimmers: SwimmerBackup[];
  /**
   * Legacy field: rankings are recomputed from `swimmers`, never stored
   * (issue #31). Backups made before that carry the old rankings here; they
   * are ignored on restore. exportDatabase still writes `[]` so an older app
   * version, whose validation requires an array, can read newer backups.
   */
  teamRankings?: unknown[];
}

export interface SwimmerBackup {
  category: string;
  rank: number | null;
  lastname: string;
  firstname: string;
  birthyear: number | null;
  nation: string | null;
  club: string;
  points: number;
  rawLine: string | null;
}

export interface RestoreResult {
  /** How many meetings existed before the restore and were wiped — a
   * restore always replaces the whole database with the backup's contents. */
  meetingsRemoved: number;
  meetingsImported: number;
  swimmersImported: number;
}

export function validateBackup(data: unknown): BackupData {
  if (data === null || typeof data !== 'object') {
    throw new Error('Format de backup invalide : objet attendu');
  }

  const obj = data as Record<string, unknown>;

  if (obj.version !== 1) {
    throw new Error(`Version de backup non supportée : ${String(obj.version ?? 'manquante')}`);
  }

  // Checked here because restoreDatabase stores it as is: an empty or
  // non-string value would otherwise reach setOurClub's error or SQLite raw.
  if (obj.ourClub !== undefined && (typeof obj.ourClub !== 'string' || obj.ourClub.trim() === '')) {
    throw new Error('Format de backup invalide : ourClub doit être un nom de club non vide');
  }

  if (!Array.isArray(obj.meetings)) {
    throw new Error('Format de backup invalide : tableau "meetings" manquant');
  }

  for (const meeting of obj.meetings) {
    if (typeof meeting !== 'object' || meeting === null) {
      throw new Error('Format de backup invalide : meeting doit être un objet');
    }
    const m = meeting as Record<string, unknown>;
    if (typeof m.name !== 'string') {
      throw new Error('Format de backup invalide : meeting.name requis');
    }
    if (!Array.isArray(m.swimmers)) {
      throw new Error('Format de backup invalide : meeting.swimmers doit être un tableau');
    }

    // These fields are bound directly into SQL by restoreDatabase, so a
    // missing/malformed one would otherwise surface as a raw, untranslated
    // better-sqlite3/SQLite error in the UI instead of this French validation
    // message. Legacy fields from older backups (`status`, `teamRankings`) are
    // simply ignored: nothing reads them on restore.
    if (typeof m.createdAt !== 'string' || typeof m.updatedAt !== 'string') {
      throw new Error('Format de backup invalide : meeting.createdAt et meeting.updatedAt doivent être des strings');
    }
    // Same "YYYY-MM-DD HH:MM:SS" shape SQLite writes: formatMeetingImportedAt turns it into a
    // Date on every Accueil render, and an unparsable string would throw there.
    if (
      m.lastImportedAt !== undefined &&
      m.lastImportedAt !== null &&
      (typeof m.lastImportedAt !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(m.lastImportedAt))
    ) {
      //   = non-breaking space, required before ":" and inside « » by the project's French typography rules.
      throw new Error(
        'Format de backup invalide : meeting.lastImportedAt doit être null ou une date « AAAA-MM-JJ HH:MM:SS »'
      );
    }
    if (typeof m.defaultTopN !== 'number' || typeof m.minSwimmers !== 'number') {
      throw new Error('Format de backup invalide : meeting.defaultTopN et meeting.minSwimmers doivent être des nombres');
    }
    if (
      m.activeCategories !== null &&
      (!Array.isArray(m.activeCategories) || m.activeCategories.some((c) => typeof c !== 'string'))
    ) {
      throw new Error('Format de backup invalide : meeting.activeCategories doit être null ou un tableau de strings');
    }

    // Validate each swimmer entry. Every field here is bound directly into
    // SQL by restoreDatabase (category and lastname/firstname/club are NOT
    // NULL columns), so a gap here is the same untranslated-crash risk the
    // comment above describes for meeting fields.
    for (const swimmer of m.swimmers) {
      if (typeof swimmer !== 'object' || swimmer === null) {
        throw new Error('Format de backup invalide : swimmer doit être un objet');
      }
      const s = swimmer as Record<string, unknown>;
      if (typeof s.category !== 'string') {
        throw new Error('Format de backup invalide : swimmer.category doit être une string');
      }
      if (typeof s.lastname !== 'string') {
        throw new Error('Format de backup invalide : swimmer.lastname doit être une string');
      }
      if (typeof s.firstname !== 'string') {
        throw new Error('Format de backup invalide : swimmer.firstname doit être une string');
      }
      if (typeof s.club !== 'string') {
        throw new Error('Format de backup invalide : swimmer.club doit être une string');
      }
      if (typeof s.points !== 'number') {
        throw new Error('Format de backup invalide : swimmer.points doit être un nombre');
      }
      if (s.rank !== null && typeof s.rank !== 'number') {
        throw new Error('Format de backup invalide : swimmer.rank doit être un nombre ou null');
      }
      if (s.birthyear !== null && typeof s.birthyear !== 'number') {
        throw new Error('Format de backup invalide : swimmer.birthyear doit être un nombre ou null');
      }
      if (s.nation !== null && typeof s.nation !== 'string') {
        throw new Error('Format de backup invalide : swimmer.nation doit être une string ou null');
      }
      if (s.rawLine !== null && typeof s.rawLine !== 'string') {
        throw new Error('Format de backup invalide : swimmer.rawLine doit être une string ou null');
      }
    }
  }

  return data as BackupData;
}

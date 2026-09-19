/**
 * Responsabilité : types de sauvegarde JSON et validation d'un fichier de backup externe.
 * Appelé par : src/lib/backup.ts (exportDatabase produit ce format, restoreDatabase le consomme).
 * Suppression casserait : la capacité à distinguer un fichier de backup valide d'un fichier corrompu/modifié à la main.
 */

export interface BackupData {
  version: 1;
  appName: string;
  exportedAt: string;
  meetings: MeetingBackup[];
}

export interface MeetingBackup {
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  defaultTopN: number;
  minSwimmers: number;
  activeCategories: string[] | null;
  swimmers: SwimmerBackup[];
  teamRankings: TeamRankingBackup[];
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

export interface TeamRankingBackup {
  category: string;
  club: string;
  rank: number;
  totalPoints: number;
  topN: number;
  swimmers: string;
  computedAt: string;
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

    // These fields are bound directly into SQL by restoreDatabase (including
    // a `status` CHECK constraint), so a missing/malformed one would
    // otherwise surface as a raw, untranslated better-sqlite3/SQLite error in
    // the UI instead of this French validation message.
    if (m.status !== 'provisional' && m.status !== 'final') {
      throw new Error('Format de backup invalide : meeting.status doit être "provisional" ou "final"');
    }
    if (typeof m.createdAt !== 'string' || typeof m.updatedAt !== 'string') {
      throw new Error('Format de backup invalide : meeting.createdAt et meeting.updatedAt doivent être des strings');
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
    }

    // Validate teamRankings if present — every field is bound directly into
    // SQL by restoreDatabase against NOT NULL columns (see db-schema.ts), so
    // (like swimmers above) each one needs its own check, not just "is it an
    // array".
    if (m.teamRankings !== undefined) {
      if (!Array.isArray(m.teamRankings)) {
        throw new Error('Format de backup invalide : meeting.teamRankings doit être un tableau');
      }
      for (const ranking of m.teamRankings) {
        if (typeof ranking !== 'object' || ranking === null) {
          throw new Error('Format de backup invalide : teamRanking doit être un objet');
        }
        const r = ranking as Record<string, unknown>;
        if (typeof r.category !== 'string' || typeof r.club !== 'string' || typeof r.swimmers !== 'string' || typeof r.computedAt !== 'string') {
          throw new Error('Format de backup invalide : teamRanking.category, club, swimmers et computedAt doivent être des strings');
        }
        if (typeof r.rank !== 'number' || typeof r.totalPoints !== 'number' || typeof r.topN !== 'number') {
          throw new Error('Format de backup invalide : teamRanking.rank, totalPoints et topN doivent être des nombres');
        }
      }
    }
  }

  return data as BackupData;
}

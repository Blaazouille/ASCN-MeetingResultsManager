/**
 * Responsabilité : calcul des prix humoristiques à partir des données nageurs.
 * Appelé par : IndividualPage.tsx et les tests.
 * Suppression casserait : la section "Palmarès des rigolos".
 */
import type { RawSwimmerRow } from './csv-parser';

export interface FunAward {
  id: string;
  title: string;
  emoji: string;
  winner: {
    name: string;
    club: string;
    detail: string;
  };
}

interface UniqueSwimmer {
  lastname: string;
  firstname: string;
  birthyear: number;
  club: string;
  points: number;
}

function deduplicateSwimmers(rows: RawSwimmerRow[]): UniqueSwimmer[] {
  const best = new Map<string, UniqueSwimmer>();
  for (const row of rows) {
    const key = `${row.lastname}|${row.firstname}|${row.birthyear}|${row.club}`;
    const existing = best.get(key);
    if (!existing || row.points > existing.points) {
      best.set(key, {
        lastname: row.lastname,
        firstname: row.firstname,
        birthyear: row.birthyear,
        club: row.club,
        points: row.points,
      });
    }
  }
  return Array.from(best.values());
}

function formatName(s: UniqueSwimmer): string {
  return `${s.lastname} ${s.firstname}`;
}

function findDoyen(swimmers: UniqueSwimmer[]): FunAward | null {
  const valid = swimmers.filter((s) => s.birthyear > 0);
  if (valid.length === 0) return null;
  const oldest = valid.reduce((a, b) => (a.birthyear < b.birthyear ? a : b));
  const age = new Date().getFullYear() - oldest.birthyear;
  return {
    id: 'doyen',
    title: 'Le Doyen',
    emoji: '👴',
    winner: {
      name: formatName(oldest),
      club: oldest.club,
      detail: `Né(e) en ${oldest.birthyear} (${age} ans)`,
    },
  };
}

function findReleve(swimmers: UniqueSwimmer[]): FunAward | null {
  const valid = swimmers.filter((s) => s.birthyear > 0);
  if (valid.length === 0) return null;
  const youngest = valid.reduce((a, b) => (a.birthyear > b.birthyear ? a : b));
  const age = new Date().getFullYear() - youngest.birthyear;
  return {
    id: 'releve',
    title: 'La Relève',
    emoji: '🌱',
    winner: {
      name: formatName(youngest),
      club: youngest.club,
      detail: `Né(e) en ${youngest.birthyear} (${age} ans)`,
    },
  };
}

function findLoupSolitaire(swimmers: UniqueSwimmer[]): FunAward | null {
  const clubCounts = new Map<string, UniqueSwimmer[]>();
  for (const s of swimmers) {
    const list = clubCounts.get(s.club);
    if (list) {
      list.push(s);
    } else {
      clubCounts.set(s.club, [s]);
    }
  }
  const soloSwimmers = Array.from(clubCounts.entries())
    .filter(([, members]) => members.length === 1)
    .map(([, members]) => members[0]!);
  if (soloSwimmers.length === 0) return null;
  const best = soloSwimmers.reduce((a, b) => (a.points > b.points ? a : b));
  return {
    id: 'loup-solitaire',
    title: 'Le Loup Solitaire',
    emoji: '🐺',
    winner: {
      name: formatName(best),
      club: best.club,
      detail: `Seul(e) représentant(e) de son club (${best.points} pts)`,
    },
  };
}

function findPhotoFinish(swimmers: UniqueSwimmer[]): FunAward | null {
  if (swimmers.length < 2) return null;
  const sorted = [...swimmers].sort((a, b) => b.points - a.points);
  let minGap = Infinity;
  let pairA = sorted[0]!;
  let pairB = sorted[1]!;
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i]!.points - sorted[i + 1]!.points;
    if (gap < minGap && gap >= 0) {
      minGap = gap;
      pairA = sorted[i]!;
      pairB = sorted[i + 1]!;
    }
  }
  return {
    id: 'photo-finish',
    title: 'Le Photo-Finish',
    emoji: '📸',
    winner: {
      name: `${formatName(pairA)} et ${formatName(pairB)}`,
      club: pairA.club === pairB.club ? pairA.club : `${pairA.club} / ${pairB.club}`,
      detail: `Seulement ${minGap} pt${minGap !== 1 ? 's' : ''} d'écart (${pairA.points} vs ${pairB.points})`,
    },
  };
}

const MIN_CLUB_SIZE = 3;

function groupByClub(swimmers: UniqueSwimmer[]): Map<string, UniqueSwimmer[]> {
  const clubs = new Map<string, UniqueSwimmer[]>();
  for (const s of swimmers) {
    const list = clubs.get(s.club);
    if (list) list.push(s);
    else clubs.set(s.club, [s]);
  }
  return clubs;
}

function findClubAnciens(swimmers: UniqueSwimmer[]): FunAward | null {
  const currentYear = new Date().getFullYear();
  const clubs = groupByClub(swimmers);
  let bestClub = '';
  let bestAvgAge = -Infinity;
  let bestCount = 0;

  for (const [club, members] of clubs) {
    const valid = members.filter((s) => s.birthyear > 0);
    if (valid.length < MIN_CLUB_SIZE) continue;
    const avgAge = valid.reduce((sum, s) => sum + (currentYear - s.birthyear), 0) / valid.length;
    if (avgAge > bestAvgAge) {
      bestAvgAge = avgAge;
      bestClub = club;
      bestCount = valid.length;
    }
  }
  if (!bestClub) return null;
  return {
    id: 'club-anciens',
    title: 'Le Club des Anciens',
    emoji: '🧓',
    winner: {
      name: bestClub,
      club: bestClub,
      detail: `Moyenne d'âge : ${Math.round(bestAvgAge)} ans (${bestCount} nageurs)`,
    },
  };
}

function findJeuneGarde(swimmers: UniqueSwimmer[]): FunAward | null {
  const currentYear = new Date().getFullYear();
  const clubs = groupByClub(swimmers);
  let bestClub = '';
  let bestAvgAge = Infinity;
  let bestCount = 0;

  for (const [club, members] of clubs) {
    const valid = members.filter((s) => s.birthyear > 0);
    if (valid.length < MIN_CLUB_SIZE) continue;
    const avgAge = valid.reduce((sum, s) => sum + (currentYear - s.birthyear), 0) / valid.length;
    if (avgAge < bestAvgAge) {
      bestAvgAge = avgAge;
      bestClub = club;
      bestCount = valid.length;
    }
  }
  if (!bestClub) return null;
  return {
    id: 'jeune-garde',
    title: 'La Jeune Garde',
    emoji: '🐣',
    winner: {
      name: bestClub,
      club: bestClub,
      detail: `Moyenne d'âge : ${Math.round(bestAvgAge)} ans (${bestCount} nageurs)`,
    },
  };
}

export function computeFunAwards(rows: RawSwimmerRow[]): FunAward[] {
  const swimmers = deduplicateSwimmers(rows);
  const finders = [findDoyen, findReleve, findLoupSolitaire, findPhotoFinish, findClubAnciens, findJeuneGarde];
  const awards: FunAward[] = [];
  for (const finder of finders) {
    const award = finder(swimmers);
    if (award) {
      awards.push(award);
    }
  }
  return awards;
}

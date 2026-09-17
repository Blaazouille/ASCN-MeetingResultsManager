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

function findRegulier(swimmers: UniqueSwimmer[]): FunAward | null {
  if (swimmers.length === 0) return null;
  const avg = swimmers.reduce((sum, s) => sum + s.points, 0) / swimmers.length;
  const closest = swimmers.reduce((a, b) =>
    Math.abs(a.points - avg) < Math.abs(b.points - avg) ? a : b
  );
  return {
    id: 'regulier',
    title: 'Le Régulier',
    emoji: '📏',
    winner: {
      name: formatName(closest),
      club: closest.club,
      detail: `${closest.points} pts (moyenne : ${Math.round(avg)} pts)`,
    },
  };
}

function findArmada(swimmers: UniqueSwimmer[]): FunAward | null {
  if (swimmers.length === 0) return null;
  const clubCounts = new Map<string, number>();
  for (const s of swimmers) {
    clubCounts.set(s.club, (clubCounts.get(s.club) ?? 0) + 1);
  }
  let maxClub = '';
  let maxCount = 0;
  for (const [club, count] of clubCounts) {
    if (count > maxCount) {
      maxClub = club;
      maxCount = count;
    }
  }
  return {
    id: 'armada',
    title: "L'Armada",
    emoji: '⚓',
    winner: {
      name: maxClub,
      club: maxClub,
      detail: `${maxCount} nageur${maxCount > 1 ? 's' : ''} inscrits`,
    },
  };
}

export function computeFunAwards(rows: RawSwimmerRow[]): FunAward[] {
  const swimmers = deduplicateSwimmers(rows);
  const finders = [findDoyen, findReleve, findLoupSolitaire, findPhotoFinish, findRegulier, findArmada];
  const awards: FunAward[] = [];
  for (const finder of finders) {
    const award = finder(swimmers);
    if (award) {
      awards.push(award);
    }
  }
  return awards;
}

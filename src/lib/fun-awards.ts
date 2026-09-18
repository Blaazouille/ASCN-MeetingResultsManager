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
  category: string;
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
        category: row.name,
      });
    }
  }
  return Array.from(best.values());
}

function formatName(s: UniqueSwimmer): string {
  return `${s.lastname} ${s.firstname}`;
}

function swimmerGender(s: UniqueSwimmer): 'F' | 'M' | null {
  if (/dames/i.test(s.category)) return 'F';
  if (/messieurs/i.test(s.category)) return 'M';
  return null;
}

function findDoyen(swimmers: UniqueSwimmer[]): FunAward | null {
  const valid = swimmers.filter((s) => s.birthyear > 0);
  if (valid.length === 0) return null;
  const oldest = valid.reduce((a, b) => (a.birthyear < b.birthyear ? a : b));
  const age = new Date().getFullYear() - oldest.birthyear;
  const isFemale = swimmerGender(oldest) === 'F';
  return {
    id: 'doyen',
    title: isFemale ? 'La Doyenne' : 'Le Doyen',
    emoji: isFemale ? '👵' : '👴',
    winner: {
      name: formatName(oldest),
      club: oldest.club,
      detail: `${isFemale ? 'Née' : 'Né'} en ${oldest.birthyear} (${age} ans)`,
    },
  };
}

function findReleve(swimmers: UniqueSwimmer[]): FunAward | null {
  const valid = swimmers.filter((s) => s.birthyear > 0);
  if (valid.length === 0) return null;
  const youngest = valid.reduce((a, b) => (a.birthyear > b.birthyear ? a : b));
  const age = new Date().getFullYear() - youngest.birthyear;
  const isFemale = swimmerGender(youngest) === 'F';
  return {
    id: 'releve',
    title: 'La Relève',
    emoji: '🌱',
    winner: {
      name: formatName(youngest),
      club: youngest.club,
      detail: `${isFemale ? 'Née' : 'Né'} en ${youngest.birthyear} (${age} ans)`,
    },
  };
}

function findDuoMixte(swimmers: UniqueSwimmer[]): FunAward | null {
  const clubs = groupByClub(swimmers);
  let bestClub = '';
  let bestPoints = -1;
  let bestF: UniqueSwimmer | null = null;
  let bestM: UniqueSwimmer | null = null;

  for (const [club, members] of clubs) {
    const females = members.filter((s) => /dames/i.test(s.category));
    const males = members.filter((s) => /messieurs/i.test(s.category));
    // Club avec exactement 1 femme et 1 homme — le plus petit duo mixte possible
    if (females.length === 1 && males.length === 1) {
      const total = females[0]!.points + males[0]!.points;
      if (total > bestPoints) {
        bestPoints = total;
        bestClub = club;
        bestF = females[0]!;
        bestM = males[0]!;
      }
    }
  }

  if (!bestClub || !bestF || !bestM) return null;
  return {
    id: 'duo-mixte',
    title: 'Le Duo Mixte',
    emoji: '🤝',
    winner: {
      name: `${formatName(bestF)} & ${formatName(bestM)}`,
      club: bestClub,
      detail: `Seul duo de leur club (${bestF.points} + ${bestM.points} = ${bestPoints} pts)`,
    },
  };
}

function categoryLabel(cat: string): string {
  return cat.replace(/^Classement\s+/i, '');
}

function findPhotoFinish(swimmers: UniqueSwimmer[]): FunAward | null {
  if (swimmers.length < 2) return null;
  const sorted = [...swimmers].sort((a, b) => b.points - a.points);
  let minGap = Infinity;
  let minIdx = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i]!.points - sorted[i + 1]!.points;
    if (gap < minGap) {
      minGap = gap;
      minIdx = i;
    }
  }
  const pairA = sorted[minIdx]!;
  const pairB = sorted[minIdx + 1]!;
  const rankA = minIdx + 1;
  const rankB = minIdx + 2;
  const catA = categoryLabel(pairA.category);
  const catB = categoryLabel(pairB.category);
  const catDetail = catA === catB ? catA : `${catA} / ${catB}`;
  return {
    id: 'photo-finish',
    title: 'Le Photo-Finish',
    emoji: '📸',
    winner: {
      name: `${formatName(pairA)} et ${formatName(pairB)}`,
      club: pairA.club === pairB.club ? pairA.club : `${pairA.club} / ${pairB.club}`,
      detail: minGap === 0
        ? `Ex æquo au rang ${rankA} — ${pairA.points} pts (${catDetail})`
        : `${minGap} pt${minGap !== 1 ? 's' : ''} d'écart — rangs ${rankA} et ${rankB} (${pairA.points} vs ${pairB.points}, ${catDetail})`,
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
  const finders = [findDoyen, findReleve, findDuoMixte, findPhotoFinish, findClubAnciens, findJeuneGarde];
  const awards: FunAward[] = [];
  for (const finder of finders) {
    const award = finder(swimmers);
    if (award) {
      awards.push(award);
    }
  }
  return awards;
}

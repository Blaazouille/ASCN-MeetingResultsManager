/**
 * Responsabilité : rangs « standard competition » (1, 2, 2, 4) et détection des ex-aequo.
 * Appelé par : ranking-engine.ts, individual-ranking.ts, les pages de classement, les tableaux et les exports.
 * Suppression casserait : le partage des rangs entre ex-aequo et les alertes d'égalité.
 */

/**
 * Rank of each item of a list already sorted by score descending. Equal
 * scores share a rank and the next one skips (1, 2, 2, 4): no tie-break
 * rule on purpose, the meeting manager settles ties by hand.
 */
export function assignCompetitionRanks<T>(sorted: T[], score: (item: T) => number): number[] {
  const ranks: number[] = [];
  sorted.forEach((item, index) => {
    const tied = index > 0 && score(item) === score(sorted[index - 1]!);
    ranks.push(tied ? ranks[index - 1]! : index + 1);
  });
  return ranks;
}

/** Ranks held by more than one result. */
export function tiedRanks(results: { rank: number }[]): Set<number> {
  const seen = new Set<number>();
  const tied = new Set<number>();
  for (const { rank } of results) {
    if (seen.has(rank)) tied.add(rank);
    seen.add(rank);
  }
  return tied;
}

/** Tied ranks within the first `places` places (podium or prizes), ascending. Empty = nothing to settle. */
export function findPodiumTies(results: { rank: number }[], places: number): number[] {
  return [...tiedRanks(results)].filter((rank) => rank <= places).sort((a, b) => a - b);
}

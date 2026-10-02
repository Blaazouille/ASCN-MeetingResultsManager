/**
 * Responsabilité : tableau du classement individuel filtré par la recherche (nom/club).
 * Appelé par : IndividualPage.tsx.
 * Suppression casserait : l'affichage du classement individuel.
 */
import { useMemo } from 'react';
import { ASCN_CLUB_NAME, cn, formatPoints } from '@/lib/utils';
import { tiedRanks } from '@/lib/rank-ties';
import type { IndividualResult } from '@/lib/individual-ranking';
import { RankChip } from '@/components/ui/RankChip';
import { ClubTag } from '@/components/ui/ClubTag';

export interface IndividualRankingTableProps {
  results: IndividualResult[];
  /** The first N swimmers get a prize tag (« 1er Prix », « 2e Prix »). */
  prizeCount: number;
  search: string;
}

export function IndividualRankingTable({ results, prizeCount, search }: IndividualRankingTableProps): JSX.Element {
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return results;
    return results.filter(
      (r) =>
        r.lastname.toLowerCase().includes(query) ||
        r.firstname.toLowerCase().includes(query) ||
        r.club.toLowerCase().includes(query)
    );
  }, [results, search]);

  const tied = useMemo(() => tiedRanks(results), [results]);

  if (filtered.length === 0) {
    return (
      <p className="rounded-lg bg-surface-raised p-8 text-center text-[15px] text-ink-muted shadow-card">
        {search.trim() ? 'Aucun nageur ne correspond à la recherche.' : 'Aucun résultat individuel.'}
      </p>
    );
  }

  return (
    <section aria-label="Classement individuel" className="overflow-hidden rounded-lg bg-surface-raised shadow-card">
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="h-11 bg-surface-header text-left text-[13px] font-bold uppercase tracking-[0.06em] text-ink-muted">
            <th scope="col" className="w-[190px] pl-5 pr-3">Rang</th>
            <th scope="col" className="px-3">Nom</th>
            <th scope="col" className="w-[90px] px-3">Année</th>
            <th scope="col" className="px-3">Club</th>
            <th scope="col" className="w-[130px] pl-3 pr-5 text-right">Points</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => {
            const isOwnClub = r.club === ASCN_CLUB_NAME;
            return (
              <tr
                key={`${r.lastname}-${r.firstname}-${r.birthyear}-${r.club}`}
                className={cn('h-14 border-t', isOwnClub ? 'border-corail-line bg-corail-wash' : 'border-line')}
              >
                <td className="py-2 pl-5 pr-3">
                  <span className="flex items-center gap-2">
                    <RankChip rank={r.rank} tied={tied.has(r.rank)} />
                    {r.rank <= prizeCount && (
                      <span className="whitespace-nowrap rounded-full bg-corail-soft px-2.5 py-0.5 text-xs font-bold text-corail-strong">
                        {r.rank === 1 ? '1er Prix' : `${r.rank}e Prix`}
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-3 py-2 text-base font-semibold text-ink">
                  {r.lastname} {r.firstname}
                </td>
                <td className="px-3 py-2 text-[15px] tabular-nums text-ink-muted">{r.birthyear}</td>
                <td className="px-3 py-2">
                  <span className="flex flex-wrap items-center gap-2.5 text-[15px] text-ink">
                    {r.club}
                    {isOwnClub && <ClubTag />}
                  </span>
                </td>
                <td className="py-2 pl-3 pr-5 text-right font-display text-[23px] font-bold tabular-nums text-ink">
                  {formatPoints(r.points)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

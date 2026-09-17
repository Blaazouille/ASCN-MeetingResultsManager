/**
 * Responsabilité : tableau du classement individuel avec recherche par nom/club.
 * Appelé par : IndividualPage.tsx.
 * Suppression casserait : l'affichage du classement individuel.
 */
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ASCN_CLUB_NAME, cn, formatPoints } from '@/lib/utils';
import type { IndividualResult } from '@/lib/individual-ranking';

export interface IndividualRankingTableProps {
  results: IndividualResult[];
  prizeCount: number;
}

/** Strips the "Classement " prefix for the badge, e.g. "Classement Mixte" → "Mixte". */
function categoryBadgeLabel(category: string): string {
  return category.replace(/^Classement\s+/i, '');
}

export function IndividualRankingTable({ results, prizeCount }: IndividualRankingTableProps): JSX.Element {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return results;
    return results.filter(
      (r) =>
        r.lastname.toLowerCase().includes(q) ||
        r.firstname.toLowerCase().includes(q) ||
        r.club.toLowerCase().includes(q)
    );
  }, [results, search]);

  return (
    <div className="rounded-lg bg-neutral-0 shadow-card">
      {/* Search bar */}
      <div className="flex items-center gap-2 border-b border-neutral-200 p-4">
        <Search className="h-4 w-4 text-neutral-400" aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrer par nom ou club…"
          className="w-full max-w-xs rounded-md border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-secondary-400 focus:ring-1 focus:ring-secondary-400"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="p-8 text-center text-sm text-neutral-600">
          {search.trim() ? 'Aucun nageur ne correspond à la recherche.' : 'Aucun résultat individuel.'}
        </p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-3 py-2">Rang</th>
              <th className="px-3 py-2">Nom</th>
              <th className="px-3 py-2">Année</th>
              <th className="px-3 py-2">Club</th>
              <th className="px-3 py-2">Points</th>
              <th className="px-3 py-2">Catégorie</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={`${r.lastname}-${r.firstname}-${r.birthyear}-${r.club}`}
                className="border-t border-neutral-100"
              >
                {/* Rank cell with optional prize badge */}
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-sm font-mono text-sm font-bold',
                        r.rank <= prizeCount ? 'bg-accent-600 text-neutral-0' : 'text-neutral-700'
                      )}
                    >
                      {r.rank}
                    </span>
                    {r.rank <= prizeCount && (
                      <span className="rounded-sm bg-accent-100 px-1.5 py-0.5 text-xs font-medium text-accent-800">
                        {r.rank === 1 ? '1er Prix' : `${r.rank}e Prix`}
                      </span>
                    )}
                  </span>
                </td>

                {/* Swimmer name */}
                <td className="px-3 py-2 font-medium text-neutral-900">
                  {r.lastname} {r.firstname}
                </td>

                {/* Birth year */}
                <td className="px-3 py-2 font-mono tabular-nums text-neutral-700">
                  {r.birthyear}
                </td>

                {/* Club — highlighted if ASCN */}
                <td className={cn('px-3 py-2', r.club === ASCN_CLUB_NAME && 'font-medium text-secondary-800')}>
                  {r.club}
                </td>

                {/* Points */}
                <td className="px-3 py-2 font-mono tabular-nums text-neutral-900">
                  {formatPoints(r.points)}
                </td>

                {/* Category badge */}
                <td className="px-3 py-2">
                  <span className="rounded-sm bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                    {categoryBadgeLabel(r.category)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

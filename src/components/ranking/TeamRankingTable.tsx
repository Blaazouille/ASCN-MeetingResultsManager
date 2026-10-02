/**
 * Responsabilité : tableau des clubs classés (colonnes, tri, recherche) via TanStack Table.
 * Appelé par : RankingPage.tsx.
 * Suppression casserait : l'affichage du tableau de classement.
 */
import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { cn, formatPoints, formatRetainedSwimmers } from '@/lib/utils';
import { isOurClub } from '@/lib/our-club';
import { useOurClub } from '@/hooks/use-our-club';
import { tiedRanks } from '@/lib/rank-ties';
import type { Movement } from '@/lib/import-diff';
import { filterTeamResultsByClub, type TeamResult } from '@/lib/ranking-engine';
import { formatGap, leaderRatio } from '@/lib/ui-labels';
import { RankChip } from '@/components/ui/RankChip';
import { ClubTag } from '@/components/ui/ClubTag';
import { MovementBadge } from '@/components/ui/MovementBadge';
import { TeamRow } from './TeamRow';

export interface TeamRankingTableProps {
  /** The full ranking of the category; the search filter is applied here. */
  results: TeamResult[];
  category: string;
  search: string;
  /** Rank changes since the previous import, by club; absent without a previous import. */
  movements?: Map<string, Movement> | null;
}

const columnHelper = createColumnHelper<TeamResult>();

const COLUMN_WIDTHS: Record<string, string> = {
  rank: 'w-[170px]',
  swimmerCount: 'w-[170px]',
  gap: 'w-[110px]',
  totalPoints: 'w-[240px]',
};
const RIGHT_ALIGNED = new Set(['gap', 'totalPoints']);

// TanStack Table's ColumnDef<TData, TValue> needs a shared TValue across heterogeneous
// columns; `any` here is the library's own documented pattern for a mixed column array.
function buildColumns(
  leaderPoints: number,
  tied: Set<number>,
  ourClub: string,
  movements?: Map<string, Movement> | null
): ColumnDef<TeamResult, any>[] {
  return [
    columnHelper.accessor('rank', {
      header: 'Rang',
      cell: (info) => (
        <span className="flex items-center gap-2">
          <RankChip rank={info.getValue()} tied={tied.has(info.getValue())} />
          <MovementBadge movement={movements?.get(info.row.original.club)} />
        </span>
      ),
    }),
    columnHelper.accessor('club', {
      header: 'Club',
      cell: (info) => (
        <span className="flex flex-wrap items-center gap-2.5 text-base font-semibold text-ink">
          {info.getValue()}
          {isOurClub(info.getValue(), ourClub) && <ClubTag />}
        </span>
      ),
    }),
    columnHelper.accessor('swimmerCount', {
      header: 'Nageurs',
      cell: (info) => (
        <span className="text-sm text-ink-muted">
          {formatRetainedSwimmers(info.row.original.swimmers.length, info.getValue())}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'gap',
      header: 'Écart',
      cell: (info) => (
        <span className="block text-right text-[15px] tabular-nums text-ink-muted">
          {formatGap(info.row.original.totalPoints, leaderPoints)}
        </span>
      ),
    }),
    columnHelper.accessor('totalPoints', {
      header: 'Points',
      cell: (info) => {
        const isOwnClub = isOurClub(info.row.original.club, ourClub);
        const width = `${Math.round(leaderRatio(info.getValue(), leaderPoints) * 100)}%`;
        return (
          <span className="flex items-center justify-end gap-3.5">
            {/* The bar shows the gap to the 1st at a glance, without reading numbers. */}
            <span className={cn('block h-1.5 w-[120px] rounded-full', isOwnClub ? 'bg-corail-line' : 'bg-line')}>
              <span
                className={cn('block h-1.5 rounded-full', isOwnClub ? 'bg-corail' : 'bg-bassin')}
                style={{ width }}
              />
            </span>
            <span className="min-w-[64px] text-right font-display text-[23px] font-bold tabular-nums text-ink">
              {formatPoints(info.getValue())}
            </span>
          </span>
        );
      },
    }),
  ];
}

export function TeamRankingTable({ results, category, search, movements }: TeamRankingTableProps): JSX.Element {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => filterTeamResultsByClub(results, search), [results, search]);
  // Gaps and bars compare every club to the 1st of the whole ranking, not of the filtered view.
  const leaderPoints = results[0]?.totalPoints ?? 0;
  const tied = useMemo(() => tiedRanks(results), [results]);
  const ourClub = useOurClub();
  const columns = useMemo(
    () => buildColumns(leaderPoints, tied, ourClub, movements),
    [leaderPoints, tied, ourClub, movements]
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (team) => team.club,
  });

  function toggle(club: string): void {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(club)) {
        next.delete(club);
      } else {
        next.add(club);
      }
      return next;
    });
  }

  if (filtered.length === 0) {
    return (
      <p className="rounded-lg bg-surface-raised p-8 text-center text-[15px] text-ink-muted shadow-card">
        {search.trim() !== '' ? 'Aucun club ne correspond à la recherche.' : 'Aucun classement pour cette catégorie.'}
      </p>
    );
  }

  return (
    <section aria-label="Classement complet" className="overflow-hidden rounded-lg bg-surface-raised shadow-card">
      <table className="w-full table-fixed border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="h-11 bg-surface-header text-left text-[13px] font-bold uppercase tracking-[0.06em] text-ink-muted">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className={cn('px-3 first:pl-5', COLUMN_WIDTHS[header.id], RIGHT_ALIGNED.has(header.id) && 'text-right')}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
              <th scope="col" className="w-14 pr-5">
                <span className="sr-only">Détail</span>
              </th>
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <TeamRow
              key={row.id}
              row={row}
              category={category}
              isOwnClub={isOurClub(row.original.club, ourClub)}
              isExpanded={expanded.has(row.original.club)}
              onToggle={() => toggle(row.original.club)}
            />
          ))}
        </tbody>
      </table>
    </section>
  );
}

import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { ChevronRight, Search } from 'lucide-react';
import { ASCN_CLUB_NAME, cn, formatPoints } from '@/lib/utils';
import { filterTeamResultsByClub, type TeamResult } from '@/lib/ranking-engine';
import type { TopN } from '@/hooks/use-ranking';
import { TeamRow } from './TeamRow';

const PODIUM_STYLES: Record<number, string> = {
  1: 'bg-accent-600 text-neutral-0',
  2: 'bg-neutral-400 text-neutral-0',
  3: 'bg-accent-800 text-neutral-0',
};

export interface TeamRankingTableProps {
  results: TeamResult[];
  topN: TopN;
  search: string;
  onSearchChange: (value: string) => void;
}

const columnHelper = createColumnHelper<TeamResult>();

/**
 * Rank/club/points/swimmer-count columns — independent of expand state, so
 * they're memoized separately from the expand column to avoid rebuilding
 * every column on every row toggle.
 */
// TanStack Table's ColumnDef<TData, TValue> needs a shared TValue across heterogeneous
// columns; `any` here is the library's own documented pattern for a mixed column array.
function buildBaseColumns(topN: TopN): ColumnDef<TeamResult, any>[] {
  return [
    columnHelper.accessor('rank', {
      header: 'Rang',
      cell: (info) => {
        const rank = info.getValue();
        return (
          <span
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-sm font-mono text-sm font-bold',
              PODIUM_STYLES[rank] ?? 'text-neutral-700'
            )}
            data-numeric
          >
            {rank}
          </span>
        );
      },
    }),
    columnHelper.accessor('club', {
      header: 'Club',
      cell: (info) => {
        const club = info.getValue();
        return (
          <span className={cn('font-medium text-neutral-900', club === ASCN_CLUB_NAME && 'text-secondary-800')}>
            {club}
          </span>
        );
      },
    }),
    columnHelper.accessor('totalPoints', {
      header: 'Points',
      cell: (info) => (
        <span className="font-mono tabular-nums" data-numeric>
          {formatPoints(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor('swimmerCount', {
      id: 'swimmerBadge',
      header: 'Nageurs',
      cell: (info) => (
        <span className="rounded-sm bg-neutral-100 px-2 py-0.5 font-mono text-xs" data-numeric>
          {info.getValue()}/{topN}
        </span>
      ),
    }),
  ];
}

function buildExpandColumn(expanded: Set<string>, onToggle: (club: string) => void): ColumnDef<TeamResult, any> {
  return columnHelper.display({
    id: 'expand',
    header: '',
    cell: (info) => {
      const club = info.row.original.club;
      const isExpanded = expanded.has(club);
      return (
        <button
          type="button"
          aria-label={isExpanded ? `Masquer le détail de ${club}` : `Afficher le détail de ${club}`}
          aria-expanded={isExpanded}
          onClick={() => onToggle(club)}
          className="flex h-7 w-7 items-center justify-center rounded-sm text-neutral-500 transition-colors duration-150 hover:bg-neutral-100"
        >
          <ChevronRight className={cn('h-4 w-4 transition-transform duration-150', isExpanded && 'rotate-90')} />
        </button>
      );
    },
  });
}

export function TeamRankingTable({ results, topN, search, onSearchChange }: TeamRankingTableProps): JSX.Element {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => filterTeamResultsByClub(results, search), [results, search]);

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

  const baseColumns = useMemo(() => buildBaseColumns(topN), [topN]);
  const expandColumn = useMemo(() => buildExpandColumn(expanded, toggle), [expanded]);
  const columns = useMemo(() => [...baseColumns, expandColumn], [baseColumns, expandColumn]);

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (team) => team.club,
  });

  return (
    <div className="rounded-lg bg-neutral-0 shadow-card">
      <div className="flex items-center gap-2 border-b border-neutral-200 p-4">
        <Search className="h-4 w-4 text-neutral-400" aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Filtrer par nom de club…"
          className="w-full max-w-xs rounded-md border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-secondary-400 focus:ring-1 focus:ring-secondary-400"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="p-8 text-center text-sm text-neutral-600">
          {search.trim() !== ''
            ? 'Aucun club ne correspond à la recherche.'
            : 'Aucun classement pour cette catégorie.'}
        </p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="text-left text-xs uppercase tracking-wide text-neutral-500">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <TeamRow
                key={row.id}
                row={row}
                isAscn={row.original.club === ASCN_CLUB_NAME}
                isExpanded={expanded.has(row.original.club)}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

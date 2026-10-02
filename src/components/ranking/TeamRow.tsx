/**
 * Responsabilité : ligne de club du tableau de classement, avec drill-down nageurs.
 * Appelé par : TeamRankingTable.tsx.
 * Suppression casserait : l'affichage des lignes de classement et le détail nageurs.
 */
import { Fragment, memo } from 'react';
import { flexRender, type Row } from '@tanstack/react-table';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamResult } from '@/lib/ranking-engine';
import { SwimmerDetail } from './SwimmerDetail';

export interface TeamRowProps {
  row: Row<TeamResult>;
  category: string;
  isOwnClub: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

/** One club row in the ranking table, plus its expandable swimmer-detail row. */
function TeamRowComponent({ row, category, isOwnClub, isExpanded, onToggle }: TeamRowProps): JSX.Element {
  const cells = row.getVisibleCells();
  const team = row.original;

  return (
    <Fragment>
      {/* The whole row toggles on click (mouse); the chevron is the keyboard-accessible button. */}
      <tr
        data-club={team.club}
        onClick={onToggle}
        className={cn(
          'h-14 cursor-pointer border-t transition-colors',
          isOwnClub ? 'border-corail-line bg-corail-wash hover:bg-corail-soft' : 'border-line hover:bg-surface'
        )}
      >
        {cells.map((cell) => (
          <td key={cell.id} className="px-3 py-2 first:pl-5">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
        <td className="pr-5 text-right">
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? 'Masquer' : 'Voir'} les nageurs de ${team.club}`}
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
            className={cn(
              'inline-flex h-11 w-11 items-center justify-center rounded-sm transition-colors',
              isOwnClub ? 'text-corail-strong hover:bg-corail-soft' : 'text-ink-muted hover:bg-surface-sunken'
            )}
          >
            <ChevronDown className={cn('h-5 w-5 transition-transform', isExpanded && 'rotate-180')} aria-hidden />
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr className={isOwnClub ? 'bg-corail-wash' : 'bg-surface'}>
          <td colSpan={cells.length + 1} className="pb-5 pl-[92px] pr-5 pt-1">
            <SwimmerDetail swimmers={team.swimmers} entered={team.swimmerCount} category={category} isOwnClub={isOwnClub} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}

export const TeamRow = memo(TeamRowComponent);

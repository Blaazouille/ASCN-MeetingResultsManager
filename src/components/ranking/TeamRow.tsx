/**
 * Responsabilité : ligne de club du tableau de classement, avec drill-down nageurs.
 * Appelé par : TeamRankingTable.tsx.
 * Suppression casserait : l'affichage des lignes de classement et le détail nageurs.
 */
import { Fragment, memo } from 'react';
import { flexRender, type Row } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import type { TeamResult } from '@/lib/ranking-engine';
import { SwimmerDetail } from './SwimmerDetail';

export interface TeamRowProps {
  row: Row<TeamResult>;
  isAscn: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

/** One club row in the ranking table, plus its expandable swimmer-detail row. */
function TeamRowComponent({ row, isAscn, isExpanded, onToggle }: TeamRowProps): JSX.Element {
  const cells = row.getVisibleCells();

  return (
    <Fragment>
      <tr
        onClick={onToggle}
        className={cn(
          'cursor-pointer border-t border-neutral-100 transition-colors duration-150 hover:bg-neutral-50',
          isAscn && 'bg-secondary-50 hover:bg-secondary-100'
        )}
      >
        {cells.map((cell) => (
          <td key={cell.id} className="px-3 py-2">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
      {isExpanded && (
        <tr className="bg-neutral-50">
          <td colSpan={cells.length} className="px-3 py-3">
            <SwimmerDetail swimmers={row.original.swimmers} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}

export const TeamRow = memo(TeamRowComponent);

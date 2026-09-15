import { Fragment } from 'react';
import { flexRender, type Row } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import type { TeamResult } from '@/lib/ranking-engine';
import { SwimmerDetail } from './SwimmerDetail';

export interface TeamRowProps {
  row: Row<TeamResult>;
  isAscn: boolean;
  isExpanded: boolean;
}

/** One club row in the ranking table, plus its expandable swimmer-detail row. */
export function TeamRow({ row, isAscn, isExpanded }: TeamRowProps): JSX.Element {
  const cells = row.getVisibleCells();

  return (
    <Fragment>
      <tr className={cn('border-t border-neutral-100', isAscn && 'bg-secondary-50')}>
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

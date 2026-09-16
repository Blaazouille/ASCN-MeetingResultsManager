import { ASCN_CLUB_NAME, cn, formatPoints } from '@/lib/utils';
import type { TeamResult } from '@/lib/ranking-engine';
import type { PrintMeta } from '@/lib/print-data';

export interface A4PageProps {
  meta: PrintMeta;
  category: string;
  results: TeamResult[];
}

/** Strips the "Classement " prefix, e.g. "Classement Mixte" -> "Mixte". */
function categoryLabel(category: string): string {
  return category.replace(/^Classement\s+/i, '');
}

/**
 * A4-formatted team ranking page, used both for the in-app print preview
 * and as the target of `window.print()`. Marked `print-area` so the global
 * print stylesheet isolates it from the rest of the app when printing.
 */
export function A4Page({ meta, category, results }: A4PageProps): JSX.Element {
  return (
    <div className="print-area mx-auto w-[210mm] bg-neutral-0 p-12 text-neutral-900">
      <header className="mb-6 border-b border-neutral-900 pb-4">
        <h1 className="font-display text-2xl font-bold">{meta.meetingName}</h1>
        <p className="font-body text-sm font-medium text-neutral-700">
          Classement par équipes : {categoryLabel(category)}
        </p>
        <p className="font-body text-sm text-neutral-600">{meta.date}</p>
      </header>

      {results.length === 0 ? (
        <p className="text-base text-neutral-600">Aucun club classé pour cette catégorie.</p>
      ) : (
        <table className="w-full border-collapse text-base">
          <thead>
            <tr className="border-b-2 border-neutral-900 text-left text-xs uppercase tracking-wide text-neutral-600">
              <th className="w-16 py-2 font-display">Rang</th>
              <th className="py-2 font-display">Club</th>
              <th className="w-28 py-2 text-right font-display">Points</th>
            </tr>
          </thead>
          <tbody>
            {results.map((team, index) => (
              <tr
                key={team.club}
                className={cn(
                  'border-b border-neutral-200',
                  index % 2 === 1 && 'bg-neutral-50',
                  team.club === ASCN_CLUB_NAME && 'bg-secondary-50'
                )}
              >
                <td className="py-2 align-top font-display text-lg font-bold">{team.rank}</td>
                <td className="py-2 align-top">
                  <p className="font-body text-base font-semibold">{team.club}</p>
                  <p className="font-body text-xs text-neutral-600">
                    {team.swimmers.map((swimmer) => `${swimmer.lastname} ${swimmer.firstname}`).join(', ')}
                  </p>
                </td>
                <td className="py-2 text-right align-top font-mono text-base tabular-nums" data-numeric>
                  {formatPoints(team.totalPoints)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <footer className="mt-8 flex items-center justify-between border-t border-neutral-200 pt-3 text-xs text-neutral-600">
        <span>Calculé le {meta.computedAt}</span>
        <span
          className={cn(
            'rounded-sm px-2 py-0.5 font-medium uppercase tracking-wide',
            meta.status === 'Provisoire' ? 'bg-warning-light text-warning' : 'bg-success-light text-success'
          )}
        >
          {meta.status}
        </span>
      </footer>
    </div>
  );
}

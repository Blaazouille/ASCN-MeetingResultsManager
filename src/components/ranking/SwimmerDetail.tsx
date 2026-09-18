/**
 * Responsabilité : liste détaillée des nageurs d'un club (drill-down).
 * Appelé par : TeamRow.tsx.
 * Suppression casserait : le détail nageurs affiché au clic sur une ligne club.
 */
import { formatPoints } from '@/lib/utils';
import type { SwimmerEntry } from '@/lib/ranking-engine';

export interface SwimmerDetailProps {
  swimmers: SwimmerEntry[];
}

/** Sub-table shown when a club row is expanded: the topN retained swimmers. */
export function SwimmerDetail({ swimmers }: SwimmerDetailProps): JSX.Element {
  return (
    <table className="w-full max-w-xl text-xs">
      <thead>
        <tr className="text-left uppercase tracking-wide text-neutral-500">
          <th className="w-10 py-1 text-center">Rang</th>
          <th className="py-1">Nom</th>
          <th className="w-20 py-1 text-center">Année</th>
          <th className="w-20 py-1 text-right">Points</th>
        </tr>
      </thead>
      <tbody>
        {/* Keyed on array index: swimmers is a fresh, stable slice built by computeTeamRanking
            for this render and is never sorted/filtered afterwards, so index is a safe, simple
            key. swimmer.rank is the shared FFN `place` column (ex-aequo swimmers can share it)
            and lastname/firstname can repeat too, so none of them are a safer choice than index. */}
        {swimmers.map((swimmer, index) => (
          <tr key={index}>
            <td className="py-1 text-center font-mono" data-numeric>
              {swimmer.rank}
            </td>
            <td className="py-1">
              {swimmer.lastname.toUpperCase()} {swimmer.firstname}
            </td>
            <td className="py-1 text-center font-mono" data-numeric>
              {swimmer.birthyear}
            </td>
            <td className="py-1 text-right font-mono" data-numeric>
              {formatPoints(swimmer.points)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

import { formatPoints } from '@/lib/utils';
import type { SwimmerEntry } from '@/lib/ranking-engine';

export interface SwimmerDetailProps {
  swimmers: SwimmerEntry[];
}

/** Sub-table shown when a club row is expanded: the topN retained swimmers. */
export function SwimmerDetail({ swimmers }: SwimmerDetailProps): JSX.Element {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left uppercase tracking-wide text-neutral-500">
          <th className="w-10 py-1 text-center">Rang</th>
          <th className="py-1">Nom</th>
          <th className="w-20 py-1 text-center">Année</th>
          <th className="w-20 py-1 text-right">Points</th>
        </tr>
      </thead>
      <tbody>
        {swimmers.map((swimmer) => (
          <tr key={`${swimmer.lastname}-${swimmer.firstname}`}>
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

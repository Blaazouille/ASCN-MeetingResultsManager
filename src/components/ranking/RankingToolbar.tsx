import { TOP_N_OPTIONS, type TopN } from '@/hooks/use-ranking';

export interface RankingToolbarProps {
  topN: TopN;
  onTopNChange: (topN: TopN) => void;
}

/** Top N selector plus the (currently fixed) meeting status badge. */
export function RankingToolbar({ topN, onTopNChange }: RankingToolbarProps): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="flex items-center gap-2 text-sm text-neutral-700">
        Top N nageurs
        <select
          value={topN}
          onChange={(event) => onTopNChange(Number(event.target.value) as TopN)}
          className="rounded-md border border-neutral-200 px-2 py-1 font-mono text-sm outline-none focus:border-secondary-400 focus:ring-1 focus:ring-secondary-400"
        >
          {TOP_N_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <span className="rounded-sm bg-warning-light px-2 py-1 text-xs font-medium uppercase tracking-wide text-warning">
        Provisoire
      </span>
    </div>
  );
}

import { Download, FileSpreadsheet } from 'lucide-react';
import { TOP_N_OPTIONS, type TopN } from '@/hooks/use-ranking';

export interface RankingToolbarProps {
  topN: TopN;
  onTopNChange: (topN: TopN) => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  isExporting: boolean;
}

/** Top N selector, meeting status badge, and export actions. */
export function RankingToolbar({
  topN,
  onTopNChange,
  onExportPdf,
  onExportExcel,
  isExporting,
}: RankingToolbarProps): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onExportPdf}
          disabled={isExporting}
          className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors duration-150 hover:bg-neutral-100 disabled:opacity-60"
        >
          <Download className="h-4 w-4" aria-hidden />
          Export PDF
        </button>
        <button
          type="button"
          onClick={onExportExcel}
          disabled={isExporting}
          className="flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-neutral-0 transition-colors duration-150 hover:bg-accent-700 disabled:opacity-60"
        >
          <FileSpreadsheet className="h-4 w-4" aria-hidden />
          Export Excel
        </button>
      </div>
    </div>
  );
}

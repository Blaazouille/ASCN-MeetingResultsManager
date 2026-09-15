// src/components/print/PrintPreview.tsx
import { A4Page } from './A4Page';
import type { PrintMeta } from '@/lib/print-data';
import type { TeamResult } from '@/lib/ranking-engine';

export interface PrintPreviewProps {
  meta: PrintMeta;
  category: string;
  results: TeamResult[];
}

/** Centers the A4 page with a "paper" shadow; the page itself is what actually prints. */
export function PrintPreview({ meta, category, results }: PrintPreviewProps): JSX.Element {
  return (
    <div className="flex justify-center overflow-x-auto bg-neutral-100 p-8">
      <div className="shadow-card-hover">
        <A4Page meta={meta} category={category} results={results} />
      </div>
    </div>
  );
}

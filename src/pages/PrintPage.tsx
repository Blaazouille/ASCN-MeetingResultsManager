import { useMemo } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { useRanking } from '@/hooks/use-ranking';
import { usePrintExport } from '@/hooks/use-print-export';
import { buildPrintMeta } from '@/lib/print-data';
import { PrintControls } from '@/components/print/PrintControls';
import { PrintPreview } from '@/components/print/PrintPreview';

export default function PrintPage(): JSX.Element {
  const { importState } = useOutletContext<AppOutletContext>();

  const rows = importState.result?.rows ?? [];
  const categories = importState.result?.categories ?? [];
  const ranking = useRanking(rows, categories);
  const meta = useMemo(() => buildPrintMeta(), []);
  const { isExporting, error, exportPdf } = usePrintExport();

  if (!importState.result) {
    return <Navigate to="/import" replace />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary-800">Impression</h1>
        <p className="text-neutral-600">{importState.fileName}</p>
      </header>

      <PrintControls
        categories={categories}
        category={ranking.category}
        onCategoryChange={ranking.setCategory}
        onPrint={() => window.print()}
        onDownloadPdf={() => exportPdf(ranking.category, ranking.teamResults)}
        isExporting={isExporting}
      />
      {error && <p className="text-sm text-error">{error}</p>}

      <PrintPreview meta={meta} category={ranking.category} results={ranking.teamResults} />
    </div>
  );
}

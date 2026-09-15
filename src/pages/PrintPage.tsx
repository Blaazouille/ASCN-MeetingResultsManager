import { useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { useRanking } from '@/hooks/use-ranking';
import { buildPrintMeta } from '@/lib/print-data';
import { exportRankingToPdf } from '@/lib/pdf-export';
import { PrintControls } from '@/components/print/PrintControls';
import { PrintPreview } from '@/components/print/PrintPreview';

export default function PrintPage(): JSX.Element {
  const { importState } = useOutletContext<AppOutletContext>();
  const [isExporting, setIsExporting] = useState(false);

  const rows = importState.result?.rows ?? [];
  const categories = importState.result?.categories ?? [];
  const ranking = useRanking(rows, categories);
  const meta = useMemo(() => buildPrintMeta(), []);

  if (!importState.result) {
    return <Navigate to="/import" replace />;
  }

  async function handleDownloadPdf(): Promise<void> {
    setIsExporting(true);
    try {
      await exportRankingToPdf(meta, ranking.category, ranking.teamResults);
    } finally {
      setIsExporting(false);
    }
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
        onDownloadPdf={handleDownloadPdf}
        isExporting={isExporting}
      />

      <PrintPreview meta={meta} category={ranking.category} results={ranking.teamResults} />
    </div>
  );
}

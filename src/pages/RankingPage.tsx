import { useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { useRanking } from '@/hooks/use-ranking';
import { usePrintExport } from '@/hooks/use-print-export';
import { buildPrintMeta } from '@/lib/print-data';
import { CategoryTabs } from '@/components/ranking/CategoryTabs';
import { RankingToolbar } from '@/components/ranking/RankingToolbar';
import { TeamRankingTable } from '@/components/ranking/TeamRankingTable';
import { A4Page } from '@/components/print/A4Page';

export default function RankingPage(): JSX.Element {
  const { importState } = useOutletContext<AppOutletContext>();
  const [search, setSearch] = useState('');

  const rows = importState.result?.rows ?? [];
  const categories = importState.result?.categories ?? [];
  const ranking = useRanking(rows, categories);
  const meta = useMemo(() => buildPrintMeta(), []);
  const { isExporting, error, exportPdf, exportExcel } = usePrintExport();

  if (!importState.result) {
    return <Navigate to="/import" replace />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary-800">Classement par équipes</h1>
        <p className="text-neutral-600">{importState.fileName}</p>
      </header>

      <CategoryTabs categories={categories} active={ranking.category} onChange={ranking.setCategory} />
      <RankingToolbar
        topN={ranking.topN}
        onTopNChange={ranking.setTopN}
        onPrint={() => window.print()}
        onExportPdf={() => exportPdf(ranking.category, ranking.teamResults)}
        onExportExcel={() => exportExcel(ranking.category, ranking.teamResults)}
        isExporting={isExporting}
      />
      {error && <p className="text-sm text-error">{error}</p>}
      <TeamRankingTable
        results={ranking.teamResults}
        topN={ranking.topN}
        search={search}
        onSearchChange={setSearch}
      />

      {/*
        Off-screen (never display:none, so the print stylesheet's
        visibility toggle still works) A4 layout: this is what
        window.print() actually shows, so "Imprimer" on this screen
        prints the formatted ranking instead of the on-screen table.
      */}
      <div className="fixed -left-[9999px] top-0 print:static print:left-auto print:top-auto">
        <A4Page meta={meta} category={ranking.category} results={ranking.teamResults} />
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { useMeetingRows } from '@/hooks/use-meeting-rows';
import { useRanking } from '@/hooks/use-ranking';
import { usePrintExport } from '@/hooks/use-print-export';
import { buildPrintMeta } from '@/lib/print-data';
import { CategoryTabs } from '@/components/ranking/CategoryTabs';
import { RankingToolbar } from '@/components/ranking/RankingToolbar';
import { TeamRankingTable } from '@/components/ranking/TeamRankingTable';
import { A4Page } from '@/components/print/A4Page';

export default function RankingPage(): JSX.Element {
  const { meetingState } = useOutletContext<AppOutletContext>();
  const [search, setSearch] = useState('');

  const meetingId = meetingState.currentMeeting?.id ?? null;
  const { rows, categories, isLoading, error: rowsError } = useMeetingRows(meetingId);
  const ranking = useRanking(rows, categories);
  const meta = useMemo(
    () => (meetingState.currentMeeting ? buildPrintMeta(meetingState.currentMeeting) : null),
    [meetingState.currentMeeting]
  );
  const { isExporting, error, exportPdf, exportExcel } = usePrintExport();

  const meeting = meetingState.currentMeeting;
  if (!meeting) {
    return <Navigate to="/" replace />;
  }
  if (isLoading) {
    return <p className="text-neutral-600">Chargement du classement…</p>;
  }
  if (rowsError) {
    return <p className="text-sm text-error">{rowsError}</p>;
  }
  if (rows.length === 0) {
    return <Navigate to="/import" replace />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary-800">Classement par équipes</h1>
        <p className="text-neutral-600">{meeting.name}</p>
      </header>

      <CategoryTabs categories={categories} active={ranking.category} onChange={ranking.setCategory} />
      <RankingToolbar
        topN={ranking.topN}
        onTopNChange={ranking.setTopN}
        onPrint={() => window.print()}
        onExportPdf={() => exportPdf(meeting, ranking.category, ranking.teamResults)}
        onExportExcel={() => exportExcel(meeting, ranking.category, ranking.teamResults)}
        isExporting={isExporting}
      />
      {error && <p className="text-sm text-error">{error}</p>}
      <TeamRankingTable
        results={ranking.teamResults}
        topN={ranking.topN}
        search={search}
        onSearchChange={setSearch}
      />

      {meta && (
        <div className="fixed -left-[9999px] top-0 print:static print:left-auto print:top-auto">
          <A4Page meta={meta} category={ranking.category} results={ranking.teamResults} />
        </div>
      )}
    </div>
  );
}

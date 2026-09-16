import { useMemo } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { useMeetingRows } from '@/hooks/use-meeting-rows';
import { useRanking } from '@/hooks/use-ranking';
import { usePrintExport } from '@/hooks/use-print-export';
import { buildPrintMeta } from '@/lib/print-data';
import { PrintControls } from '@/components/print/PrintControls';
import { PrintPreview } from '@/components/print/PrintPreview';

export default function PrintPage(): JSX.Element {
  const { meetingState } = useOutletContext<AppOutletContext>();

  const meetingId = meetingState.currentMeeting?.id ?? null;
  const { rows, categories, isLoading, error: rowsError } = useMeetingRows(meetingId);
  const ranking = useRanking(rows, categories);
  const meta = useMemo(
    () => (meetingState.currentMeeting ? buildPrintMeta(meetingState.currentMeeting) : null),
    [meetingState.currentMeeting]
  );
  const { isExporting, error, exportPdf } = usePrintExport();

  const meeting = meetingState.currentMeeting;
  if (!meeting) {
    return <Navigate to="/" replace />;
  }
  if (isLoading) {
    return <p className="text-neutral-600">Chargement…</p>;
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
        <h1 className="text-2xl font-bold text-primary-800">Impression</h1>
        <p className="text-neutral-600">{meeting.name}</p>
      </header>

      <PrintControls
        categories={categories}
        category={ranking.category}
        onCategoryChange={ranking.setCategory}
        onPrint={() => window.print()}
        onDownloadPdf={() => exportPdf(meeting, ranking.category, ranking.teamResults)}
        isExporting={isExporting}
      />
      {error && <p className="text-sm text-error">{error}</p>}

      {meta && <PrintPreview meta={meta} category={ranking.category} results={ranking.teamResults} />}
    </div>
  );
}

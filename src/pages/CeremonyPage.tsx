/**
 * Responsabilité : écran Cérémonie — antisèche du gérant pour la remise des prix (préparation, puis déroulé guidé).
 * Appelé par : App.tsx (route /ceremonie).
 * Suppression casserait : le déroulé guidé de la remise des prix et sa fiche PDF.
 */
import { Navigate, useOutletContext } from 'react-router-dom';
import { Play, Printer, Undo2 } from 'lucide-react';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { useMeetingRows } from '@/hooks/use-meeting-rows';
import { useCeremony } from '@/hooks/use-ceremony';
import { useCeremonyExport } from '@/hooks/use-ceremony-export';
import { Button } from '@/components/ui/Button';
import { NO_CATEGORY_HINT_ID } from '@/components/ceremony/CeremonyCategoryPicker';
import { CeremonyPreparation } from '@/components/ceremony/CeremonyPreparation';
import { CeremonyRun } from '@/components/ceremony/CeremonyRun';
import { ExportFeedback } from '@/components/ranking/ExportFeedback';
import { LeaveCeremonyDialog } from '@/components/ceremony/LeaveCeremonyDialog';

export default function CeremonyPage(): JSX.Element {
  const { meetingState } = useOutletContext<AppOutletContext>();
  const meeting = meetingState.currentMeeting;
  const { rows, isLoading, error } = useMeetingRows(meeting?.id ?? null);
  const ceremony = useCeremony(meeting, rows);
  const { isExporting, error: exportError, notice: exportNotice, exportPdf } = useCeremonyExport();

  if (!meeting) return <Navigate to="/" replace />;
  if (isLoading) return <p className="text-[15px] text-ink-muted">Chargement…</p>;
  if (error) return <p className="text-sm text-error">{error}</p>;
  if (rows.length === 0) return <Navigate to="/import" replace />;

  const { run } = ceremony;
  // The sheet always matches what is on screen: the frozen script once launched, the preview before.
  const printedSteps = run?.steps ?? ceremony.preview;
  // Only while preparing: once launched, the frozen run no longer depends on the boxes.
  const blockedByCategory = run === null && ceremony.isMissingCategory;
  const blockedHint = blockedByCategory ? NO_CATEGORY_HINT_ID : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        overline={meeting.name}
        title="Cérémonie"
        subtitle={
          run === null
            ? "Préparez l'ordre des annonces, puis lancez le déroulé au moment de la remise des prix."
            : "Lisez l'annonce affichée, puis passez à la suivante."
        }
        actions={
          <>
            <Button
              icon={Printer}
              disabled={isExporting || blockedByCategory || printedSteps.length === 0}
              aria-describedby={blockedHint}
              onClick={() => void exportPdf(meeting, printedSteps)}
            >
              Imprimer le déroulé
            </Button>
            {run === null ? (
              // Distinct keys: React must not reuse one <button> for the other, or the
              // focus left on « Lancer » would land on « Revenir à la préparation ».
              <Button
                key="start"
                variant="primary"
                icon={Play}
                disabled={blockedByCategory || ceremony.preview.length === 0}
                aria-describedby={blockedHint}
                onClick={ceremony.start}
              >
                Lancer le déroulé
              </Button>
            ) : (
              <Button key="leave" icon={Undo2} onClick={ceremony.requestLeave}>
                Revenir à la préparation
              </Button>
            )}
          </>
        }
      />
      <ExportFeedback error={exportError} notice={exportNotice} />
      {run === null ? (
        <CeremonyPreparation
          plan={ceremony.plan}
          onToggleBlock={ceremony.toggleBlock}
          onMoveBlock={ceremony.moveBlock}
          teamPlaces={ceremony.teamPlaces}
          onTeamPlacesChange={ceremony.setTeamPlaces}
          preview={ceremony.preview}
          warnings={ceremony.warnings}
          availableCategories={ceremony.availableCategories}
          categories={ceremony.categories}
          isMissingCategory={ceremony.isMissingCategory}
          onToggleCategory={ceremony.toggleCategory}
        />
      ) : (
        <CeremonyRun
          run={run}
          hasNewerData={ceremony.hasNewerData}
          onStep={ceremony.step}
          onGoTo={ceremony.goTo}
        />
      )}
      {ceremony.isLeaving && <LeaveCeremonyDialog onConfirm={ceremony.confirmLeave} onCancel={ceremony.cancelLeave} />}
    </div>
  );
}

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
import { CeremonyPreparation } from '@/components/ceremony/CeremonyPreparation';
import { CeremonyRun } from '@/components/ceremony/CeremonyRun';
import { LeaveCeremonyDialog } from '@/components/ceremony/LeaveCeremonyDialog';

export default function CeremonyPage(): JSX.Element {
  const { meetingState } = useOutletContext<AppOutletContext>();
  const meeting = meetingState.currentMeeting;
  const { rows, isLoading, error } = useMeetingRows(meeting?.id ?? null);
  const ceremony = useCeremony(meeting, rows);
  const { isExporting, error: exportError, exportPdf } = useCeremonyExport();

  if (!meeting) return <Navigate to="/" replace />;
  if (isLoading) return <p className="text-[15px] text-ink-muted">Chargement…</p>;
  if (error) return <p className="text-sm text-error">{error}</p>;
  if (rows.length === 0) return <Navigate to="/import" replace />;

  const { run } = ceremony;
  // The sheet always matches what is on screen: the frozen script once launched, the preview before.
  const printedSteps = run?.steps ?? ceremony.preview;

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
            <Button icon={Printer} disabled={isExporting || printedSteps.length === 0} onClick={() => void exportPdf(meeting, printedSteps)}>
              Imprimer le déroulé
            </Button>
            {run === null ? (
              // Distinct keys: React must not reuse one <button> for the other, or the
              // focus left on « Lancer » would land on « Revenir à la préparation ».
              <Button key="start" variant="primary" icon={Play} disabled={ceremony.preview.length === 0} onClick={ceremony.start}>
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
      {exportError && <p className="text-sm text-error">{exportError}</p>}
      {run === null ? (
        <CeremonyPreparation
          plan={ceremony.plan}
          onToggleBlock={ceremony.toggleBlock}
          onMoveBlock={ceremony.moveBlock}
          teamPlaces={ceremony.teamPlaces}
          onTeamPlacesChange={ceremony.setTeamPlaces}
          preview={ceremony.preview}
          warnings={ceremony.warnings}
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

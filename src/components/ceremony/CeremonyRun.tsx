/**
 * Responsabilité : déroulé pendant la cérémonie (progression, annonce courante, Précédent / Suivant, liste latérale).
 * Appelé par : CeremonyPage.tsx.
 * Suppression casserait : la phase « pendant la cérémonie » de l'écran Cérémonie.
 */
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { CeremonyRun as CeremonyRunState } from '@/lib/ceremony-session';
import { isCeremonyFinished, type CeremonyMove } from '@/lib/ceremony-navigation';
import { progressLabel } from '@/lib/ceremony-labels';
import { Button } from '@/components/ui/Button';
import { CeremonyStepCard } from './CeremonyStepCard';
import { CeremonyStepList } from './CeremonyStepList';

export interface CeremonyRunProps {
  run: CeremonyRunState;
  hasNewerData: boolean;
  onStep: (move: CeremonyMove) => void;
  onGoTo: (index: number) => void;
}

export function CeremonyRun({ run, hasNewerData, onStep, onGoTo }: CeremonyRunProps): JSX.Element {
  const { steps, progress } = run;
  const total = steps.length;
  const finished = isCeremonyFinished(progress, total);
  const isLast = progress.current === total - 1;
  const step = steps[progress.current]!;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-6">
      <div className="flex flex-col gap-5">
        {hasNewerData && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-lg border border-corail-line bg-corail-wash px-5 py-3 text-base font-semibold text-corail-strong"
          >
            <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
            <span>
              Des résultats plus récents ont été importés. Ce déroulé n&apos;a pas changé depuis son lancement&nbsp;:
              revenez à la préparation pour en tenir compte.
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="font-display text-2xl font-bold tabular-nums text-marine">{progressLabel(progress.current, total)}</span>
          <div
            role="progressbar"
            aria-label="Annonces faites"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={progress.reached}
            className="h-2 overflow-hidden rounded-full bg-surface-sunken"
          >
            {/* Width is the one dynamic value here, hence the inline style. */}
            <div className="h-full rounded-full bg-bassin" style={{ width: `${(progress.reached / total) * 100}%` }} />
          </div>
        </div>

        {finished && (
          <p role="status" className="flex items-center gap-3 rounded-lg bg-success-light px-5 py-3 text-base font-semibold text-success">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
            Toutes les annonces ont été faites. Bravo&nbsp;!
          </p>
        )}

        <CeremonyStepCard step={step} />

        <div className="flex items-center justify-between gap-4">
          <Button size="lg" icon={ArrowLeft} disabled={progress.current === 0} onClick={() => onStep('previous')}>
            Précédent
          </Button>
          <span className="text-sm text-ink-muted">Clavier&nbsp;: ← → ou espace</span>
          <Button variant="primary" size="lg" iconAfter={isLast ? undefined : ArrowRight} disabled={finished} onClick={() => onStep('next')}>
            {isLast ? 'Terminer' : 'Suivant'}
          </Button>
        </div>
      </div>

      <aside className="flex max-h-[calc(100vh-12rem)] flex-col gap-3 overflow-y-auto rounded-xl bg-surface-raised p-3 shadow-card">
        <span className="px-3 pt-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Déroulé</span>
        <CeremonyStepList steps={steps} progress={progress} onSelect={onGoTo} />
      </aside>
    </div>
  );
}

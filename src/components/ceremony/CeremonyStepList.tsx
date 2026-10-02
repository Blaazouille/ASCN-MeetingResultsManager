/**
 * Responsabilité : liste latérale des annonces du déroulé (faite cochée, sautée signalée, courante en évidence, clic pour y aller).
 * Appelé par : CeremonyRun.tsx.
 * Suppression casserait : la vue d'ensemble de la progression pendant la cérémonie.
 */
import { Check } from 'lucide-react';
import type { CeremonyStep } from '@/lib/ceremony-script';
import { isStepDone, isStepSkipped, type CeremonyProgress } from '@/lib/ceremony-navigation';
import { stepContext, stepHeading } from '@/lib/ceremony-labels';
import { cn } from '@/lib/utils';

export interface CeremonyStepListProps {
  steps: CeremonyStep[];
  progress: CeremonyProgress;
  onSelect: (index: number) => void;
}

export function CeremonyStepList({ steps, progress, onSelect }: CeremonyStepListProps): JSX.Element {
  return (
    <ol aria-label="Toutes les annonces" className="flex flex-col gap-1">
      {steps.map((step, index) => {
        const current = index === progress.current;
        const done = isStepDone(progress, index);
        const skipped = isStepSkipped(progress, index);
        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => onSelect(index)}
              aria-current={current ? 'step' : undefined}
              className={cn(
                'flex min-h-11 w-full items-center gap-3 rounded-sm px-3 py-2 text-left transition-colors',
                current ? 'bg-marine text-on-marine' : 'text-ink hover:bg-surface-sunken'
              )}
            >
              <span
                className={cn(
                  'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] text-xs font-bold tabular-nums',
                  done ? 'border-transparent bg-success-bright text-marine' : current ? 'border-on-marine-muted' : 'border-line-strong text-ink-muted'
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-label="faite" /> : index + 1}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[15px] font-semibold">{stepHeading(step)}</span>
                <span className={cn('truncate text-[13px]', current ? 'text-on-marine-muted' : 'text-ink-muted')}>
                  {stepContext(step)}
                </span>
                {skipped && <span className="text-[13px] font-semibold text-corail-strong">Non annoncée</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Responsabilité : préparation de la cérémonie (catégories, blocs, places annoncées par équipes, points à vérifier, aperçu).
 * Appelé par : CeremonyPage.tsx.
 * Suppression casserait : la phase « avant la cérémonie » de l'écran Cérémonie.
 */
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { CeremonyBlock, CeremonyStep } from '@/lib/ceremony-script';
import type { PlannedBlock } from '@/lib/ceremony-plan';
import type { CeremonyWarning } from '@/lib/ceremony-warnings';
import { stepContext, stepCountLabel, stepHeading, warningLabel } from '@/lib/ceremony-labels';
import { Segmented } from '@/components/ui/Segmented';
import { CeremonyBlockList } from './CeremonyBlockList';
import { CeremonyCategoryPicker } from './CeremonyCategoryPicker';

/** Team places offered: the podium by default, more for meetings that reward further down. */
const TEAM_PLACE_OPTIONS = [3, 5, 10].map((value) => ({ value, label: String(value) }));

export interface CeremonyPreparationProps {
  availableCategories: string[];
  categories: string[];
  onToggleCategory: (category: string) => void;
  plan: PlannedBlock[];
  onToggleBlock: (block: CeremonyBlock) => void;
  onMoveBlock: (index: number, delta: -1 | 1) => void;
  teamPlaces: number;
  onTeamPlacesChange: (places: number) => void;
  preview: CeremonyStep[];
  warnings: CeremonyWarning[];
}

const CARD = 'flex flex-col gap-4 rounded-xl bg-surface-raised p-6 shadow-card';
const CARD_TITLE = 'font-display text-[28px] font-bold leading-tight text-marine';

export function CeremonyPreparation({
  plan,
  onToggleBlock,
  onMoveBlock,
  teamPlaces,
  onTeamPlacesChange,
  preview,
  warnings,
  availableCategories,
  categories,
  onToggleCategory,
}: CeremonyPreparationProps): JSX.Element {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-6">
      <div className="flex flex-col gap-6">
        <section className={CARD}>
          <h2 className={CARD_TITLE}>Catégories annoncées</h2>
          <p className="text-[15px] text-ink-muted">
            Les prix rigolos, les prix individuels et les équipes ne sont annoncés que pour les catégories cochées.
          </p>
          <CeremonyCategoryPicker available={availableCategories} selected={categories} onToggle={onToggleCategory} />
        </section>

        <section className={CARD}>
          <h2 className={CARD_TITLE}>Ordre des annonces</h2>
          <p className="text-[15px] text-ink-muted">
            Décochez ce qui n&apos;est pas annoncé. Dans chaque bloc, les places sont annoncées à rebours, la 1re en dernier.
          </p>
          <CeremonyBlockList plan={plan} onToggle={onToggleBlock} onMove={onMoveBlock} />
          <Segmented label="Places annoncées par équipes" options={TEAM_PLACE_OPTIONS} value={teamPlaces} onChange={onTeamPlacesChange} />
        </section>

        <section className={CARD} aria-label="À vérifier avant de commencer">
          <h2 className={CARD_TITLE}>À vérifier avant de commencer</h2>
          {warnings.length === 0 ? (
            <p className="flex items-center gap-3 text-base font-semibold text-success">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
              Rien à signaler.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {warnings.map((warning) => (
                <li
                  key={warningLabel(warning)}
                  className="flex items-start gap-3 rounded-md border border-corail-line bg-corail-wash px-4 py-3 text-[15px] font-semibold text-corail-strong"
                >
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                  {warningLabel(warning)}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className={CARD} aria-label="Aperçu du déroulé">
        <h2 className={CARD_TITLE}>Aperçu · {stepCountLabel(preview.length)}</h2>
        {preview.length === 0 ? (
          <p className="text-[15px] text-ink-muted">Rien à annoncer pour l&apos;instant. Vérifiez qu&apos;au moins un bloc est coché.</p>
        ) : (
          <ol className="flex flex-col divide-y divide-line">
            {preview.map((step, index) => (
              <li key={step.id} className="flex items-baseline gap-3 py-2">
                <span className="w-7 shrink-0 text-right text-sm font-semibold tabular-nums text-ink-muted">{index + 1}.</span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[15px] font-semibold text-ink">
                    {stepHeading(step)} · {step.winners.map((winner) => winner.name).join(' / ')}
                  </span>
                  <span className="text-[13px] text-ink-muted">{stepContext(step)}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

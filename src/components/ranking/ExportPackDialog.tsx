/**
 * Responsabilité : boîte « Exporter le meeting » ouverte par « Tout exporter » — choix des catégories mises dans le pack (Mixte seul par défaut).
 * Appelé par : RankingPage.tsx.
 * Suppression casserait : « Tout exporter » ne pourrait plus démarrer (le choix des catégories précède le choix du dossier).
 */
import { useRef, useState } from 'react';
import { FolderDown } from 'lucide-react';
import { defaultPickedCategories, isMissingPickedCategory, togglePickedCategory } from '@/lib/category-picking';
import { useModalKeyboard } from '@/hooks/use-modal-keyboard';
import { Button } from '@/components/ui/Button';
import { CategoryCheckboxes } from '@/components/ui/CategoryCheckboxes';

const NO_CATEGORY_HINT_ID = 'export-pack-no-category-hint';

export interface ExportPackDialogProps {
  /** Active categories of the meeting, in display order. */
  available: string[];
  /** Top N shown on the ranking screen: the team files use it too. */
  topN: number;
  onConfirm: (chosen: string[]) => void;
  onCancel: () => void;
}

export function ExportPackDialog({ available, topN, onConfirm, onCancel }: ExportPackDialogProps): JSX.Element {
  // Same default and same rules as the Cérémonie (issue #77): only Mixte is
  // rewarded at the Meeting de la Mer, every category when there is no Mixte.
  // Not remembered: each opening starts from this default again.
  const [selected, setSelected] = useState<string[]>(() => defaultPickedCategories(available));
  const dialogRef = useRef<HTMLDivElement>(null);
  // Escape cancels; closing hands focus back to « Tout exporter », like DeleteMeetingDialog.
  useModalKeyboard(dialogRef, onCancel, true);

  const isMissing = isMissingPickedCategory(available, selected);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-pack-title"
        aria-describedby="export-pack-text"
        className="flex w-full max-w-lg flex-col gap-5 rounded-xl bg-surface-raised p-6 shadow-raised"
      >
        <div className="flex flex-col gap-1.5">
          <h2 id="export-pack-title" className="font-display text-2xl font-bold text-ink">
            Exporter le meeting
          </h2>
          <p id="export-pack-text" className="text-[15px] text-ink-soft">
            Pour chaque catégorie cochée&nbsp;: classements par équipes et individuel (PDF et Excel), palmarès (PDF).
            Équipes&nbsp;: les {topN} meilleurs nageurs par club, comme à l&apos;écran.
          </p>
        </div>

        <CategoryCheckboxes
          available={available}
          selected={selected}
          isMissing={isMissing}
          onToggle={(category) => setSelected((current) => togglePickedCategory(current, category))}
          legend="Catégories exportées"
          missingHint="Cochez au moins une catégorie pour exporter."
          missingHintId={NO_CATEGORY_HINT_ID}
        />

        <div className="flex flex-wrap justify-end gap-3">
          <Button onClick={onCancel}>Annuler</Button>
          <Button
            variant="primary"
            icon={FolderDown}
            autoFocus
            disabled={isMissing}
            aria-describedby={isMissing ? NO_CATEGORY_HINT_ID : undefined}
            onClick={() => onConfirm(selected)}
          >
            Choisir le dossier et exporter
          </Button>
        </div>
      </div>
    </div>
  );
}

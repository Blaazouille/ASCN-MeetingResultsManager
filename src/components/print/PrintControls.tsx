// src/components/print/PrintControls.tsx
import { Download, Printer } from 'lucide-react';
import { CategoryTabs } from '@/components/ranking/CategoryTabs';

export interface PrintControlsProps {
  categories: string[];
  category: string;
  onCategoryChange: (category: string) => void;
  onPrint: () => void;
  onDownloadPdf: () => void;
  isExporting: boolean;
}

/** Category selector plus the "Imprimer" / "Télécharger PDF" actions for the print screen. */
export function PrintControls({
  categories,
  category,
  onCategoryChange,
  onPrint,
  onDownloadPdf,
  isExporting,
}: PrintControlsProps): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4">
      <CategoryTabs categories={categories} active={category} onChange={onCategoryChange} />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrint}
          className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors duration-150 hover:bg-neutral-100"
        >
          <Printer className="h-4 w-4" aria-hidden />
          Imprimer
        </button>
        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={isExporting}
          className="flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-neutral-0 transition-colors duration-150 hover:bg-accent-700 disabled:opacity-60"
        >
          <Download className="h-4 w-4" aria-hidden />
          {isExporting ? 'Génération…' : 'Télécharger PDF'}
        </button>
      </div>
    </div>
  );
}

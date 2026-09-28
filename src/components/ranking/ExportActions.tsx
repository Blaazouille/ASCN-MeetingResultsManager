/**
 * Responsabilité : paire de boutons d'export Excel (secondaire) / PDF (principal) d'un écran de classement.
 * Appelé par : RankingPage.tsx, IndividualPage.tsx.
 * Suppression casserait : le déclenchement des exports Excel et PDF depuis ces écrans.
 */
import { Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ExportActionsProps {
  disabled: boolean;
  onExcel: () => void;
  onPdf: () => void;
}

export function ExportActions({ disabled, onExcel, onPdf }: ExportActionsProps): JSX.Element {
  return (
    <>
      <Button icon={FileSpreadsheet} disabled={disabled} onClick={onExcel}>
        Excel
      </Button>
      {/* PDF is the primary action: it is what gets printed and posted by the pool. */}
      <Button variant="primary" icon={Download} disabled={disabled} onClick={onPdf}>
        Exporter en PDF
      </Button>
    </>
  );
}

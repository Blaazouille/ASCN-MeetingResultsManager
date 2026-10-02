/**
 * Responsabilité : mention discrète quand l'import précédent n'a pas pu être relu (flèches de mouvement masquées).
 * Appelé par : RankingPage.tsx, IndividualPage.tsx.
 * Suppression casserait : l'absence de flèches après une erreur passerait pour « aucun changement de rang ».
 */

export interface ComparisonUnavailableNoteProps {
  show: boolean;
}

export function ComparisonUnavailableNote({ show }: ComparisonUnavailableNoteProps): JSX.Element | null {
  if (!show) return null;
  // Muted, not an error colour: the ranking itself is correct, only the extra arrows are missing.
  return (
    <p role="status" className="text-sm text-ink-muted">
      Comparaison avec l'import précédent indisponible : les flèches de mouvement ne sont pas affichées.
    </p>
  );
}

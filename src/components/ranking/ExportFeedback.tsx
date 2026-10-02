/**
 * Responsabilité : ligne de retour sous les filtres après un export (erreur ou confirmation discrète).
 * Appelé par : RankingPage.tsx, IndividualPage.tsx.
 * Suppression casserait : le bénévole ne saurait plus si son export a réussi ou pourquoi il a échoué.
 */

export interface ExportFeedbackProps {
  error: string | null;
  notice: string | null;
}

export function ExportFeedback({ error, notice }: ExportFeedbackProps): JSX.Element | null {
  if (error) {
    return (
      <p role="alert" className="text-sm text-error">
        {error}
      </p>
    );
  }
  if (notice) {
    // role="status" lets screen readers announce the success without stealing focus.
    return (
      <p role="status" className="text-sm text-success">
        {notice}
      </p>
    );
  }
  return null;
}

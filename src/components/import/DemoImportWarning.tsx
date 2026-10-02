/**
 * Responsabilité : avertissement de l'écran Import quand le meeting ouvert est le meeting d'entraînement.
 * Appelé par : ImportPage.tsx.
 * Suppression casserait : le garde-fou contre un vrai fichier importé dans l'exemple le jour J (résultats ni officiels ni sauvegardés).
 */
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

// Shown above the drop zone, before any file is chosen: the risk is importing
// the real meeting's file here, where it would never be backed up.
export function DemoImportWarning(): JSX.Element {
  return (
    <p
      role="note"
      className="flex items-start gap-3 rounded-lg border-2 border-dashed border-warning bg-warning-light px-5 py-4 text-base font-semibold text-warning"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <span>
        Vous êtes dans le meeting d'entraînement&nbsp;: ces résultats ne sont ni officiels ni sauvegardés. Pour le
        vrai meeting, ouvrez-le depuis{' '}
        <Link to="/" className="underline underline-offset-4">
          l'Accueil
        </Link>
        .
      </span>
    </p>
  );
}

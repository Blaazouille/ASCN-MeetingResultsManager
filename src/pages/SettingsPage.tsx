/**
 * Responsabilité : écran de paramètres (config meeting et règles de calcul, à venir).
 * Appelé par : App.tsx (route "parametres").
 * Suppression casserait : l'écran de paramètres.
 */
export default function SettingsPage(): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-24 text-center">
      <h1 className="text-xl font-semibold text-primary-800">Paramètres</h1>
      <p className="text-neutral-600">La configuration du meeting et des règles de calcul arrivera en Phase 5.</p>
    </div>
  );
}

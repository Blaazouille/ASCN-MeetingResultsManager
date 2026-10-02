/**
 * Responsabilité : étiquette « Notre club » accolée à AS Cherbourg Natation dans les classements.
 * Appelé par : TeamRankingTable.tsx, IndividualRankingTable.tsx, CeremonyStepCard.tsx.
 * Suppression casserait : le repérage de notre club autrement que par la couleur.
 */
export function ClubTag(): JSX.Element {
  return (
    <span className="whitespace-nowrap rounded-full bg-corail-soft px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.04em] text-corail-strong">
      Notre club
    </span>
  );
}

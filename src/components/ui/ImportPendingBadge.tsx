/**
 * Responsabilité : pastille « À importer » d'un meeting dont aucun résultat n'est encore importé.
 * Appelé par : SidebarMeetingCard.tsx, MeetingCard.tsx, ResumeMeetingCard.tsx.
 * Suppression casserait : le repère visuel des meetings vides sur l'accueil et la barre latérale.
 */
export function ImportPendingBadge(): JSX.Element {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-surface-sunken px-2.5 py-[3px] text-[13px] font-semibold leading-[18px] text-ink-soft">
      À importer
    </span>
  );
}

/**
 * Responsabilité : pastille « Exemple » du meeting d'entraînement.
 * Appelé par : MeetingCard.tsx, ResumeMeetingCard.tsx, SidebarMeetingCard.tsx.
 * Suppression casserait : le repère qui empêche de confondre le meeting d'entraînement avec un vrai.
 */
// Warning tones rather than corail: corail already means "Notre club" on every screen.
export function DemoBadge(): JSX.Element {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-warning-light px-2.5 py-[3px] text-[13px] font-bold uppercase leading-[18px] tracking-[0.04em] text-warning">
      Exemple
    </span>
  );
}

/**
 * Responsabilité : bandeau d'en-tête affichant le meeting actif.
 * Appelé par : AppShell.tsx.
 * Suppression casserait : l'affichage de l'en-tête.
 */
import type { Meeting } from '@/lib/db';

export interface HeaderProps {
  currentMeeting: Meeting | null;
}

export function Header({ currentMeeting }: HeaderProps): JSX.Element {
  return (
    <header className="sticky top-0 z-10 flex h-14 flex-shrink-0 items-center border-b border-neutral-200 bg-neutral-0 px-6">
      {currentMeeting && (
        <>
          <p className="text-sm font-semibold text-neutral-900">{currentMeeting.name}</p>
          <span
            className={`ml-4 rounded-sm px-2 py-0.5 text-xs font-medium ${
              currentMeeting.status === 'final'
                ? 'bg-success-light text-success'
                : 'bg-warning-light text-warning'
            }`}
          >
            {currentMeeting.status === 'final' ? 'Définitif' : 'Provisoire'}
          </span>
        </>
      )}
    </header>
  );
}

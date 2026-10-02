/**
 * Responsabilité : donne à tout composant le nom de « Notre club » configuré dans Paramètres, et le met à jour partout quand il change.
 * Appelé par : Sidebar.tsx, TeamRankingTable.tsx, IndividualRankingTable.tsx, CeremonyStepCard.tsx, OurClubSection.tsx, SettingsPage.tsx, ImportPage.tsx et les hooks d'export.
 * Suppression casserait : la mise en avant du club choisi (tableaux, exports, cérémonie, barre latérale).
 */
import { useSyncExternalStore } from 'react';
import { DEFAULT_OUR_CLUB } from '@/lib/our-club';

// One module-level value shared by every screen, rather than a prop passed
// down from AppShell or a React context: the sidebar, three tables, the
// ceremony and three export hooks all read it, and a change saved in
// Paramètres must show everywhere at once. useSyncExternalStore is React's
// own tool for a store that lives outside components.
let ourClub = DEFAULT_OUR_CLUB;
let loadStarted = false;
const listeners = new Set<() => void>();

function publish(value: string): void {
  ourClub = value;
  listeners.forEach((listener) => listener());
}

/**
 * Reads the stored value from the database, e.g. after a backup restore
 * replaced it. Never rejects: on failure the club shown so far stays, which
 * beats breaking the screen that asked (a restore that did succeed, say).
 */
export async function reloadOurClub(): Promise<void> {
  try {
    publish(await window.electronAPI.getOurClub());
  } catch (error) {
    console.error('Our club setting unreadable, previous value kept:', error);
  }
}

/** Saves a new club and shows it on every screen. Rejects if the database refuses it. */
export async function saveOurClub(club: string): Promise<void> {
  publish(await window.electronAPI.setOurClub(club));
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Loaded once, by the first screen that needs it. Until then the default
  // shows, which is also the stored value on every install that never changed it.
  if (!loadStarted) {
    loadStarted = true;
    void reloadOurClub();
  }
  return () => listeners.delete(listener);
}

/** The configured « Notre club » name, as stored (compare clubs with isOurClub, never with ===). */
export function useOurClub(): string {
  return useSyncExternalStore(subscribe, () => ourClub);
}

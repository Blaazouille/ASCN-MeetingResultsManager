/**
 * Responsabilité : layout applicatif (sidebar) et contexte partagé (meeting, import, catégorie sélectionnée) via Outlet.
 * Appelé par : App.tsx (route racine).
 * Suppression casserait : la navigation et le partage d'état entre toutes les pages.
 */
import { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { UpdateToast } from './UpdateToast';
import { useImport, type UseImportResult } from '@/hooks/use-import';
import { useMeeting, type UseMeetingResult } from '@/hooks/use-meeting';
import { useSelectedCategory, type UseSelectedCategoryResult } from '@/hooks/use-selected-category';

export interface AppOutletContext {
  importState: UseImportResult;
  meetingState: UseMeetingResult;
  /** Category shared by Classement, Individuels and Palmarès (not the Cérémonie, which keeps its own). */
  categorySelection: UseSelectedCategoryResult;
}

export function AppShell(): JSX.Element {
  const importState = useImport();
  const meetingState = useMeeting();
  const categorySelection = useSelectedCategory();

  // Import state is global (a sibling hook to useMeeting), so it never resets
  // on its own when the selected meeting changes. Without this, an import
  // done for meeting A stays visible/exported under meeting B once the user
  // opens it. Reset it here — the one place both hooks are visible together —
  // whenever the current meeting id changes, including to/from "none".
  // The shared category resets with it: a new meeting opens on the default (Mixte).
  const currentMeetingId = meetingState.currentMeeting?.id ?? null;
  const previousMeetingIdRef = useRef<number | null>(currentMeetingId);
  useEffect(() => {
    if (previousMeetingIdRef.current !== currentMeetingId) {
      previousMeetingIdRef.current = currentMeetingId;
      importState.reset();
      categorySelection.reset();
    }
  }, [currentMeetingId, importState.reset, categorySelection.reset]);

  const context: AppOutletContext = { importState, meetingState, categorySelection };

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar meeting={meetingState.currentMeeting} />
      <div className="ml-sidebar flex h-screen flex-1 flex-col">
        <main className="flex-1 overflow-y-auto px-10 py-8">
          <Outlet context={context} />
        </main>
      </div>
      <UpdateToast />
    </div>
  );
}

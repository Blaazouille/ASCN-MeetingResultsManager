import { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useImport, type UseImportResult } from '@/hooks/use-import';
import { useMeeting, type UseMeetingResult } from '@/hooks/use-meeting';

export interface AppOutletContext {
  importState: UseImportResult;
  meetingState: UseMeetingResult;
}

export function AppShell(): JSX.Element {
  const importState = useImport();
  const meetingState = useMeeting();

  // Import state is global (a sibling hook to useMeeting), so it never resets
  // on its own when the selected meeting changes. Without this, an import
  // done for meeting A stays visible/exported under meeting B once the user
  // opens it. Reset it here — the one place both hooks are visible together —
  // whenever the current meeting id changes, including to/from "none".
  const currentMeetingId = meetingState.currentMeeting?.id ?? null;
  const previousMeetingIdRef = useRef<number | null>(currentMeetingId);
  useEffect(() => {
    if (previousMeetingIdRef.current !== currentMeetingId) {
      previousMeetingIdRef.current = currentMeetingId;
      importState.reset();
    }
  }, [currentMeetingId, importState.reset]);

  const context: AppOutletContext = { importState, meetingState };

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet context={context} />
        </main>
      </div>
    </div>
  );
}

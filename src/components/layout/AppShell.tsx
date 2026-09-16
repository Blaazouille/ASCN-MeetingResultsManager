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

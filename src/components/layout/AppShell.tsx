import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useImport, type UseImportResult } from '@/hooks/use-import';

export interface AppOutletContext {
  importState: UseImportResult;
}

export function AppShell(): JSX.Element {
  const importState = useImport();
  const context: AppOutletContext = { importState };

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

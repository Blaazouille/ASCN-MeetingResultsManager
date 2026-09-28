/**
 * Responsabilité : toast non bloquant proposant de redémarrer pour appliquer une mise à jour téléchargée.
 * Appelé par : AppShell.tsx.
 * Suppression casserait : l'utilisateur n'est plus jamais informé qu'une mise à jour est prête.
 */
import { RefreshCw } from 'lucide-react';
import { useAutoUpdate } from '@/hooks/use-auto-update';

export function UpdateToast(): JSX.Element | null {
  const { isUpdateReady, restartToUpdate, dismiss } = useAutoUpdate();

  if (!isUpdateReady) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 rounded-lg bg-primary-900 px-5 py-4 text-neutral-0 shadow-card">
      <RefreshCw className="h-5 w-5 shrink-0 text-secondary-400" aria-hidden />
      <p className="font-body text-sm font-medium">Une mise à jour est prête.</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={restartToUpdate}
          className="rounded-md bg-secondary-800 px-3 py-1.5 text-sm font-medium text-neutral-0 transition-colors duration-150 hover:bg-secondary-900"
        >
          Redémarrer maintenant
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-300 transition-colors duration-150 hover:text-neutral-0"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}

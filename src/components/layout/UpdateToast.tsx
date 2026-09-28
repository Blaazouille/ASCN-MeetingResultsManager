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
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 rounded-lg bg-marine-deep px-5 py-4 text-on-marine shadow-card">
      <RefreshCw className="h-5 w-5 shrink-0 text-on-marine-faint" aria-hidden />
      <p className="font-body text-sm font-medium">Une mise à jour est prête.</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={restartToUpdate}
          className="h-11 rounded-sm bg-surface-raised px-4 text-sm font-semibold text-marine hover:bg-marine-soft"
        >
          Redémarrer maintenant
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="h-11 rounded-sm px-4 text-sm font-semibold text-on-marine-subtle hover:text-on-marine"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}

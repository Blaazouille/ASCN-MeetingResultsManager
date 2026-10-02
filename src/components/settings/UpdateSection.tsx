/**
 * Responsabilité : section « Mises à jour » de Paramètres (version installée, dernière vérification, statut, bouton « Vérifier maintenant »).
 * Appelé par : SettingsPage.tsx.
 * Suppression casserait : le seul endroit où l'on voit si l'application se met bien à jour.
 */
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAppVersion } from '@/hooks/use-app-version';
import { useUpdateStatus } from '@/hooks/use-update-status';
import { formatLastCheck, isOfflineError, updateStatusLabel } from '@/lib/update-status';
import { cn } from '@/lib/utils';

export function UpdateSection(): JSX.Element {
  const version = useAppVersion();
  const { status, isChecking, checkNow } = useUpdateStatus();
  // Offline is the normal case at the pool: neutral color, and the technical
  // detail is only worth showing for a real failure (broken release, download).
  const isRealFailure = status?.outcome === 'failed' && !isOfflineError(status.message ?? '');

  return (
    <div className="space-y-4 rounded-lg bg-surface-raised p-6 shadow-card">
      <h2 className="font-display text-2xl font-bold text-marine">Mises à jour</h2>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-[15px]">
        <dt className="font-semibold text-ink">Version installée</dt>
        <dd className="text-ink tabular-nums">{version ?? '…'}</dd>
        {/* Before the first check, the status line alone says "Pas encore vérifié". */}
        {status !== null && (
          <>
            <dt className="font-semibold text-ink">Dernière vérification</dt>
            <dd className="text-ink">{formatLastCheck(status)}</dd>
          </>
        )}
        <dt className="font-semibold text-ink">Statut</dt>
        <dd
          role="status"
          className={cn(
            'font-semibold',
            status?.outcome === 'downloaded' ? 'text-success' : isRealFailure ? 'text-error' : 'text-ink'
          )}
        >
          {isChecking ? 'Vérification en cours…' : updateStatusLabel(status)}
        </dd>
      </dl>
      {isRealFailure && !isChecking && <p className="text-sm text-ink-muted">Détail : {status.message}</p>}
      <Button type="button" icon={RefreshCw} onClick={() => void checkNow()} disabled={isChecking}>
        Vérifier maintenant
      </Button>
    </div>
  );
}

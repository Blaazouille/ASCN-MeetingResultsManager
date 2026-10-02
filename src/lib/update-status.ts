/**
 * Responsabilité : état de la dernière vérification de mise à jour (type, lecture sûre du fichier, libellés en français).
 * Appelé par : electron/auto-updater.ts, electron/update-state.ts, use-update-status.ts, UpdateSection.tsx.
 * Suppression casserait : la mémorisation de la dernière vérification et la section « Mises à jour » de Paramètres.
 */
import { formatDateTimeFr } from './utils';

export type UpdateCheckOutcome = 'up-to-date' | 'downloaded' | 'failed';

export interface UpdateStatus {
  /** ISO 8601 instant of the end of the check. */
  checkedAt: string;
  outcome: UpdateCheckOutcome;
  /** Short technical reason, only for 'failed'. */
  message: string | null;
}

// Long enough for "net::ERR_INTERNET_DISCONNECTED" or an HTTP 404 line, short
// enough to fit in Paramètres: electron-updater errors can embed whole HTTP
// response headers, useless to a volunteer and already kept in the log file.
const MAX_MESSAGE_LENGTH = 160;

// Codes Chromium (net::ERR_*) and Node (ENOTFOUND…) raised when there is no
// network at all — the normal case at the pool, not a broken release.
const OFFLINE_PATTERN = /net::ERR_(INTERNET_DISCONNECTED|NAME_NOT_RESOLVED|NETWORK_CHANGED|CONNECTION_|TIMED_OUT|ADDRESS_UNREACHABLE|PROXY_)|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENETUNREACH/;

const OUTCOMES: readonly UpdateCheckOutcome[] = ['up-to-date', 'downloaded', 'failed'];

/** First line of the error, trimmed to a displayable length. */
export function summarizeUpdateError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const firstLine = raw.split(/\r?\n/).find((line) => line.trim() !== '')?.trim() ?? 'Erreur inconnue';
  return firstLine.length > MAX_MESSAGE_LENGTH ? `${firstLine.slice(0, MAX_MESSAGE_LENGTH - 1)}…` : firstLine;
}

/** True when the failure only means "no connection", as opposed to a broken release or download. */
export function isOfflineError(message: string): boolean {
  return OFFLINE_PATTERN.test(message);
}

/**
 * Validates the content of update-status.json. The file is hand-editable and
 * may be truncated by a crash mid-write, so anything unexpected reads as
 * "never checked" instead of throwing in the main process.
 */
export function parseUpdateStatus(raw: unknown): UpdateStatus | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { checkedAt, outcome, message } = raw as Record<string, unknown>;
  if (typeof checkedAt !== 'string' || Number.isNaN(Date.parse(checkedAt))) return null;
  if (!OUTCOMES.includes(outcome as UpdateCheckOutcome)) return null;
  return {
    checkedAt,
    outcome: outcome as UpdateCheckOutcome,
    message: typeof message === 'string' ? message : null,
  };
}

/** Plain-French status shown in Paramètres. */
export function updateStatusLabel(status: UpdateStatus | null): string {
  if (status === null) return 'Pas encore vérifié';
  switch (status.outcome) {
    case 'up-to-date':
      return 'À jour';
    case 'downloaded':
      return "Mise à jour prête — redémarrez l'application";
    case 'failed':
      return isOfflineError(status.message ?? '')
        ? 'Impossible de vérifier (pas de connexion ?)'
        : 'La mise à jour a échoué. Réessayez plus tard.';
  }
}

/** "2 oct. 2026 à 14 h 05", or "Jamais" before the first check. */
export function formatLastCheck(status: UpdateStatus | null): string {
  return status === null ? 'Jamais' : formatDateTimeFr(new Date(status.checkedAt));
}

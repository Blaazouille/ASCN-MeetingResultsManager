import { describe, expect, it } from 'vitest';
import {
  formatLastCheck,
  isOfflineError,
  parseUpdateStatus,
  summarizeUpdateError,
  updateStatusLabel,
  type UpdateStatus,
} from '../src/lib/update-status';

const at = '2026-10-02T10:30:00.000Z';

function status(outcome: UpdateStatus['outcome'], message: string | null = null): UpdateStatus {
  return { checkedAt: at, outcome, message };
}

describe('updateStatusLabel', () => {
  it('says "À jour" when no update was found', () => {
    expect(updateStatusLabel(status('up-to-date'))).toBe('À jour');
  });

  it('asks to restart when an update has been downloaded', () => {
    expect(updateStatusLabel(status('downloaded'))).toBe("Mise à jour prête — redémarrez l'application");
  });

  it('suggests a missing connection when the check failed offline', () => {
    expect(updateStatusLabel(status('failed', 'net::ERR_INTERNET_DISCONNECTED'))).toBe(
      'Impossible de vérifier (pas de connexion ?)'
    );
  });

  it('reports a real failure (broken release, bad download) differently from being offline', () => {
    const label = updateStatusLabel(status('failed', 'Cannot find latest.yml in the latest release artifacts (HttpError: 404)'));
    expect(label).not.toContain('connexion');
    expect(label).toContain('échoué');
  });

  it('says the check has never run yet when no status is recorded', () => {
    expect(updateStatusLabel(null)).toBe('Pas encore vérifié');
  });
});

describe('isOfflineError', () => {
  it.each(['net::ERR_INTERNET_DISCONNECTED', 'getaddrinfo ENOTFOUND github.com', 'connect ETIMEDOUT 140.82.121.4:443', 'net::ERR_NAME_NOT_RESOLVED'])(
    'treats "%s" as offline',
    (message) => {
      expect(isOfflineError(message)).toBe(true);
    }
  );

  it('does not treat an HTTP 404 from GitHub as offline', () => {
    expect(isOfflineError('HttpError: 404 Not Found')).toBe(false);
  });
});

describe('summarizeUpdateError', () => {
  it('keeps only the first non-empty line of the error message', () => {
    expect(summarizeUpdateError(new Error('\nHttpError: 404\nHeaders: {"server":"github"}'))).toBe('HttpError: 404');
  });

  it('cuts very long messages to a displayable length', () => {
    const summary = summarizeUpdateError(new Error('x'.repeat(1000)));
    expect(summary.length).toBeLessThanOrEqual(160);
    expect(summary.endsWith('…')).toBe(true);
  });

  it('accepts non-Error values', () => {
    expect(summarizeUpdateError('boom')).toBe('boom');
  });
});

describe('parseUpdateStatus', () => {
  it('reads back a valid stored status', () => {
    expect(parseUpdateStatus({ checkedAt: at, outcome: 'failed', message: 'x' })).toEqual(status('failed', 'x'));
  });

  it.each([null, 'text', {}, { checkedAt: 'pas une date', outcome: 'up-to-date' }, { checkedAt: at, outcome: 'inconnu' }])(
    'treats corrupted content %j as "never checked"',
    (raw) => {
      expect(parseUpdateStatus(raw)).toBeNull();
    }
  );

  it('ignores a non-string message instead of rejecting the whole status', () => {
    expect(parseUpdateStatus({ checkedAt: at, outcome: 'up-to-date', message: 42 })).toEqual(status('up-to-date'));
  });
});

describe('formatLastCheck', () => {
  it('formats the check instant as a French date and local time', () => {
    // 10:30 UTC stays on the 2nd for local timezones from UTC-10 to UTC+13.
    const local = new Date(at);
    const hh = String(local.getHours()).padStart(2, '0');
    const mm = String(local.getMinutes()).padStart(2, '0');
    expect(formatLastCheck(status('up-to-date'))).toMatch(new RegExp(`^2\\s+oct\\.?\\s+2026 à ${hh}\\u00a0h\\u00a0${mm}$`));
  });
});

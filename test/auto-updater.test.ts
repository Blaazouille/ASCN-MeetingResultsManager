import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// electron and electron-updater only exist inside a packaged Electron app:
// stub them so the check flow (status file + log) runs against a temp folder.
const userDataDir = path.join(os.tmpdir(), 'mdlm-update-test-' + Date.now());
const handlers = new Map<string, () => unknown>();
const checkForUpdates = vi.fn();

vi.mock('electron', () => ({
  app: { getPath: () => userDataDir },
  ipcMain: { handle: (channel: string, handler: () => unknown) => handlers.set(channel, handler) },
}));
vi.mock('electron-updater', () => ({
  autoUpdater: { on: vi.fn(), checkForUpdates, quitAndInstall: vi.fn() },
}));

const { initAutoUpdater } = await import('../electron/auto-updater');
const { loadUpdateStatus, recordUpdateCheck } = await import('../electron/update-state');
const { IpcChannels } = await import('../electron/ipc-channels');

initAutoUpdater(() => {});

function checkNow(): Promise<unknown> {
  return handlers.get(IpcChannels.checkForUpdatesNow)!() as Promise<unknown>;
}

function logLines(): string[] {
  return readFileSync(path.join(userDataDir, 'update-log.txt'), 'utf-8').trimEnd().split('\n');
}

beforeEach(() => {
  rmSync(userDataDir, { recursive: true, force: true });
  mkdirSync(userDataDir, { recursive: true });
  checkForUpdates.mockReset();
});

afterAll(() => {
  rmSync(userDataDir, { recursive: true, force: true });
});

describe('vérification des mises à jour', () => {
  it('records "up-to-date" when no newer version exists', async () => {
    checkForUpdates.mockResolvedValue({ isUpdateAvailable: false });
    await expect(checkNow()).resolves.toMatchObject({ outcome: 'up-to-date', message: null });
    expect(loadUpdateStatus()?.outcome).toBe('up-to-date');
  });

  it('records "downloaded" only once the download has finished', async () => {
    let finishDownload: () => void = () => {};
    const downloadPromise = new Promise<void>((resolve) => {
      finishDownload = resolve;
    });
    const checked = Promise.resolve({ isUpdateAvailable: true, downloadPromise });
    checkForUpdates.mockReturnValue(checked);
    const pending = checkNow();
    // runCheck awaited `checked` first, so once it has resolved here the check
    // is done and runCheck is blocked on the unfinished download.
    await checked;
    expect(loadUpdateStatus()).toBeNull();
    // Paramètres opened meanwhile gets the in-progress check, not the stale file.
    const shown = handlers.get(IpcChannels.getUpdateStatus)!() as Promise<unknown>;
    finishDownload();
    await expect(pending).resolves.toMatchObject({ outcome: 'downloaded' });
    await expect(shown).resolves.toMatchObject({ outcome: 'downloaded' });
  });

  it('records and logs an offline failure instead of swallowing it', async () => {
    checkForUpdates.mockRejectedValue(new Error('net::ERR_INTERNET_DISCONNECTED'));
    await expect(checkNow()).resolves.toMatchObject({ outcome: 'failed', message: 'net::ERR_INTERNET_DISCONNECTED' });
    expect(logLines()).toHaveLength(1);
    expect(logLines()[0]).toContain('failed Error: net::ERR_INTERNET_DISCONNECTED');
  });

  it('records a failed download (interrupted transfer) as a failure', async () => {
    checkForUpdates.mockResolvedValue({ isUpdateAvailable: true, downloadPromise: Promise.reject(new Error('ECONNRESET')) });
    await expect(checkNow()).resolves.toMatchObject({ outcome: 'failed', message: 'ECONNRESET' });
  });

  it('does not claim "up-to-date" when the updater is inactive (development build)', async () => {
    checkForUpdates.mockResolvedValue(null);
    await expect(checkNow()).resolves.toMatchObject({ outcome: 'failed' });
  });

  it('reuses the running check when "Vérifier maintenant" is clicked during the startup check', async () => {
    checkForUpdates.mockResolvedValue({ isUpdateAvailable: false });
    await Promise.all([checkNow(), checkNow()]);
    expect(checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it('exposes the last recorded status to the renderer', async () => {
    checkForUpdates.mockResolvedValue({ isUpdateAvailable: false });
    await checkNow();
    expect(handlers.get(IpcChannels.getUpdateStatus)!()).toMatchObject({ outcome: 'up-to-date' });
  });
});

describe('update-state', () => {
  it('reads "never checked" when the status file is corrupted', () => {
    writeFileSync(path.join(userDataDir, 'update-status.json'), '{ tronqué');
    expect(loadUpdateStatus()).toBeNull();
  });

  it('never throws when userData cannot be written', () => {
    rmSync(userDataDir, { recursive: true, force: true });
    // A file where the folder should be makes every write fail.
    writeFileSync(userDataDir, 'pas un dossier');
    try {
      expect(() => recordUpdateCheck({ checkedAt: new Date().toISOString(), outcome: 'up-to-date', message: null }, null)).not.toThrow();
    } finally {
      rmSync(userDataDir, { force: true });
    }
  });
});

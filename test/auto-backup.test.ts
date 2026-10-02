import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// loadBackupConfig/saveBackupConfig/performAutoBackup read app.getPath('userData'/'documents'),
// so `electron` needs a stub — none of this suite's electron/*.ts files are
// otherwise unit-tested against a real Electron process.
const userDataDir = path.join(os.tmpdir(), 'mdlm-userdata-test-' + Date.now());
vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => (name === 'userData' ? userDataDir : path.join(os.tmpdir(), 'mdlm-documents-test')),
  },
}));

const { rotateBackups, loadBackupConfig, saveBackupConfig, performAutoBackup } = await import('../electron/auto-backup');
const { createDatabase } = await import('../src/lib/db-schema');
const { createMeeting } = await import('../src/lib/db');

describe('rotateBackups', () => {
  const tmpDir = path.join(os.tmpdir(), 'mdlm-backup-test-' + Date.now());

  beforeEach(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('keeps only maxBackups most recent files, deleting the oldest', () => {
    for (let i = 0; i < 6; i++) {
      writeFileSync(path.join(tmpDir, `mdlm-auto-backup-2026-09-${String(10 + i).padStart(2, '0')}T12-00-00.json`), '{}');
    }

    rotateBackups(tmpDir, 5);

    const remaining = readdirSync(tmpDir).filter((f) => f.endsWith('.json')).sort();
    expect(remaining).toHaveLength(5);
    expect(remaining[0]).toBe('mdlm-auto-backup-2026-09-11T12-00-00.json');
    expect(existsSync(path.join(tmpDir, 'mdlm-auto-backup-2026-09-10T12-00-00.json'))).toBe(false);
  });

  it('does nothing when file count is at or below maxBackups', () => {
    writeFileSync(path.join(tmpDir, 'mdlm-auto-backup-2026-09-10T12-00-00.json'), '{}');
    rotateBackups(tmpDir, 5);
    expect(readdirSync(tmpDir)).toHaveLength(1);
  });

  it('ignores files that are not auto-backups', () => {
    writeFileSync(path.join(tmpDir, 'notes.txt'), 'hello');
    rotateBackups(tmpDir, 0);
    expect(readdirSync(tmpDir)).toEqual(['notes.txt']);
  });
});

describe('loadBackupConfig / saveBackupConfig', () => {
  beforeEach(() => {
    rmSync(userDataDir, { recursive: true, force: true });
    mkdirSync(userDataDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(userDataDir, { recursive: true, force: true });
  });

  it('returns a default config when no config file exists yet', () => {
    const config = loadBackupConfig();
    expect(config.maxBackups).toBe(5);
    expect(config.backupDir).toContain('MDLM Ranking');
  });

  it('round-trips a config saved with saveBackupConfig', () => {
    const dir = path.join(os.tmpdir(), 'mdlm-custom-backup-dir');
    saveBackupConfig({ backupDir: dir, maxBackups: 3 });
    expect(loadBackupConfig()).toEqual({ backupDir: dir, maxBackups: 3 });
  });

  it('self-heals a non-positive maxBackups from a hand-edited config file', () => {
    writeFileSync(path.join(userDataDir, 'backup-config.json'), JSON.stringify({ backupDir: '/tmp/x', maxBackups: -1 }));
    expect(loadBackupConfig().maxBackups).toBe(5);
  });

  it('rejects an empty backupDir instead of persisting it', () => {
    expect(() => saveBackupConfig({ backupDir: '', maxBackups: 5 })).toThrow('vide');
    expect(() => saveBackupConfig({ backupDir: '   ', maxBackups: 5 })).toThrow('vide');
  });
});

describe('performAutoBackup', () => {
  const backupDir = path.join(os.tmpdir(), 'mdlm-auto-backup-run-' + Date.now());

  beforeEach(() => {
    rmSync(userDataDir, { recursive: true, force: true });
    mkdirSync(userDataDir, { recursive: true });
    saveBackupConfig({ backupDir, maxBackups: 5 });
  });

  afterEach(() => {
    rmSync(userDataDir, { recursive: true, force: true });
    rmSync(backupDir, { recursive: true, force: true });
  });

  it('writes a backup file containing the current database contents', () => {
    const db = createDatabase(':memory:');
    createMeeting(db, { name: 'Meeting Auto-Backup', defaultTopN: 5, minSwimmers: 3, activeCategories: [] });

    expect(performAutoBackup(db)).toBeNull();

    const files = readdirSync(backupDir).filter((f) => f.startsWith('mdlm-auto-backup-'));
    expect(files).toHaveLength(1);
    const written = JSON.parse(readFileSync(path.join(backupDir, files[0]!), 'utf-8'));
    expect(written.meetings).toHaveLength(1);
    expect(written.meetings[0].name).toBe('Meeting Auto-Backup');
  });

  it('never throws, even if the configured backup directory cannot be created', () => {
    // A plain file sitting where the backup dir should be makes mkdirSync
    // fail reliably (ENOTDIR/EEXIST) on any platform, without depending on a
    // specific missing drive letter or permission setup.
    const blockedPath = path.join(os.tmpdir(), 'mdlm-blocked-backup-dir-' + Date.now());
    writeFileSync(blockedPath, 'not a directory');
    saveBackupConfig({ backupDir: blockedPath, maxBackups: 5 });
    const db = createDatabase(':memory:');
    try {
      expect(() => performAutoBackup(db)).not.toThrow();
      // The failure is reported, not swallowed: the import screen shows it.
      expect(performAutoBackup(db)).toEqual(expect.any(String));
    } finally {
      rmSync(blockedPath, { force: true });
    }
  });
});

describe('backup safety net', () => {
  it('rejects fewer than 3 backups so a wrong file cannot rotate every good one out', () => {
    expect(() => saveBackupConfig({ backupDir: '/tmp/x', maxBackups: 2 })).toThrow('au moins 3');
  });

  it('raises a stored value below 3 to 3', () => {
    mkdirSync(userDataDir, { recursive: true });
    writeFileSync(path.join(userDataDir, 'backup-config.json'), JSON.stringify({ backupDir: '/tmp/x', maxBackups: 1 }));
    expect(loadBackupConfig().maxBackups).toBe(3);
  });
});

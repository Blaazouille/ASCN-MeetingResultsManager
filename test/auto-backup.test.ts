import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { rotateBackups } from '../electron/auto-backup';

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

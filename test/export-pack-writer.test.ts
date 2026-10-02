/**
 * Responsabilité : tests de l'écriture du pack « Tout exporter » sur disque (electron/export-pack-writer.ts).
 * Appelé par : Vitest.
 * Suppression casserait : la couverture du « jamais d'écrasement » et de l'échec partiel (issue #24).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// defaultExportDir reads app.getPath('documents'): electron needs a stub outside a real Electron process.
const documentsDir = path.join(os.tmpdir(), 'mdlm-documents-pack-test');
vi.mock('electron', () => ({ app: { getPath: () => documentsDir } }));

const { defaultExportDir, writeExportPack } = await import('../electron/export-pack-writer');

const FOLDER = 'Meeting de la Mer 2026 – 2026-11-16';
const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);

let parentDir: string;

beforeEach(() => {
  parentDir = mkdtempSync(path.join(os.tmpdir(), 'mdlm-pack-test-'));
});

afterEach(() => {
  rmSync(parentDir, { recursive: true, force: true });
});

describe('defaultExportDir', () => {
  it('is Documents/MDLM Ranking/Exports', () => {
    expect(defaultExportDir()).toBe(path.join(documentsDir, 'MDLM Ranking', 'Exports'));
  });
});

describe('writeExportPack', () => {
  it('writes every file into a new folder named after the meeting', () => {
    const result = writeExportPack(parentDir, FOLDER, [
      { fileName: 'Palmarès.pdf', data: bytes('pdf') },
      { fileName: 'Classement équipes.xlsx', data: bytes('xlsx') },
    ]);

    expect(result.folderPath).toBe(path.join(parentDir, FOLDER));
    expect(result.failed).toEqual([]);
    expect(readdirSync(result.folderPath).sort()).toEqual(['Classement équipes.xlsx', 'Palmarès.pdf']);
    expect(readFileSync(path.join(result.folderPath, 'Palmarès.pdf'), 'utf-8')).toBe('pdf');
  });

  it('creates the parent folder when it does not exist yet', () => {
    const missingParent = path.join(parentDir, 'MDLM Ranking', 'Exports');
    const result = writeExportPack(missingParent, FOLDER, [{ fileName: 'Palmarès.pdf', data: bytes('pdf') }]);
    expect(existsSync(path.join(missingParent, FOLDER, 'Palmarès.pdf'))).toBe(true);
    expect(result.failed).toEqual([]);
  });

  it('never overwrites an earlier pack: a second export goes to "(2)", a third to "(3)"', () => {
    mkdirSync(path.join(parentDir, FOLDER));
    writeFileSync(path.join(parentDir, FOLDER, 'Palmarès.pdf'), 'premier export');

    const second = writeExportPack(parentDir, FOLDER, [{ fileName: 'Palmarès.pdf', data: bytes('deuxième') }]);
    const third = writeExportPack(parentDir, FOLDER, [{ fileName: 'Palmarès.pdf', data: bytes('troisième') }]);

    expect(second.folderPath).toBe(path.join(parentDir, `${FOLDER} (2)`));
    expect(third.folderPath).toBe(path.join(parentDir, `${FOLDER} (3)`));
    expect(readFileSync(path.join(parentDir, FOLDER, 'Palmarès.pdf'), 'utf-8')).toBe('premier export');
  });

  it('still writes the other files when one of them fails, and reports the failed one', () => {
    const result = writeExportPack(parentDir, FOLDER, [
      { fileName: 'Classement équipes.xlsx', data: bytes('xlsx') },
      { fileName: '../hors-du-dossier.pdf', data: bytes('pdf') },
      { fileName: 'Palmarès.pdf', data: bytes('pdf') },
    ]);

    expect(readdirSync(result.folderPath).sort()).toEqual(['Classement équipes.xlsx', 'Palmarès.pdf']);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.fileName).toBe('../hors-du-dossier.pdf');
    expect(result.failed[0]!.error).not.toBe('');
    expect(existsSync(path.join(parentDir, 'hors-du-dossier.pdf'))).toBe(false);
  });

  it('refuses a folder name that would land outside the chosen folder', () => {
    expect(() => writeExportPack(parentDir, '../ailleurs', [])).toThrow();
    expect(existsSync(path.join(parentDir, '..', 'ailleurs'))).toBe(false);
  });
});

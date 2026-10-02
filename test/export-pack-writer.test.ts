/**
 * Responsabilité : tests de l'écriture du pack « Tout exporter » par le main process (electron/export-pack-writer.ts).
 * Appelé par : Vitest.
 * Suppression casserait : la couverture du dossier imposé par le main, du « jamais d'écrasement » et de l'échec partiel (issue #24).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// defaultExportDir reads app.getPath('documents'): electron needs a stub outside a real Electron process.
const documentsDir = path.join(os.tmpdir(), 'mdlm-documents-pack-test');
vi.mock('electron', () => ({ app: { getPath: () => documentsDir } }));

const { createExportPackSession, defaultExportDir } = await import('../electron/export-pack-writer');

const FOLDER = 'Meeting de la Mer 2026 – 2026-11-16';
const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);

let parentDir: string;

/** A session where the volunteer already picked `dir` in the dialog. */
function sessionIn(dir: string): ReturnType<typeof createExportPackSession> {
  const session = createExportPackSession();
  session.chooseParentDir(dir);
  return session;
}

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

describe('export pack session — chosen folder', () => {
  it('refuses to write before the volunteer picked a folder in the dialog', () => {
    const session = createExportPackSession();
    expect(() => session.write(FOLDER, [{ fileName: 'Palmarès.pdf', data: bytes('pdf') }])).toThrow(/Choisissez/);
  });

  it('writes into the folder picked in the dialog, and nowhere else', () => {
    const result = sessionIn(parentDir).write(FOLDER, [{ fileName: 'Palmarès.pdf', data: bytes('pdf') }]);
    expect(result.folderPath).toBe(path.join(parentDir, FOLDER));
  });

  it('needs a new pick for each pack, so an old choice cannot be reused silently', () => {
    const session = sessionIn(parentDir);
    session.write(FOLDER, [{ fileName: 'Palmarès.pdf', data: bytes('pdf') }]);
    expect(() => session.write(FOLDER, [{ fileName: 'Palmarès.pdf', data: bytes('pdf') }])).toThrow(/Choisissez/);
  });

  it('only lets the renderer open a folder it wrote', () => {
    const session = sessionIn(parentDir);
    const { folderPath } = session.write(FOLDER, [{ fileName: 'Palmarès.pdf', data: bytes('pdf') }]);
    expect(session.wrote(folderPath)).toBe(true);
    expect(session.wrote(parentDir)).toBe(false);
    expect(session.wrote(path.join(folderPath, 'Palmarès.pdf'))).toBe(false);
  });
});

describe('export pack session — writing', () => {
  it('writes every file into a new folder named after the meeting', () => {
    const result = sessionIn(parentDir).write(FOLDER, [
      { fileName: 'Palmarès.pdf', data: bytes('pdf') },
      { fileName: 'Classement équipes.xlsx', data: bytes('xlsx') },
    ]);

    expect(result.failed).toEqual([]);
    expect(readdirSync(result.folderPath).sort()).toEqual(['Classement équipes.xlsx', 'Palmarès.pdf']);
    expect(readFileSync(path.join(result.folderPath, 'Palmarès.pdf'), 'utf-8')).toBe('pdf');
  });

  it('creates the chosen folder when it does not exist yet', () => {
    const missingParent = path.join(parentDir, 'MDLM Ranking', 'Exports');
    const result = sessionIn(missingParent).write(FOLDER, [{ fileName: 'Palmarès.pdf', data: bytes('pdf') }]);
    expect(existsSync(path.join(missingParent, FOLDER, 'Palmarès.pdf'))).toBe(true);
    expect(result.failed).toEqual([]);
  });

  it('never overwrites an earlier pack: a second export goes to "(2)", a third to "(3)"', () => {
    mkdirSync(path.join(parentDir, FOLDER));
    writeFileSync(path.join(parentDir, FOLDER, 'Palmarès.pdf'), 'premier export');

    const second = sessionIn(parentDir).write(FOLDER, [{ fileName: 'Palmarès.pdf', data: bytes('deuxième') }]);
    const third = sessionIn(parentDir).write(FOLDER, [{ fileName: 'Palmarès.pdf', data: bytes('troisième') }]);

    expect(second.folderPath).toBe(path.join(parentDir, `${FOLDER} (2)`));
    expect(third.folderPath).toBe(path.join(parentDir, `${FOLDER} (3)`));
    expect(readFileSync(path.join(parentDir, FOLDER, 'Palmarès.pdf'), 'utf-8')).toBe('premier export');
  });

  it('writes only the planned file names, still writing the others', () => {
    const result = sessionIn(parentDir).write(FOLDER, [
      { fileName: 'Classement équipes.xlsx', data: bytes('xlsx') },
      { fileName: '../hors-du-dossier.pdf', data: bytes('pdf') },
      { fileName: 'autre.exe', data: bytes('exe') },
      { fileName: 'Palmarès.pdf', data: bytes('pdf') },
    ]);

    expect(readdirSync(result.folderPath).sort()).toEqual(['Classement équipes.xlsx', 'Palmarès.pdf']);
    expect(result.failed.map((file) => file.fileName)).toEqual(['../hors-du-dossier.pdf', 'autre.exe']);
    expect(result.failed.every((file) => file.error !== '')).toBe(true);
    expect(existsSync(path.join(parentDir, 'hors-du-dossier.pdf'))).toBe(false);
  });

  it('never replaces a file already written in the same pack', () => {
    const result = sessionIn(parentDir).write(FOLDER, [
      { fileName: 'Palmarès.pdf', data: bytes('premier') },
      { fileName: 'Palmarès.pdf', data: bytes('second') },
    ]);
    expect(readFileSync(path.join(result.folderPath, 'Palmarès.pdf'), 'utf-8')).toBe('premier');
    expect(result.failed.map((file) => file.fileName)).toEqual(['Palmarès.pdf']);
  });

  it('cleans the folder name it receives, so it cannot point outside the chosen folder', () => {
    const result = sessionIn(parentDir).write('../ailleurs', [{ fileName: 'Palmarès.pdf', data: bytes('pdf') }]);
    expect(path.dirname(result.folderPath)).toBe(parentDir);
    expect(existsSync(path.join(parentDir, '..', 'ailleurs'))).toBe(false);
  });
});

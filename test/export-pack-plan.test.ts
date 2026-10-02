/**
 * Responsabilité : tests de la liste des fichiers et du nom de dossier du pack « Tout exporter » (export-pack-plan.ts).
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de export-pack-plan.ts (critère d'acceptation de l'issue #24).
 */
import { describe, expect, it } from 'vitest';
import { isPackFileName, packFolderCandidate, planExportPack, safeFolderName } from '../src/lib/export-pack-plan';

const CATEGORIES = ['Classement Dames', 'Classement Messieurs', 'Classement Mixte'];
// Local time, late evening: the folder must carry the meeting's day, not the UTC one.
const MEETING_DAY = new Date(2026, 10, 16, 23, 30);

describe('planExportPack', () => {
  it('names the folder "<meeting name> – <YYYY-MM-DD>"', () => {
    expect(planExportPack('Meeting de la Mer 2026', CATEGORIES, MEETING_DAY).folderName).toBe(
      'Meeting de la Mer 2026 – 2026-11-16'
    );
  });

  it('plans the five files of the pack, in a fixed order', () => {
    const { files } = planExportPack('Meeting de la Mer 2026', CATEGORIES, MEETING_DAY);
    expect(files).toEqual([
      { kind: 'team-pdf', fileName: 'Classement équipes – Complet.pdf' },
      { kind: 'team-excel', fileName: 'Classement équipes.xlsx' },
      { kind: 'individual-pdf', fileName: 'Classement individuel – Complet.pdf' },
      { kind: 'individual-excel', fileName: 'Classement individuel.xlsx' },
      { kind: 'palmares-pdf', fileName: 'Palmarès.pdf' },
    ]);
  });

  it('plans the same files whatever the number of active categories (each file holds them all)', () => {
    const single = planExportPack('Meeting', ['Classement Mixte'], MEETING_DAY);
    const all = planExportPack('Meeting', CATEGORIES, MEETING_DAY);
    expect(single.files).toEqual(all.files);
  });

  it('plans no file when the meeting has no active category', () => {
    expect(planExportPack('Meeting', [], MEETING_DAY).files).toEqual([]);
  });

  it('never lets the meeting name escape the export folder', () => {
    const { folderName } = planExportPack('Meeting 2026/11 : finale', CATEGORIES, MEETING_DAY);
    expect(folderName).not.toMatch(/[\\/:*?"<>|]/);
    expect(folderName).toBe('Meeting 2026 11 finale – 2026-11-16');
  });
});

describe('safeFolderName', () => {
  it('replaces characters Windows forbids in folder names', () => {
    expect(safeFolderName('A<B>C"D|E?F*G\\H')).toBe('A B C D E F G H');
  });

  it('drops trailing dots and spaces, which Windows silently removes', () => {
    expect(safeFolderName('Meeting...  ')).toBe('Meeting');
  });

  it('falls back to "Meeting" when nothing usable is left', () => {
    expect(safeFolderName(' / ')).toBe('Meeting');
  });

  it('cuts a very long name so the path stays under the Windows limit', () => {
    expect(Array.from(safeFolderName('A'.repeat(500))).length).toBeLessThanOrEqual(120);
    expect(safeFolderName('A'.repeat(500), 10)).toBe('AAAAAAAAAA');
  });

  it('does not end on a dot or space after the cut', () => {
    expect(safeFolderName('Meeting . suite', 9)).toBe('Meeting');
  });
});

describe('planExportPack — long meeting names', () => {
  it('keeps at most 100 characters of the meeting name and always keeps the date', () => {
    const { folderName } = planExportPack('M'.repeat(300), CATEGORIES, MEETING_DAY);
    expect(folderName).toBe(`${'M'.repeat(100)} – 2026-11-16`);
  });

  it('gives a name that the main process leaves unchanged when it cleans it again', () => {
    const { folderName } = planExportPack('M'.repeat(300), CATEGORIES, MEETING_DAY);
    expect(safeFolderName(folderName)).toBe(folderName);
  });
});

describe('isPackFileName', () => {
  it('accepts exactly the five planned file names', () => {
    for (const file of planExportPack('Meeting', CATEGORIES, MEETING_DAY).files) {
      expect(isPackFileName(file.fileName)).toBe(true);
    }
    expect(isPackFileName('../Palmarès.pdf')).toBe(false);
    expect(isPackFileName('palmarès.pdf')).toBe(false);
    expect(isPackFileName('autre.pdf')).toBe(false);
  });
});

describe('packFolderCandidate', () => {
  it('uses the plain name first, then "(2)", "(3)"… so an existing folder is never reused', () => {
    expect(packFolderCandidate('Meeting – 2026-11-16', 1)).toBe('Meeting – 2026-11-16');
    expect(packFolderCandidate('Meeting – 2026-11-16', 2)).toBe('Meeting – 2026-11-16 (2)');
    expect(packFolderCandidate('Meeting – 2026-11-16', 3)).toBe('Meeting – 2026-11-16 (3)');
  });
});

/**
 * Responsabilité : tests de la fiche de proclamation PDF.
 * Appelé par : Vitest.
 * Suppression casserait : la couverture de ceremony-pdf-export.tsx.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCsv } from '../src/lib/csv-parser';
import { buildCeremonyScript } from '../src/lib/ceremony-script';
import { buildCeremonyPdfBlob } from '../src/lib/ceremony-pdf-export';
import { DEFAULT_OUR_CLUB } from '../src/lib/our-club';
import { pdfText } from './pdf-text';

const META = { meetingName: 'Meeting de la Mer 2026', computedAt: '16/11/2026 14:32', notice: null, ourClub: DEFAULT_OUR_CLUB };

describe('buildCeremonyPdfBlob', () => {
  it('produces a PDF for the full default script of the reference meeting', async () => {
    const rows = parseCsv(new Uint8Array(readFileSync(path.join(__dirname, 'fixtures', 'sample.csv')))).rows;
    const steps = buildCeremonyScript({ activeCategories: null, defaultTopN: 5, minSwimmers: 0 }, rows, {
      blocks: ['fun-awards', 'individual-prizes', 'team-ranking'],
      teamPlaces: 3,
    });

    const blob = await buildCeremonyPdfBlob(META, steps);

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('still produces a PDF for an empty script', async () => {
    const blob = await buildCeremonyPdfBlob(META, []);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('marks only the configured club « (Notre club) », whatever the case it was typed in', async () => {
    const rows = parseCsv(new Uint8Array(readFileSync(path.join(__dirname, 'fixtures', 'sample.csv')))).rows;
    const steps = buildCeremonyScript({ activeCategories: ['Classement Mixte'], defaultTopN: 5, minSwimmers: 0 }, rows, {
      blocks: ['team-ranking'],
      teamPlaces: 5,
    });

    const byDefault = await pdfText(await buildCeremonyPdfBlob(META, steps));
    const configured = await pdfText(await buildCeremonyPdfBlob({ ...META, ourClub: 'en caen' }, steps));

    // AS Cherbourg Natation is not in the Mixte top 5; EN CAEN is 5th.
    expect(byDefault).not.toContain('(Notre club)');
    expect(configured).toMatch(/EN CAEN\s*\(Notre club\)/);
    expect(configured.match(/\(Notre club\)/g)).toHaveLength(1);
  });
});

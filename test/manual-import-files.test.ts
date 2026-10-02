import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseCsv } from '../src/lib/csv-parser';
import { checkImportAgainstExisting } from '../src/lib/import-check';

// Keeps test/manual-import/PLAN.md honest: each file must trigger what the plan says it does.
const load = (name: string) => parseCsv(readFileSync(`test/manual-import/${name}`));
const baseline = load('01-baseline.csv').rows;
const kinds = (name: string): string[] => checkImportAgainstExisting(baseline, load(name).rows).map((w) => w.kind);

describe('manual import files', () => {
  it.each([
    ['02-identical.csv', ['identical']],
    ['03-corrected.csv', []],
    ['04-partial-mixte-only.csv', ['missing-category', 'missing-category']],
    ['05-incomplete-export.csv', ['shrunk']],
    ['06-other-meeting.csv', ['different']],
    ['07-wrong-file-small.csv', ['missing-category', 'missing-category', 'shrunk', 'different']],
    ['10-ignored-and-duplicates.csv', []],
  ])('%s gives the warnings listed in the plan', (name, expected) => {
    expect(kinds(name)).toEqual(expected);
  });

  it.each(['08-header-only.csv', '09-no-points-column.csv'])('%s is rejected as having no usable row', (name) => {
    expect(() => load(name)).toThrow('Aucune ligne exploitable');
  });

  it('10-ignored-and-duplicates.csv reports 3 ignored and 2 duplicate rows', () => {
    const result = load('10-ignored-and-duplicates.csv');
    expect([result.ignoredRowCount, result.duplicateRowCount]).toEqual([3, 2]);
  });
});

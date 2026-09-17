# Phase 3 — Export PDF / Excel + Aperçu impression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PDF export, Excel export, and an in-app A4 print preview for the team ranking, usable from both the Classement screen and a dedicated Impression screen — entirely in the renderer (no Electron IPC yet).

**Architecture:** A shared data layer (`print-data.ts`) produces meeting metadata consumed by two independent renderers of the same `TeamResult[]`: an HTML component (`A4Page`) for on-screen preview and native browser printing, and a `@react-pdf/renderer` document for the downloadable PDF. Excel export is a separate ExcelJS workbook builder. Every export/print builder function that produces a Blob/Buffer is pure and unit-tested in Node; the thin wrapper that triggers a browser download (`downloadBlob`, using `document`/`URL.createObjectURL`) is exercised manually in the browser, not in the Vitest `node` environment.

**Tech Stack:** React 18 + TypeScript (strict), `@react-pdf/renderer` 3.4.0, ExcelJS, Tailwind CSS, Vitest (`node` environment, see `vitest.config.ts`).

## Global Constraints

- TypeScript `strict: true`, no `any` (except the pre-existing documented TanStack Table pattern in `TeamRankingTable.tsx` — do not introduce new ones).
- Component props typed as `{ComponentName}Props`; components are function components returning `JSX.Element`.
- File naming: components `PascalCase.tsx` under `src/components/`, hooks `use-kebab-case.ts`, lib/utils `kebab-case.ts`.
- All UI text in French, French punctuation (non-breaking space before `:`, `;`, `!`, `?`).
- Points formatting: always via `formatPoints()` from `src/lib/utils.ts` (non-breaking space thousands separator), `font-variant-numeric: tabular-nums` on numeric columns (already global via `[data-numeric]` in `globals.css`).
- Use `cn()` from `src/lib/utils.ts` for conditional Tailwind classes; no inline `style` except genuinely dynamic values.
- `@react-pdf/renderer` has no local font files available in this repo (only Google Fonts `<link>` for the web UI, per `index.html`) — the PDF document uses `@react-pdf/renderer`'s default PDF-safe fonts (Helvetica family), not Montserrat/Inter/JetBrains Mono. The on-screen `A4Page` (and therefore `window.print()`) does use the real web fonts already loaded globally.
- Test files: `.test.ts` under `test/`, following the existing style in `test/ranking-engine.test.ts` (`describe`/`it` from `vitest`, fixtures loaded from `test/fixtures/`).
- Path alias `@/*` → `src/*` (see `tsconfig.json` / `vite.config.ts`).

---

### Task 1: Print data utilities (`print-data.ts`)

**Files:**
- Create: `src/lib/print-data.ts`
- Test: `test/print-data.test.ts`

**Interfaces:**
- Consumes: nothing beyond built-ins.
- Produces:
  - `export interface PrintMeta { meetingName: string; date: string; status: 'Provisoire' | 'Définitif'; computedAt: string }`
  - `export function buildPrintMeta(): PrintMeta`
  - `export function slugifyCategory(category: string): string`

These are used by Tasks 2–7.

- [ ] **Step 1: Write the failing tests**

```typescript
// test/print-data.test.ts
import { describe, expect, it } from 'vitest';
import { buildPrintMeta, slugifyCategory } from '../src/lib/print-data';

describe('slugifyCategory', () => {
  it('slugifies "Classement Mixte" to "classement-mixte"', () => {
    expect(slugifyCategory('Classement Mixte')).toBe('classement-mixte');
  });

  it('slugifies "Classement Dames" to "classement-dames"', () => {
    expect(slugifyCategory('Classement Dames')).toBe('classement-dames');
  });

  it('strips accents and non-alphanumeric characters', () => {
    expect(slugifyCategory('Été — Nage libre !')).toBe('ete-nage-libre');
  });

  it('collapses repeated separators and trims leading/trailing dashes', () => {
    expect(slugifyCategory('  Classement   Messieurs  ')).toBe('classement-messieurs');
  });
});

describe('buildPrintMeta', () => {
  it('returns a meeting name, a non-empty date, and a Provisoire status', () => {
    const meta = buildPrintMeta();
    expect(meta.meetingName).toBe('Meeting de la Mer 2026');
    expect(meta.status).toBe('Provisoire');
    expect(meta.date.length).toBeGreaterThan(0);
    expect(meta.computedAt.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- test/print-data.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/print-data'`

- [ ] **Step 3: Implement `print-data.ts`**

```typescript
// src/lib/print-data.ts

export interface PrintMeta {
  meetingName: string;
  /** Meeting date, formatted fr-FR (e.g. "16 nov. 2026"). */
  date: string;
  status: 'Provisoire' | 'Définitif';
  /** Timestamp of computation, formatted fr-FR date + time. */
  computedAt: string;
}

const MEETING_NAME = 'Meeting de la Mer 2026';

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });
const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Placeholder meeting metadata until Phase 5 (Paramètres) makes the meeting
 * name, date, and status configurable and Phase 4 (SQLite) persists them.
 */
export function buildPrintMeta(): PrintMeta {
  const now = new Date();
  return {
    meetingName: MEETING_NAME,
    date: DATE_FORMATTER.format(now),
    status: 'Provisoire',
    computedAt: TIMESTAMP_FORMATTER.format(now),
  };
}

/**
 * Derives a filename-safe slug from a category name, e.g.
 * "Classement Mixte" -> "classement-mixte". Strips accents so exported
 * filenames stay portable across filesystems.
 */
export function slugifyCategory(category: string): string {
  return category
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- test/print-data.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/print-data.ts test/print-data.test.ts
git commit -m "feat: add print meta and category slug utilities"
```

---

### Task 2: Download helper + PDF export

**Files:**
- Create: `src/lib/download.ts`
- Create: `src/lib/pdf-export.tsx`
- Test: `test/pdf-export.test.ts`

**Interfaces:**
- Consumes: `PrintMeta` from `src/lib/print-data.ts` (Task 1), `TeamResult` from `src/lib/ranking-engine.ts`, `ASCN_CLUB_NAME`/`formatPoints` from `src/lib/utils.ts`.
- Produces:
  - `export function downloadBlob(blob: Blob, filename: string): void`
  - `export function RankingPdfDocument(props: { meta: PrintMeta; category: string; results: TeamResult[] }): JSX.Element`
  - `export function buildRankingPdfBlob(meta: PrintMeta, category: string, results: TeamResult[]): Promise<Blob>`
  - `export async function exportRankingToPdf(meta: PrintMeta, category: string, results: TeamResult[]): Promise<void>`

`buildRankingPdfBlob` and `exportRankingToPdf` are used by Task 6 (PrintControls) and Task 7 (RankingToolbar).

- [ ] **Step 1: Write the failing test**

```typescript
// test/pdf-export.test.ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCsv } from '../src/lib/csv-parser';
import { computeTeamRanking } from '../src/lib/ranking-engine';
import { buildPrintMeta } from '../src/lib/print-data';
import { buildRankingPdfBlob } from '../src/lib/pdf-export';

const FIXTURE_DIR = path.join(__dirname, 'fixtures');

function loadRows() {
  const buffer = readFileSync(path.join(FIXTURE_DIR, 'sample.csv'));
  return parseCsv(new Uint8Array(buffer)).rows;
}

describe('buildRankingPdfBlob', () => {
  it('produces a non-empty application/pdf blob for the reference ranking', async () => {
    const rows = loadRows();
    const results = computeTeamRanking(rows, { category: 'Classement Mixte', topN: 5 });
    const meta = buildPrintMeta();

    const blob = await buildRankingPdfBlob(meta, 'Classement Mixte', results);

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('resolves without throwing when there are no results', async () => {
    const meta = buildPrintMeta();
    const blob = await buildRankingPdfBlob(meta, 'Classement Mixte', []);
    expect(blob.size).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- test/pdf-export.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/pdf-export'`

- [ ] **Step 3: Implement `download.ts`**

```typescript
// src/lib/download.ts

/**
 * Triggers a browser download of the given blob via a transient object URL.
 * Relies on `document`/`URL.createObjectURL`, so this only runs in a real
 * browser (or Electron renderer) — not exercised by the Node test suite.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Implement `pdf-export.tsx`**

```tsx
// src/lib/pdf-export.tsx
import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import type { TeamResult } from './ranking-engine';
import type { PrintMeta } from './print-data';
import { slugifyCategory } from './print-data';
import { downloadBlob } from './download';
import { ASCN_CLUB_NAME, formatPoints } from './utils';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11 },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 12, marginBottom: 2, color: '#5B6B7D' },
  date: { fontSize: 10, marginBottom: 16, color: '#5B6B7D' },
  headerRow: { flexDirection: 'row', borderBottom: '1px solid #1A2332', paddingBottom: 4, marginBottom: 4 },
  row: { flexDirection: 'row', borderBottom: '1px solid #D1D7DE', paddingVertical: 6 },
  rowAscn: { backgroundColor: '#F0FAFF' },
  rank: { width: 30, fontWeight: 700 },
  club: { flex: 1, fontWeight: 600 },
  points: { width: 70, textAlign: 'right', fontWeight: 500 },
  headerCell: { fontSize: 9, textTransform: 'uppercase', color: '#5B6B7D' },
  swimmers: { fontSize: 9, color: '#5B6B7D', marginTop: 2 },
  empty: { fontSize: 11, color: '#5B6B7D', marginTop: 16 },
  footer: { marginTop: 24, fontSize: 9, color: '#5B6B7D', flexDirection: 'row', justifyContent: 'space-between' },
});

export interface RankingPdfDocumentProps {
  meta: PrintMeta;
  category: string;
  results: TeamResult[];
}

/** The PDF document tree for one category's team ranking. */
export function RankingPdfDocument({ meta, category, results }: RankingPdfDocumentProps): JSX.Element {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{meta.meetingName}</Text>
        <Text style={styles.subtitle}>Classement par équipes — {category.replace(/^Classement\s+/i, '')}</Text>
        <Text style={styles.date}>{meta.date}</Text>

        {results.length === 0 ? (
          <Text style={styles.empty}>Aucun club classé pour cette catégorie.</Text>
        ) : (
          <View>
            <View style={styles.headerRow}>
              <Text style={[styles.headerCell, styles.rank]}>Rang</Text>
              <Text style={[styles.headerCell, styles.club]}>Club</Text>
              <Text style={[styles.headerCell, styles.points]}>Points</Text>
            </View>
            {results.map((team) => (
              <View key={team.club} style={[styles.row, team.club === ASCN_CLUB_NAME && styles.rowAscn]}>
                <Text style={styles.rank}>{team.rank}</Text>
                <View style={styles.club}>
                  <Text>{team.club}</Text>
                  <Text style={styles.swimmers}>
                    {team.swimmers.map((swimmer) => `${swimmer.lastname} ${swimmer.firstname}`).join(', ')}
                  </Text>
                </View>
                <Text style={styles.points}>{formatPoints(team.totalPoints)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text>Calculé le {meta.computedAt}</Text>
          <Text>{meta.status.toUpperCase()}</Text>
        </View>
      </Page>
    </Document>
  );
}

/** Renders the ranking PDF to an in-memory Blob, without triggering a download. */
export async function buildRankingPdfBlob(
  meta: PrintMeta,
  category: string,
  results: TeamResult[]
): Promise<Blob> {
  return pdf(<RankingPdfDocument meta={meta} category={category} results={results} />).toBlob();
}

/** Builds the ranking PDF and triggers a browser download. */
export async function exportRankingToPdf(
  meta: PrintMeta,
  category: string,
  results: TeamResult[]
): Promise<void> {
  const blob = await buildRankingPdfBlob(meta, category, results);
  const today = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `classement-${slugifyCategory(category)}-${today}.pdf`);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- test/pdf-export.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/download.ts src/lib/pdf-export.tsx test/pdf-export.test.ts
git commit -m "feat: add PDF export for team ranking"
```

---

### Task 3: Excel export

**Files:**
- Create: `src/lib/excel-export.ts`
- Test: `test/excel-export.test.ts`

**Interfaces:**
- Consumes: `PrintMeta` (Task 1), `TeamResult` (existing), `downloadBlob` (Task 2), `slugifyCategory` (Task 1).
- Produces:
  - `export async function buildRankingWorkbookBuffer(meta: PrintMeta, category: string, results: TeamResult[]): Promise<ArrayBuffer>`
  - `export async function exportRankingToExcel(meta: PrintMeta, category: string, results: TeamResult[]): Promise<void>`

Used by Task 7 (RankingToolbar).

- [ ] **Step 1: Write the failing test**

```typescript
// test/excel-export.test.ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { parseCsv } from '../src/lib/csv-parser';
import { computeTeamRanking } from '../src/lib/ranking-engine';
import { buildPrintMeta } from '../src/lib/print-data';
import { buildRankingWorkbookBuffer } from '../src/lib/excel-export';

const FIXTURE_DIR = path.join(__dirname, 'fixtures');

function loadRows() {
  const buffer = readFileSync(path.join(FIXTURE_DIR, 'sample.csv'));
  return parseCsv(new Uint8Array(buffer)).rows;
}

describe('buildRankingWorkbookBuffer', () => {
  it('produces a workbook with a sheet listing all 38 clubs, including ASCN', async () => {
    const rows = loadRows();
    const results = computeTeamRanking(rows, { category: 'Classement Mixte', topN: 5 });
    const meta = buildPrintMeta();

    const buffer = await buildRankingWorkbookBuffer(meta, 'Classement Mixte', results);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0]!;

    // Header row + 38 club rows.
    expect(sheet.rowCount).toBe(39);

    const clubNames = sheet.getColumn(2).values.slice(2) as string[];
    expect(clubNames).toContain('AS CHERBOURG NATATION');
    expect(clubNames).toHaveLength(38);
  });

  it('records the podium points at the right rows', async () => {
    const rows = loadRows();
    const results = computeTeamRanking(rows, { category: 'Classement Mixte', topN: 5 });
    const meta = buildPrintMeta();

    const buffer = await buildRankingWorkbookBuffer(meta, 'Classement Mixte', results);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0]!;

    expect(sheet.getRow(2).getCell(2).value).toBe('CN VIRY-CHÂTILLON');
    expect(sheet.getRow(2).getCell(3).value).toBe(5841);
    expect(sheet.getRow(39).getCell(2).value).toBe('CN BERGERAC');
    expect(sheet.getRow(39).getCell(3).value).toBe(561);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- test/excel-export.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/excel-export'`

- [ ] **Step 3: Implement `excel-export.ts`**

```typescript
// src/lib/excel-export.ts
import ExcelJS from 'exceljs';
import type { TeamResult } from './ranking-engine';
import type { PrintMeta } from './print-data';
import { slugifyCategory } from './print-data';
import { downloadBlob } from './download';

const COLUMN_HEADERS = ['Rang', 'Club', 'Points', 'Nageurs retenus'];

function formatSwimmerList(team: TeamResult): string {
  return team.swimmers.map((swimmer) => `${swimmer.lastname} ${swimmer.firstname}`).join(', ');
}

/** Builds the ranking workbook and returns its raw bytes, without triggering a download. */
export async function buildRankingWorkbookBuffer(
  meta: PrintMeta,
  category: string,
  results: TeamResult[]
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = meta.meetingName;
  workbook.created = new Date();

  const sheetName = category.replace(/^Classement\s+/i, '').slice(0, 31) || 'Classement';
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = [
    { header: COLUMN_HEADERS[0], key: 'rank', width: 8 },
    { header: COLUMN_HEADERS[1], key: 'club', width: 36 },
    { header: COLUMN_HEADERS[2], key: 'points', width: 12 },
    { header: COLUMN_HEADERS[3], key: 'swimmers', width: 60 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const team of results) {
    sheet.addRow({
      rank: team.rank,
      club: team.club,
      points: team.totalPoints,
      swimmers: formatSwimmerList(team),
    });
  }

  return workbook.xlsx.writeBuffer();
}

/** Builds the ranking workbook and triggers a browser download. */
export async function exportRankingToExcel(
  meta: PrintMeta,
  category: string,
  results: TeamResult[]
): Promise<void> {
  const buffer = await buildRankingWorkbookBuffer(meta, category, results);
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const today = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `classement-${slugifyCategory(category)}-${today}.xlsx`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- test/excel-export.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/excel-export.ts test/excel-export.test.ts
git commit -m "feat: add Excel export for team ranking"
```

---

### Task 4: A4Page component + print CSS

**Files:**
- Create: `src/components/print/A4Page.tsx`
- Modify: `src/styles/globals.css`

**Interfaces:**
- Consumes: `TeamResult` (existing), `PrintMeta` (Task 1), `ASCN_CLUB_NAME`/`formatPoints`/`cn` (existing `utils.ts`).
- Produces: `export interface A4PageProps { meta: PrintMeta; category: string; results: TeamResult[] }` and `export function A4Page(props: A4PageProps): JSX.Element`, with root element carrying the `print-area` class.

Used by Task 5 (`PrintPreview`) and Task 7 (off-screen print target on `RankingPage`).

No automated test for this task — it's a presentational component, verified visually in Task 6's manual browser check (consistent with other UI components in this codebase, e.g. `TeamRankingTable`, which also have no dedicated test file).

- [ ] **Step 1: Add the print isolation rule to `globals.css`**

Add at the end of `src/styles/globals.css` (after the existing `@layer base` block):

```css
@media print {
  body * {
    visibility: hidden;
  }
  .print-area,
  .print-area * {
    visibility: visible;
  }
  .print-area {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
  }
}
```

- [ ] **Step 2: Implement `A4Page.tsx`**

```tsx
// src/components/print/A4Page.tsx
import { ASCN_CLUB_NAME, cn, formatPoints } from '@/lib/utils';
import type { TeamResult } from '@/lib/ranking-engine';
import type { PrintMeta } from '@/lib/print-data';

export interface A4PageProps {
  meta: PrintMeta;
  category: string;
  results: TeamResult[];
}

/** Strips the "Classement " prefix, e.g. "Classement Mixte" -> "Mixte". */
function categoryLabel(category: string): string {
  return category.replace(/^Classement\s+/i, '');
}

/**
 * A4-formatted team ranking page, used both for the in-app print preview
 * and as the target of `window.print()`. Marked `print-area` so the global
 * print stylesheet isolates it from the rest of the app when printing.
 */
export function A4Page({ meta, category, results }: A4PageProps): JSX.Element {
  return (
    <div className="print-area mx-auto w-[210mm] bg-neutral-0 p-12 text-neutral-900">
      <header className="mb-6 border-b border-neutral-900 pb-4">
        <h1 className="font-display text-2xl font-bold">{meta.meetingName}</h1>
        <p className="font-body text-sm font-medium text-neutral-700">
          Classement par équipes — {categoryLabel(category)}
        </p>
        <p className="font-body text-sm text-neutral-600">{meta.date}</p>
      </header>

      {results.length === 0 ? (
        <p className="text-base text-neutral-600">Aucun club classé pour cette catégorie.</p>
      ) : (
        <table className="w-full border-collapse text-base">
          <thead>
            <tr className="border-b-2 border-neutral-900 text-left text-xs uppercase tracking-wide text-neutral-600">
              <th className="w-16 py-2 font-display">Rang</th>
              <th className="py-2 font-display">Club</th>
              <th className="w-28 py-2 text-right font-display">Points</th>
            </tr>
          </thead>
          <tbody>
            {results.map((team, index) => (
              <tr
                key={team.club}
                className={cn(
                  'border-b border-neutral-200',
                  index % 2 === 1 && 'bg-neutral-50',
                  team.club === ASCN_CLUB_NAME && 'bg-secondary-50'
                )}
              >
                <td className="py-2 align-top font-display text-lg font-bold">{team.rank}</td>
                <td className="py-2 align-top">
                  <p className="font-body text-base font-semibold">{team.club}</p>
                  <p className="font-body text-xs text-neutral-600">
                    {team.swimmers.map((swimmer) => `${swimmer.lastname} ${swimmer.firstname}`).join(', ')}
                  </p>
                </td>
                <td className="py-2 text-right align-top font-mono text-base tabular-nums" data-numeric>
                  {formatPoints(team.totalPoints)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <footer className="mt-8 flex items-center justify-between border-t border-neutral-200 pt-3 text-xs text-neutral-600">
        <span>Calculé le {meta.computedAt}</span>
        <span
          className={cn(
            'rounded-sm px-2 py-0.5 font-medium uppercase tracking-wide',
            meta.status === 'Provisoire' ? 'bg-warning-light text-warning' : 'bg-success-light text-success'
          )}
        >
          {meta.status}
        </span>
      </footer>
    </div>
  );
}
```

- [ ] **Step 3: Verify the app still builds**

Run: `npm run lint`
Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/print/A4Page.tsx src/styles/globals.css
git commit -m "feat: add A4Page print layout with print isolation CSS"
```

---

### Task 5: PrintPreview + PrintControls components

**Files:**
- Create: `src/components/print/PrintPreview.tsx`
- Create: `src/components/print/PrintControls.tsx`

**Interfaces:**
- Consumes: `A4Page`/`A4PageProps` (Task 4), `PrintMeta` (Task 1), `TeamResult` (existing), `CategoryTabs` (existing, `src/components/ranking/CategoryTabs.tsx`), `exportRankingToPdf` (Task 2).
- Produces:
  - `export interface PrintPreviewProps { meta: PrintMeta; category: string; results: TeamResult[] }` / `export function PrintPreview(props: PrintPreviewProps): JSX.Element`
  - `export interface PrintControlsProps { categories: string[]; category: string; onCategoryChange: (category: string) => void; onPrint: () => void; onDownloadPdf: () => void; isExporting: boolean }` / `export function PrintControls(props: PrintControlsProps): JSX.Element`

Used by Task 6 (`PrintPage`).

No automated test — presentational, wired and manually verified in Task 6.

- [ ] **Step 1: Implement `PrintPreview.tsx`**

```tsx
// src/components/print/PrintPreview.tsx
import { A4Page } from './A4Page';
import type { PrintMeta } from '@/lib/print-data';
import type { TeamResult } from '@/lib/ranking-engine';

export interface PrintPreviewProps {
  meta: PrintMeta;
  category: string;
  results: TeamResult[];
}

/** Centers the A4 page with a "paper" shadow; the page itself is what actually prints. */
export function PrintPreview({ meta, category, results }: PrintPreviewProps): JSX.Element {
  return (
    <div className="flex justify-center overflow-x-auto bg-neutral-100 p-8">
      <div className="shadow-card-hover">
        <A4Page meta={meta} category={category} results={results} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `PrintControls.tsx`**

```tsx
// src/components/print/PrintControls.tsx
import { Download, Printer } from 'lucide-react';
import { CategoryTabs } from '@/components/ranking/CategoryTabs';

export interface PrintControlsProps {
  categories: string[];
  category: string;
  onCategoryChange: (category: string) => void;
  onPrint: () => void;
  onDownloadPdf: () => void;
  isExporting: boolean;
}

/** Category selector plus the "Imprimer" / "Télécharger PDF" actions for the print screen. */
export function PrintControls({
  categories,
  category,
  onCategoryChange,
  onPrint,
  onDownloadPdf,
  isExporting,
}: PrintControlsProps): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4">
      <CategoryTabs categories={categories} active={category} onChange={onCategoryChange} />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrint}
          className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors duration-150 hover:bg-neutral-100"
        >
          <Printer className="h-4 w-4" aria-hidden />
          Imprimer
        </button>
        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={isExporting}
          className="flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-neutral-0 transition-colors duration-150 hover:bg-accent-700 disabled:opacity-60"
        >
          <Download className="h-4 w-4" aria-hidden />
          {isExporting ? 'Génération…' : 'Télécharger PDF'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify the app still builds**

Run: `npm run lint`
Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/print/PrintPreview.tsx src/components/print/PrintControls.tsx
git commit -m "feat: add PrintPreview and PrintControls components"
```

---

### Task 6: Wire the Impression screen (`PrintPage.tsx`)

**Files:**
- Modify: `src/pages/PrintPage.tsx`

**Interfaces:**
- Consumes: `AppOutletContext` (`src/components/layout/AppShell.tsx`), `useRanking` (`src/hooks/use-ranking.ts`), `buildPrintMeta` (Task 1), `exportRankingToPdf` (Task 2), `PrintControls`/`PrintPreview` (Task 5).
- Produces: the rendered `/print` route — no new exports consumed by later tasks.

- [ ] **Step 1: Replace the `PrintPage.tsx` placeholder**

```tsx
// src/pages/PrintPage.tsx
import { useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { useRanking } from '@/hooks/use-ranking';
import { buildPrintMeta } from '@/lib/print-data';
import { exportRankingToPdf } from '@/lib/pdf-export';
import { PrintControls } from '@/components/print/PrintControls';
import { PrintPreview } from '@/components/print/PrintPreview';

export default function PrintPage(): JSX.Element {
  const { importState } = useOutletContext<AppOutletContext>();
  const [isExporting, setIsExporting] = useState(false);

  const rows = importState.result?.rows ?? [];
  const categories = importState.result?.categories ?? [];
  const ranking = useRanking(rows, categories);
  const meta = useMemo(() => buildPrintMeta(), []);

  if (!importState.result) {
    return <Navigate to="/import" replace />;
  }

  async function handleDownloadPdf(): Promise<void> {
    setIsExporting(true);
    try {
      await exportRankingToPdf(meta, ranking.category, ranking.teamResults);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary-800">Impression</h1>
        <p className="text-neutral-600">{importState.fileName}</p>
      </header>

      <PrintControls
        categories={categories}
        category={ranking.category}
        onCategoryChange={ranking.setCategory}
        onPrint={() => window.print()}
        onDownloadPdf={handleDownloadPdf}
        isExporting={isExporting}
      />

      <PrintPreview meta={meta} category={ranking.category} results={ranking.teamResults} />
    </div>
  );
}
```

- [ ] **Step 2: Verify the app still builds**

Run: `npm run lint`
Expected: no TypeScript errors.

- [ ] **Step 3: Manual browser check**

Run: `npm run dev`, then in the app: import `test/fixtures/sample.csv`, go to Classement to confirm data loaded, then navigate to `/print`.
Expected:
- The A4 preview renders with the meeting title, category subtitle, ranking table (rank/club/points/swimmer names), and footer with timestamp + "Provisoire" badge.
- Switching category tabs updates the preview.
- "Télécharger PDF" downloads a `classement-*.pdf` file that opens and shows the same data.
- "Imprimer" opens the browser print dialog with only the A4 page visible in the print preview (no sidebar/header/controls).

- [ ] **Step 4: Commit**

```bash
git add src/pages/PrintPage.tsx
git commit -m "feat: wire Impression screen with print preview and PDF export"
```

---

### Task 7: Ranking screen toolbar actions (Imprimer / Export PDF / Export Excel)

**Files:**
- Modify: `src/components/ranking/RankingToolbar.tsx`
- Modify: `src/pages/RankingPage.tsx`

**Interfaces:**
- Consumes: `exportRankingToPdf` (Task 2), `exportRankingToExcel` (Task 3), `buildPrintMeta` (Task 1), `A4Page` (Task 4), `TeamResult` (existing).
- Produces: no new exports consumed elsewhere — this is the final integration task for Phase 3.

- [ ] **Step 1: Extend `RankingToolbar.tsx` with the three action buttons**

```tsx
// src/components/ranking/RankingToolbar.tsx
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { TOP_N_OPTIONS, type TopN } from '@/hooks/use-ranking';

export interface RankingToolbarProps {
  topN: TopN;
  onTopNChange: (topN: TopN) => void;
  onPrint: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  isExporting: boolean;
}

/** Top N selector, meeting status badge, and print/export actions. */
export function RankingToolbar({
  topN,
  onTopNChange,
  onPrint,
  onExportPdf,
  onExportExcel,
  isExporting,
}: RankingToolbarProps): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          Top N nageurs
          <select
            value={topN}
            onChange={(event) => onTopNChange(Number(event.target.value) as TopN)}
            className="rounded-md border border-neutral-200 px-2 py-1 font-mono text-sm outline-none focus:border-secondary-400 focus:ring-1 focus:ring-secondary-400"
          >
            {TOP_N_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <span className="rounded-sm bg-warning-light px-2 py-1 text-xs font-medium uppercase tracking-wide text-warning">
          Provisoire
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrint}
          className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors duration-150 hover:bg-neutral-100"
        >
          <Printer className="h-4 w-4" aria-hidden />
          Imprimer
        </button>
        <button
          type="button"
          onClick={onExportPdf}
          disabled={isExporting}
          className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors duration-150 hover:bg-neutral-100 disabled:opacity-60"
        >
          <Download className="h-4 w-4" aria-hidden />
          Export PDF
        </button>
        <button
          type="button"
          onClick={onExportExcel}
          disabled={isExporting}
          className="flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-neutral-0 transition-colors duration-150 hover:bg-accent-700 disabled:opacity-60"
        >
          <FileSpreadsheet className="h-4 w-4" aria-hidden />
          Export Excel
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire `RankingPage.tsx`: pass the new handlers and mount an off-screen `A4Page` as the print target**

```tsx
// src/pages/RankingPage.tsx
import { useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { useRanking } from '@/hooks/use-ranking';
import { buildPrintMeta } from '@/lib/print-data';
import { exportRankingToPdf } from '@/lib/pdf-export';
import { exportRankingToExcel } from '@/lib/excel-export';
import { CategoryTabs } from '@/components/ranking/CategoryTabs';
import { RankingToolbar } from '@/components/ranking/RankingToolbar';
import { TeamRankingTable } from '@/components/ranking/TeamRankingTable';
import { A4Page } from '@/components/print/A4Page';

export default function RankingPage(): JSX.Element {
  const { importState } = useOutletContext<AppOutletContext>();
  const [search, setSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const rows = importState.result?.rows ?? [];
  const categories = importState.result?.categories ?? [];
  const ranking = useRanking(rows, categories);
  const meta = useMemo(() => buildPrintMeta(), []);

  if (!importState.result) {
    return <Navigate to="/import" replace />;
  }

  async function handleExportPdf(): Promise<void> {
    setIsExporting(true);
    try {
      await exportRankingToPdf(meta, ranking.category, ranking.teamResults);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportExcel(): Promise<void> {
    setIsExporting(true);
    try {
      await exportRankingToExcel(meta, ranking.category, ranking.teamResults);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary-800">Classement par équipes</h1>
        <p className="text-neutral-600">{importState.fileName}</p>
      </header>

      <CategoryTabs categories={categories} active={ranking.category} onChange={ranking.setCategory} />
      <RankingToolbar
        topN={ranking.topN}
        onTopNChange={ranking.setTopN}
        onPrint={() => window.print()}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        isExporting={isExporting}
      />
      <TeamRankingTable
        results={ranking.teamResults}
        topN={ranking.topN}
        search={search}
        onSearchChange={setSearch}
      />

      {/*
        Off-screen (never display:none, so the print stylesheet's
        visibility toggle still works) A4 layout: this is what
        window.print() actually shows, so "Imprimer" on this screen
        prints the formatted ranking instead of the on-screen table.
      */}
      <div className="fixed -left-[9999px] top-0">
        <A4Page meta={meta} category={ranking.category} results={ranking.teamResults} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify the app still builds**

Run: `npm run lint`
Expected: no TypeScript errors.

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (existing `csv-parser`/`ranking-engine` tests plus the new `print-data`/`pdf-export`/`excel-export` tests).

- [ ] **Step 5: Manual browser check**

Run: `npm run dev`, import `test/fixtures/sample.csv`, go to Classement.
Expected:
- "Export PDF" and "Export Excel" download files matching the currently selected category and Top N.
- "Imprimer" opens the print dialog showing the formatted A4 ranking (not the on-screen table with search bar/expand chevrons).
- Switching category or Top N before exporting changes the exported content accordingly.

- [ ] **Step 6: Commit**

```bash
git add src/components/ranking/RankingToolbar.tsx src/pages/RankingPage.tsx
git commit -m "feat: wire print and export actions into the ranking toolbar"
```

---

## Spec coverage check

- Export PDF (renderer-side, browser download) — Task 2, wired in Tasks 6–7.
- Export Excel (renderer-side, browser download) — Task 3, wired in Task 7.
- Aperçu impression A4 (écran 4) — Tasks 4–6.
- Actions directes sur l'écran Classement sans navigation — Task 7.
- Méta meeting placeholder centralisée — Task 1.
- Isolation CSS pour l'impression — Task 4.
- Tests unitaires PDF/Excel/print-data — Tasks 1–3.
- Hors scope confirmé non traité : dialogue Electron natif, logo meeting, sélecteur topN sur `/print`, édition des méta — aucune tâche ne les introduit.

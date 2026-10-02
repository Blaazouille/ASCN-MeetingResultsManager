# Phase 11 — « Tableau de bassin » Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the whole renderer UI to the approved « Tableau de bassin » design (new tokens, Barlow fonts, new sidebar, podium cards, readable ranking table, redesigned Accueil/Import/Palmarès/Paramètres) without changing any calculation, export or data format.

**Architecture:** Additive first, then subtractive. Task 1 adds the new design tokens next to the old ones, so every intermediate commit builds and runs. Tasks 2–3 add the small data/label helpers the new screens need (pure functions in `src/lib/`, unit-tested). Task 4 adds shared UI primitives in a new `src/components/ui/` folder. Tasks 5–11 migrate one screen per task. Task 12 deletes the old palette and fonts, adds a regression test that fails if an old class comes back, and updates the living docs.

**Tech Stack:** React 18 + TypeScript (strict), Tailwind CSS 3.4, lucide-react 0.300, TanStack Table, Vitest (node environment, `test/**/*.test.ts` only). No new dependencies.

**References (read-only, optional):** design canvas https://claude.ai/code/artifact/a852af11-979b-4d58-8458-0adfc6e1cc1e · design system https://claude.ai/artifact/4hd1YLZVKGhsRcjB2kjiya. This plan is self-contained: every value you need is written below.

## Global Constraints

- Work in the worktree `C:\Users\jason\Sources\ASCN-wt-phase11`, branch `feat/phase-11-redesign`. It already contains commit `chore: add local Barlow font files for the Phase 11 redesign` (`src/assets/fonts/*.woff2` + `OFL.txt`).
- **Before Task 1:** PR #11 (`fix/ux-quick-fixes`) must be merged. Then run `git fetch origin && git rebase origin/main`. Several files in this plan were touched by #11; the plan's code is written against the post-#11 state (`formatRetainedSwimmers` exists in `src/lib/utils.ts`, `HomePage` opens existing meetings on `/classement`).
- **No new npm dependency.** Components cannot be unit-tested (no DOM test library, Vitest runs in `node`). Put logic in pure functions in `src/lib/` and test those. Verify components with `npx tsc --noEmit`, `npm run test`, and the visual check at the end of each screen task.
- After every task: `npx tsc --noEmit` → no errors, and `npm run test` → all pass. Then commit.
- Visual check (screen tasks): `npm run dev`, open the screen, compare with the canvas board named in the task. Report what you saw; do not claim a visual check you did not do.
- In every file you create or modify, use **only new tokens** (Task 1 table). Never introduce `primary-*`, `secondary-*`, `accent-*`, `neutral-*` or `font-mono`.
- Contrast: text ≥ 4.5:1, icons/control borders ≥ 3:1. Never white text on `bassin` or `corail`. Medal fills always carry `text-ink`.
- Targets: buttons, options, nav links ≥ 44 px high (`h-11`); table rows ≥ 56 px (`h-14`).
- Copy: French only, French punctuation (non-breaking space before `:` `;` `!` `?`). Say « Nageurs comptés par club », never « Top N ». Points use `formatPoints()` (U+00A0 thousands separator). Gaps use a real minus sign `−` (U+2212).
- Every new file starts with the standard header comment (Responsabilité / Appelé par / Suppression casserait), in French, like existing files.
- One file = one responsibility, max 300 lines. Delete what you replace; no dead code, no commented-out code.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`). The `commit-msg` hook runs commitlint.
- Out of scope: PDF and Excel export styling (`src/lib/pdf-export.tsx`, `excel-export.ts`, `individual-*-export.*`), Electron main process, ranking/CSV algorithms.

---

## File Structure

| File | Status | Responsibility |
| --- | --- | --- |
| `src/styles/fonts.css` | Create | `@font-face` for the bundled Barlow files |
| `src/styles/globals.css` | Modify | New CSS custom properties; base styles (Task 12 removes the old ones) |
| `tailwind.config.ts` | Modify | Expose new tokens as Tailwind colors, fonts, radii, shadows, `sidebar` spacing |
| `index.html` | Modify | Drop the Google Fonts links (the app must work offline) |
| `src/main.tsx` | Modify | Import `fonts.css` |
| `src/lib/db.ts` | Modify | `Meeting.resultCount` on every meeting read |
| `src/lib/ui-labels.ts` | Create | Pure display labels: place, gap, bar ratio, birth, counted summary, result count, badge status, category short label |
| `src/lib/csv-parser.ts` | Modify | `countRowsByCategory()` for the import summary |
| `src/lib/fun-awards.ts` | Modify | `emoji` → `icon` key |
| `src/components/ui/Button.tsx` | Create | Primary / secondary / ghost button |
| `src/components/ui/Segmented.tsx` | Create | One-of-N selector (catégorie, nageurs comptés, statut) |
| `src/components/ui/SearchField.tsx` | Create | Search input with icon |
| `src/components/ui/StatusBadge.tsx` | Create | Provisoire / Définitif / À importer pill |
| `src/components/ui/RankChip.tsx` | Create | Rank number, medal colour for 1–3 |
| `src/components/ui/ClubTag.tsx` | Create | « Notre club » tag |
| `src/components/layout/PageHeader.tsx` | Create | Overline + title + subtitle + actions |
| `src/components/layout/FilterBar.tsx` | Create | White card that holds a page's filters |
| `src/components/layout/SidebarMeetingCard.tsx` | Create | « Meeting ouvert » / « Aucun meeting ouvert » card |
| `src/components/layout/Sidebar.tsx` | Rewrite | New navigation |
| `src/components/layout/AppShell.tsx` | Modify | No header bar, new sidebar width |
| `src/components/layout/Header.tsx` | Delete | Replaced by the sidebar card + page headers |
| `src/components/meeting/ResumeMeetingCard.tsx` | Create | « Reprendre » card on Accueil |
| `src/components/meeting/MeetingCard.tsx`, `MeetingList.tsx`, `MeetingForm.tsx` | Rewrite | New Accueil list and form |
| `src/pages/HomePage.tsx` | Rewrite | New Accueil layout |
| `src/components/import/StatTile.tsx` | Create | Big number + label tile |
| `src/components/import/DropZone.tsx` | Modify | New look, `compact` variant |
| `src/pages/ImportPage.tsx` | Rewrite | Success card, tiles, technical details folded |
| `src/components/ranking/CategoryTabs.tsx` | Rewrite | Thin wrapper over `Segmented` |
| `src/components/ranking/RankingToolbar.tsx` | Rewrite | Filter card (catégorie, nageurs comptés, recherche) |
| `src/components/ranking/PodiumCards.tsx` | Create | Top 3 cards, left to right 1-2-3 |
| `src/components/ranking/TeamRankingTable.tsx`, `TeamRow.tsx`, `SwimmerDetail.tsx` | Rewrite | New table and drill-down |
| `src/pages/RankingPage.tsx` | Rewrite | Header with exports, toolbar, podium, table |
| `src/components/ranking/IndividualRankingTable.tsx`, `src/pages/IndividualPage.tsx` | Rewrite | Same patterns as the team ranking |
| `src/components/ranking/FunAwardsGrid.tsx`, `src/pages/PalmaresPage.tsx` | Rewrite | Icon cards |
| `src/components/ranking/GenderTabs.tsx` | Delete (Task 12) | Already unused |
| `src/pages/SettingsPage.tsx`, `src/components/settings/*.tsx`, `src/components/layout/UpdateToast.tsx` | Modify | Class migration |
| `test/design-tokens.test.ts` | Create | WCAG contrast of token pairs |
| `test/ui-labels.test.ts` | Create | Label helpers |
| `test/no-legacy-tokens.test.ts` | Create (Task 12) | Fails if an old class name comes back |

Why a new `src/components/ui/` folder: the existing folders are per domain (`meeting/`, `ranking/`…). Buttons, badges and selectors are used by every domain, so putting them in one domain folder would be misleading. The alternative, copying the classes in every file, is what caused today's inconsistencies.

---

### Task 1: Design tokens and local fonts

**Files:**
- Create: `src/styles/fonts.css`, `test/design-tokens.test.ts`
- Modify: `src/styles/globals.css`, `tailwind.config.ts`, `index.html`, `src/main.tsx`

**Interfaces:**
- Produces (Tailwind classes every later task uses): colors `marine`, `marine-deep`, `marine-raised`, `marine-line`, `marine-soft`, `on-marine`, `on-marine-muted`, `on-marine-subtle`, `on-marine-faint`, `bassin`, `bassin-strong`, `bassin-soft`, `corail`, `corail-strong`, `corail-soft`, `corail-wash`, `corail-line`, `ink`, `ink-soft`, `ink-muted`, `line`, `line-strong`, `surface`, `surface-raised`, `surface-sunken`, `surface-header`, `success`, `success-light`, `success-bright`, `warning`, `warning-light`, `error`, `error-light`, `medal-gold|silver|bronze`; fonts `font-display` (Barlow Condensed) and `font-body` (Barlow); radii `rounded-sm` 8px, `rounded-md` 10px, `rounded-lg` 12px, `rounded-xl` 16px; shadows `shadow-card`, `shadow-raised`, `shadow-segment`; spacing `sidebar` (248px → `w-sidebar`, `ml-sidebar`).

- [ ] **Step 1: Write the failing contrast test**

Create `test/design-tokens.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// The tokens are the source of truth for every colour in the renderer, so
// their contrast is checked here once instead of screen by screen.
const css = readFileSync('src/styles/globals.css', 'utf8');

function token(name: string): string {
  const match = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6});`).exec(css);
  if (!match) throw new Error(`--color-${name} is missing or not a 6-digit hex value`);
  return match[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(token(a)), luminance(token(b))].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

// [text colour, background it is used on]
const TEXT_PAIRS: Array<[string, string]> = [
  ['ink', 'surface-raised'],
  ['ink', 'surface'],
  ['ink-soft', 'surface-raised'],
  ['ink-soft', 'surface-sunken'],
  ['ink-muted', 'surface-raised'],
  ['ink-muted', 'surface'],
  ['ink-muted', 'surface-header'],
  ['on-marine', 'marine'],
  ['on-marine-muted', 'marine'],
  ['on-marine-muted', 'marine-raised'],
  ['on-marine-subtle', 'marine'],
  ['on-marine-faint', 'marine'],
  ['marine', 'surface-raised'],
  ['marine', 'marine-soft'],
  ['bassin-strong', 'surface-raised'],
  ['bassin-strong', 'bassin-soft'],
  ['corail-strong', 'corail-soft'],
  ['corail-strong', 'corail-wash'],
  ['ink', 'medal-gold'],
  ['ink', 'medal-silver'],
  ['ink', 'medal-bronze'],
  ['ink', 'corail-wash'],
  ['success', 'success-light'],
  ['warning', 'warning-light'],
  ['error', 'surface-raised'],
  ['on-marine', 'error'],
];

// Non-text UI: control borders, icons, the focus ring (WCAG 1.4.11).
const UI_PAIRS: Array<[string, string]> = [
  ['line-strong', 'surface-raised'],
  ['bassin-strong', 'surface-raised'],
  ['marine', 'success-bright'],
];

describe('design tokens — WCAG AA contrast', () => {
  it.each(TEXT_PAIRS)('%s text on %s reaches 4.5:1', (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)('%s on %s reaches 3:1', (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run test/design-tokens.test.ts`
Expected: FAIL with `--color-ink is missing or not a 6-digit hex value` (and similar for the other new names).

- [ ] **Step 3: Add the tokens to `src/styles/globals.css`**

Inside `:root { … }`, after the `--color-error-light` line, add:

```css
  /* Tableau de bassin (Phase 11). Decorative: bassin, corail (never behind
     white text). Text versions: bassin-strong, corail-strong. */
  --color-marine: #0a3663;
  --color-marine-deep: #071e3d;
  --color-marine-raised: #1e466f;
  --color-marine-line: #54728f;
  --color-marine-soft: #e0eefa;
  --color-on-marine: #ffffff;
  --color-on-marine-muted: #b0d5f0;
  --color-on-marine-subtle: #c9ddf0;
  --color-on-marine-faint: #7abbe4;
  --color-bassin: #00a4e4;
  --color-bassin-strong: #006e99;
  --color-bassin-soft: #e6f6fd;
  --color-corail: #ff6b35;
  --color-corail-strong: #b3390a;
  --color-corail-soft: #ffe2d3;
  --color-corail-wash: #fff4ee;
  --color-corail-line: #f5d3c2;
  --color-ink: #1a2332;
  --color-ink-soft: #3f4f66;
  --color-ink-muted: #5b6b7d;
  --color-line: #e8edf2;
  --color-line-strong: #8394a6;
  --color-surface: #f4f7f6;
  --color-surface-raised: #ffffff;
  --color-surface-sunken: #eef2f6;
  --color-surface-header: #f7f9fb;
  --color-success-bright: #22c55e;
  --shadow-raised: 0 8px 24px rgba(10, 54, 99, 0.22);
  --shadow-segment: 0 1px 3px rgba(10, 54, 99, 0.18);
```

Change `--color-warning-light: #fef9c3;` to `--color-warning-light: #fef3c7;`.

In `@layer base`, replace the `body` rule and add focus and reduced-motion rules:

```css
  body {
    @apply bg-surface font-body text-ink antialiased;
  }

  /* One visible focus ring for every interactive element. */
  :focus-visible {
    outline: 2px solid var(--color-bassin-strong);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    ::before,
    ::after {
      transition-duration: 0ms !important;
      animation-duration: 0ms !important;
    }
  }
```

Keep the `h1, h2, h3 { @apply font-display; }` rule and the `.font-mono, [data-numeric]` rule for now (Task 12 removes `.font-mono`).

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/design-tokens.test.ts`
Expected: PASS (29 tests).

- [ ] **Step 5: Create `src/styles/fonts.css`**

```css
/**
 * Responsabilité : déclare les polices Barlow et Barlow Condensed embarquées dans l'app.
 * Appelé par : src/main.tsx.
 * Suppression casserait : la typographie (retour aux polices système), l'app devant fonctionner hors ligne au bord du bassin.
 */
@font-face {
  font-family: 'Barlow';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('../assets/fonts/barlow-latin-400-normal.woff2') format('woff2');
}
@font-face {
  font-family: 'Barlow';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('../assets/fonts/barlow-latin-500-normal.woff2') format('woff2');
}
@font-face {
  font-family: 'Barlow';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('../assets/fonts/barlow-latin-600-normal.woff2') format('woff2');
}
@font-face {
  font-family: 'Barlow';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('../assets/fonts/barlow-latin-700-normal.woff2') format('woff2');
}
@font-face {
  font-family: 'Barlow Condensed';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('../assets/fonts/barlow-condensed-latin-600-normal.woff2') format('woff2');
}
@font-face {
  font-family: 'Barlow Condensed';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('../assets/fonts/barlow-condensed-latin-700-normal.woff2') format('woff2');
}
```

In `src/main.tsx`, add `import './styles/fonts.css';` on the line before `import './styles/globals.css';`.

In `index.html`, delete the two `<link rel="preconnect" …>` lines and the `<link href="https://fonts.googleapis.com/…" rel="stylesheet" />` block.

- [ ] **Step 6: Extend `tailwind.config.ts`**

In `theme.extend.colors`, keep the existing entries and add:

```ts
        marine: {
          DEFAULT: 'var(--color-marine)',
          deep: 'var(--color-marine-deep)',
          raised: 'var(--color-marine-raised)',
          line: 'var(--color-marine-line)',
          soft: 'var(--color-marine-soft)',
        },
        'on-marine': {
          DEFAULT: 'var(--color-on-marine)',
          muted: 'var(--color-on-marine-muted)',
          subtle: 'var(--color-on-marine-subtle)',
          faint: 'var(--color-on-marine-faint)',
        },
        bassin: {
          DEFAULT: 'var(--color-bassin)',
          strong: 'var(--color-bassin-strong)',
          soft: 'var(--color-bassin-soft)',
        },
        corail: {
          DEFAULT: 'var(--color-corail)',
          strong: 'var(--color-corail-strong)',
          soft: 'var(--color-corail-soft)',
          wash: 'var(--color-corail-wash)',
          line: 'var(--color-corail-line)',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
          soft: 'var(--color-ink-soft)',
          muted: 'var(--color-ink-muted)',
        },
        line: {
          DEFAULT: 'var(--color-line)',
          strong: 'var(--color-line-strong)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          raised: 'var(--color-surface-raised)',
          sunken: 'var(--color-surface-sunken)',
          header: 'var(--color-surface-header)',
        },
```

and add `bright: 'var(--color-success-bright)',` inside the existing `success` entry.

Replace `fontFamily.display` and `fontFamily.body` (keep `mono` until Task 12):

```ts
        display: ['"Barlow Condensed"', '"Arial Narrow"', 'system-ui', 'sans-serif'],
        body: ['Barlow', '"Segoe UI"', 'system-ui', 'sans-serif'],
```

Replace `borderRadius` with:

```ts
      borderRadius: {
        DEFAULT: '8px',
        sm: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
      },
```

Add to `boxShadow`: `raised: 'var(--shadow-raised)',` and `segment: 'var(--shadow-segment)',`. Add to `spacing`: `sidebar: '248px',`.

- [ ] **Step 7: Verify and commit**

Run: `npx tsc --noEmit` → no errors. `npm run test` → all pass.
Run `npm run dev`: the app now shows Barlow everywhere (narrower headings), with no request to fonts.googleapis.com (DevTools › Network). Colours are otherwise unchanged at this point.

```bash
git add src/styles test/design-tokens.test.ts tailwind.config.ts index.html src/main.tsx
git commit -m "feat: add Tableau de bassin design tokens and bundled Barlow fonts"
```

---

### Task 2: Result count on every meeting

The new sidebar (✓ on « Import CSV ») and the Accueil cards (« 422 résultats importés », « À importer ») need to know whether a meeting has results, without loading its rows.

**Files:**
- Modify: `src/lib/db.ts`, `src/pages/ImportPage.tsx` (one line, Step 5)
- Test: `test/db.test.ts`

**Interfaces:**
- Produces: `Meeting.resultCount: number` — number of `swimmer_result` rows of the meeting (one per swimmer per category); `0` means nothing imported yet. Present on every `Meeting` returned by `getAllMeetings`, `createMeeting`, `updateMeeting`, and therefore through IPC.

- [ ] **Step 1: Write the failing tests**

Append to the `describe('meeting CRUD', …)` block in `test/db.test.ts` (reuse the file's `freshDb()`, `parseCsv`, `readFileSync`, `path`, `FIXTURE_DIR` already imported at the top):

```ts
  it('reports 0 results for a meeting with nothing imported', () => {
    const db = freshDb();
    const meeting = createMeeting(db, { name: 'Meeting vide' });

    expect(meeting.resultCount).toBe(0);
    expect(getAllMeetings(db)[0].resultCount).toBe(0);
  });

  it('counts one result per swimmer per category after an import', () => {
    const db = freshDb();
    const meeting = createMeeting(db, { name: 'Meeting de la Mer 2026' });
    const { rows } = parseCsv(readFileSync(path.join(FIXTURE_DIR, 'sample.csv')));
    insertSwimmerResults(db, meeting.id, rows);

    // sample.csv: 90 Dames + 121 Messieurs + 211 Mixte rows.
    expect(getAllMeetings(db)[0].resultCount).toBe(422);
    expect(updateMeeting(db, meeting.id, { name: 'Renommé' }).resultCount).toBe(422);
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/db.test.ts`
Expected: FAIL — `expected undefined to be 0`.

- [ ] **Step 3: Implement in `src/lib/db.ts`**

Add the field to `Meeting` (after `activeCategories`):

```ts
  /** Number of swimmer_result rows (one per swimmer per category); 0 = nothing imported yet. */
  resultCount: number;
```

Add `result_count: number;` to the (non-exported) `MeetingRow` interface, and `resultCount: row.result_count,` to `rowToMeeting`.

Add above `getAllMeetings`:

```ts
// Every read of a meeting carries its result count, so Accueil and the sidebar
// can tell "à importer" from "importé" without loading the rows themselves.
const SELECT_MEETING =
  'SELECT m.*, (SELECT COUNT(*) FROM swimmer_result s WHERE s.meeting_id = m.id) AS result_count FROM meeting m';
```

Then replace the four meeting reads in this file:
- `'SELECT * FROM meeting ORDER BY id DESC'` → `` `${SELECT_MEETING} ORDER BY m.id DESC` ``
- each `'SELECT * FROM meeting WHERE id = ?'` (3 places: `createMeeting`, and twice in `updateMeeting`) → `` `${SELECT_MEETING} WHERE m.id = ?` ``

Do not touch `src/lib/backup.ts`: it has its own `MeetingRow` and must keep its backup format unchanged.

- [ ] **Step 4: Run the tests**

Run: `npm run test`
Expected: PASS. If an existing test compares whole meeting objects with `toEqual` and now fails only because of `resultCount`, update that expectation to include the correct `resultCount` (do not weaken the assertion).

- [ ] **Step 5: Refresh meetings after an import**

In `src/pages/ImportPage.tsx`, inside `handleAccepted`, right after `await window.electronAPI.importCsv(meetingId, parsed.rows);` add:

```ts
          // Reload meetings so resultCount (sidebar ✓, Accueil) reflects the import.
          await meetingState.refresh();
```

and add `meetingState.refresh` to the `useCallback` dependency array (destructure it first: `const { refresh } = meetingState;` above the callback, then call `await refresh();` and list `refresh`).

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit`, `npm run test` → pass.

```bash
git add src/lib/db.ts src/pages/ImportPage.tsx test/db.test.ts
git commit -m "feat: expose each meeting's result count"
```

---

### Task 3: Display label helpers

**Files:**
- Create: `src/lib/ui-labels.ts`, `test/ui-labels.test.ts`
- Modify: `src/lib/csv-parser.ts` (add `countRowsByCategory`), `test/csv-parser.test.ts`

**Interfaces:**
- Consumes: `formatPoints` (`src/lib/utils.ts`), `Gender` (`src/lib/individual-ranking.ts`), `Meeting`, `MeetingStatus` (`src/lib/db.ts`), `RawSwimmerRow` (`src/lib/csv-parser.ts`).
- Produces:
  - `placeLabel(rank: number): string` — `1 → "1re place"`, `2 → "2e place"`
  - `formatGap(points: number, leaderPoints: number): string` — `"−477"`, `"—"` for the leader
  - `leaderRatio(points: number, leaderPoints: number): number` — 0…1, for the points bar
  - `birthLabel(birthyear: number, gender: Gender): string` — `"Née en 1991"`, `"Né en 1970"`, `"Année 1970"`
  - `countedSummary(counted: number, entered: number): string` — `"5 nageurs comptés · 25 autres nageurs du club ne comptent pas dans le total"`
  - `resultCountLabel(count: number): string` — `"422 résultats importés"`, `"Aucun résultat importé"`
  - `type BadgeStatus = MeetingStatus | 'pending'`; `meetingBadgeStatus(meeting: Pick<Meeting, 'status' | 'resultCount'>): BadgeStatus`
  - `categoryShortLabel(category: string): string` — `"Classement Mixte" → "Mixte"`
  - `countRowsByCategory(rows: RawSwimmerRow[]): Array<{ category: string; count: number }>` (in `csv-parser.ts`)

- [ ] **Step 1: Write the failing tests**

Create `test/ui-labels.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  birthLabel,
  categoryShortLabel,
  countedSummary,
  formatGap,
  leaderRatio,
  meetingBadgeStatus,
  placeLabel,
  resultCountLabel,
} from '../src/lib/ui-labels';

const NBSP = '\u00a0';
const MINUS = '\u2212';

describe('placeLabel', () => {
  it('uses "1re" for first place and "e" after', () => {
    expect(placeLabel(1)).toBe('1re place');
    expect(placeLabel(2)).toBe('2e place');
    expect(placeLabel(3)).toBe('3e place');
  });
});

describe('formatGap', () => {
  it('shows the gap to the leader with a real minus sign', () => {
    expect(formatGap(5364, 5841)).toBe(`${MINUS}477`);
  });

  it('groups thousands with a non-breaking space', () => {
    expect(formatGap(4735, 5841)).toBe(`${MINUS}1${NBSP}106`);
  });

  it('shows a dash for the leader itself', () => {
    expect(formatGap(5841, 5841)).toBe('—');
  });
});

describe('leaderRatio', () => {
  it('is the share of the leader points', () => {
    expect(leaderRatio(2920.5, 5841)).toBeCloseTo(0.5);
    expect(leaderRatio(5841, 5841)).toBe(1);
  });

  it('is 0 when there is no leader score', () => {
    expect(leaderRatio(100, 0)).toBe(0);
  });
});

describe('birthLabel', () => {
  it('agrees with the gender of the category', () => {
    expect(birthLabel(1991, 'F')).toBe('Née en 1991');
    expect(birthLabel(1970, 'M')).toBe('Né en 1970');
  });

  it('falls back to a neutral label for mixed categories', () => {
    expect(birthLabel(1970, null)).toBe('Année 1970');
  });
});

describe('countedSummary', () => {
  it('says how many swimmers count and how many do not', () => {
    expect(countedSummary(5, 30)).toBe('5 nageurs comptés · 25 autres nageurs du club ne comptent pas dans le total');
  });

  it('omits the second part when every swimmer counts', () => {
    expect(countedSummary(2, 2)).toBe('2 nageurs comptés');
  });

  it('uses the singular for one swimmer', () => {
    expect(countedSummary(1, 1)).toBe('1 nageur compté');
    expect(countedSummary(5, 6)).toBe('5 nageurs comptés · 1 autre nageur du club ne compte pas dans le total');
  });
});

describe('resultCountLabel', () => {
  it('describes the number of imported results', () => {
    expect(resultCountLabel(0)).toBe('Aucun résultat importé');
    expect(resultCountLabel(1)).toBe('1 résultat importé');
    expect(resultCountLabel(1422)).toBe(`1${NBSP}422 résultats importés`);
  });
});

describe('meetingBadgeStatus', () => {
  it('reads "pending" while nothing is imported, whatever the status', () => {
    expect(meetingBadgeStatus({ status: 'final', resultCount: 0 })).toBe('pending');
  });

  it('reads the meeting status once results exist', () => {
    expect(meetingBadgeStatus({ status: 'provisional', resultCount: 422 })).toBe('provisional');
    expect(meetingBadgeStatus({ status: 'final', resultCount: 422 })).toBe('final');
  });
});

describe('categoryShortLabel', () => {
  it('drops the "Classement " prefix', () => {
    expect(categoryShortLabel('Classement Mixte')).toBe('Mixte');
    expect(categoryShortLabel('Classement Dames')).toBe('Dames');
  });

  it('keeps a category without the prefix unchanged', () => {
    expect(categoryShortLabel('Relais')).toBe('Relais');
  });
});
```

Append to `test/csv-parser.test.ts` (it already reads the fixture; if it does not import these, add `import { countRowsByCategory } from '../src/lib/csv-parser';` next to the existing csv-parser import):

```ts
describe('countRowsByCategory', () => {
  it('counts the fixture rows per category', () => {
    const { rows } = parseCsv(readFileSync(path.join(__dirname, 'fixtures', 'sample.csv')));
    const counts = countRowsByCategory(rows);

    expect(counts).toHaveLength(3);
    expect(counts).toEqual(
      expect.arrayContaining([
        { category: 'Classement Dames', count: 90 },
        { category: 'Classement Messieurs', count: 121 },
        { category: 'Classement Mixte', count: 211 },
      ])
    );
  });
});
```

(Use the fixture-loading imports the file already has; add `readFileSync`/`path` imports only if missing.)

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/ui-labels.test.ts test/csv-parser.test.ts`
Expected: FAIL — cannot find module `../src/lib/ui-labels`, and `countRowsByCategory` is not exported.

- [ ] **Step 3: Implement**

Create `src/lib/ui-labels.ts`:

```ts
/**
 * Responsabilité : libellés et valeurs d'affichage dérivés des données (places, écarts, statuts, catégories).
 * Appelé par : les composants de classement, d'accueil, d'import et la barre latérale.
 * Suppression casserait : les textes calculés de l'interface (« 1re place », « −477 », « À importer »…).
 */
import type { Meeting, MeetingStatus } from './db';
import type { Gender } from './individual-ranking';
import { formatPoints } from './utils';

/** "1re place", "2e place"… French ordinal of a podium place. */
export function placeLabel(rank: number): string {
  return `${rank === 1 ? '1re' : `${rank}e`} place`;
}

/** Gap to the leader with a real minus sign (U+2212), or "—" for the leader itself. */
export function formatGap(points: number, leaderPoints: number): string {
  const gap = leaderPoints - points;
  return gap > 0 ? `\u2212${formatPoints(gap)}` : '—';
}

/** Share of the leader's points, clamped to 0…1: drives the width of the points bar. */
export function leaderRatio(points: number, leaderPoints: number): number {
  if (leaderPoints <= 0) return 0;
  return Math.min(1, Math.max(0, points / leaderPoints));
}

/** "Née en 1991" / "Né en 1970"; mixed categories don't tell the gender, so "Année 1970". */
export function birthLabel(birthyear: number, gender: Gender): string {
  if (gender === 'F') return `Née en ${birthyear}`;
  if (gender === 'M') return `Né en ${birthyear}`;
  return `Année ${birthyear}`;
}

/** Drill-down sentence: swimmers counted in the team total, then those left out. */
export function countedSummary(counted: number, entered: number): string {
  const head = counted >= 2 ? `${counted} nageurs comptés` : `${counted} nageur compté`;
  const others = entered - counted;
  if (others <= 0) return head;
  const tail = others >= 2 ? 'autres nageurs du club ne comptent' : 'autre nageur du club ne compte';
  return `${head} · ${others} ${tail} pas dans le total`;
}

/** "422 résultats importés" / "Aucun résultat importé". */
export function resultCountLabel(count: number): string {
  if (count === 0) return 'Aucun résultat importé';
  return count === 1 ? '1 résultat importé' : `${formatPoints(count)} résultats importés`;
}

export type BadgeStatus = MeetingStatus | 'pending';

/** A meeting with nothing imported reads "À importer" whatever its status. */
export function meetingBadgeStatus(meeting: Pick<Meeting, 'status' | 'resultCount'>): BadgeStatus {
  return meeting.resultCount === 0 ? 'pending' : meeting.status;
}

/** "Classement Mixte" → "Mixte": the prefix repeats on every tab and adds nothing. */
export function categoryShortLabel(category: string): string {
  return category.replace(/^Classement\s+/i, '');
}
```

In `src/lib/csv-parser.ts`, add after `summarizeSwimmerRows`:

```ts
/** Rows per category, in first-appearance order — shown as chips on the import summary. */
export function countRowsByCategory(rows: RawSwimmerRow[]): Array<{ category: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.name, (counts.get(row.name) ?? 0) + 1);
  }
  return Array.from(counts, ([category, count]) => ({ category, count }));
}
```

- [ ] **Step 4: Run the tests**

Run: `npm run test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui-labels.ts src/lib/csv-parser.ts test/ui-labels.test.ts test/csv-parser.test.ts
git commit -m "feat: add display label helpers for the redesign"
```

---

### Task 4: UI primitives

**Files:**
- Create: `src/components/ui/Button.tsx`, `Segmented.tsx`, `SearchField.tsx`, `StatusBadge.tsx`, `RankChip.tsx`, `ClubTag.tsx`, `src/components/layout/PageHeader.tsx`, `src/components/layout/FilterBar.tsx`

**Interfaces:**
- Consumes: `cn`, `meetingStatusLabel` (`src/lib/export-data.ts`), `placeLabel`, `BadgeStatus` (Task 3).
- Produces:
  - `Button(props: ButtonProps)` — `ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'secondary' | 'ghost'; size?: 'md' | 'lg'; icon?: LucideIcon; iconAfter?: LucideIcon }`
  - `Segmented<T extends string | number>(props: { label: string; options: ReadonlyArray<{ value: T; label: string }>; value: T; onChange: (value: T) => void; hideLabel?: boolean })`
  - `SearchField(props: { value: string; onChange: (value: string) => void; placeholder: string })`
  - `StatusBadge(props: { status: BadgeStatus })`
  - `RankChip(props: { rank: number; size?: 'md' | 'lg' })`
  - `ClubTag()`
  - `PageHeader(props: { overline?: string; title: string; subtitle?: string; actions?: ReactNode })`
  - `FilterBar(props: { children: ReactNode })`

No unit tests here (no DOM environment); every piece of logic they use was tested in Task 3.

- [ ] **Step 1: Create `src/components/ui/Button.tsx`**

```tsx
/**
 * Responsabilité : bouton d'action (principal, secondaire, discret) du design « Tableau de bassin ».
 * Appelé par : les pages et composants qui déclenchent une action (exports, création, import, paramètres).
 * Suppression casserait : tous les boutons d'action de l'interface.
 */
import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  icon?: LucideIcon;
  iconAfter?: LucideIcon;
}

// primary = the one action a screen exists for; use it at most once per screen.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-marine text-on-marine hover:bg-marine-deep',
  secondary: 'border-line-strong bg-surface-raised text-marine hover:bg-surface-sunken',
  ghost: 'bg-transparent text-marine hover:bg-surface-sunken',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconAfter: IconAfter,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps): JSX.Element {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm border-[1.5px] border-transparent font-body font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        size === 'lg' ? 'h-12 px-6 text-base' : 'h-11 px-5 text-[15px]',
        VARIANT_CLASSES[variant],
        className
      )}
      {...rest}
    >
      {Icon && <Icon className="h-5 w-5" aria-hidden />}
      {children}
      {IconAfter && <IconAfter className="h-5 w-5" aria-hidden />}
    </button>
  );
}
```

- [ ] **Step 2: Create `src/components/ui/Segmented.tsx`**

```tsx
/**
 * Responsabilité : sélecteur « une option parmi quelques-unes » toujours visible (catégorie, nageurs comptés, statut).
 * Appelé par : CategoryTabs.tsx, RankingToolbar.tsx, SettingsForm.tsx.
 * Suppression casserait : le choix de la catégorie, du nombre de nageurs comptés et du statut.
 */
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string | number> {
  /** Visible label beside the options; also the group's accessible name. */
  label: string;
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  hideLabel?: boolean;
}

export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  hideLabel = false,
}: SegmentedProps<T>): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      {!hideLabel && (
        <span className="text-sm font-semibold text-ink-soft" aria-hidden>
          {label}
        </span>
      )}
      <div role="group" aria-label={label} className="inline-flex gap-1 rounded-md bg-surface-sunken p-1">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                'h-10 min-w-[48px] rounded-sm px-4 text-[15px] transition-colors',
                selected
                  ? 'bg-surface-raised font-bold text-marine shadow-segment'
                  : 'font-semibold text-ink-soft hover:text-ink'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/ui/SearchField.tsx`**

```tsx
/**
 * Responsabilité : champ de recherche avec loupe (filtre à la frappe).
 * Appelé par : RankingToolbar.tsx, IndividualPage.tsx.
 * Suppression casserait : la recherche d'un club ou d'un nageur.
 */
import { Search } from 'lucide-react';

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Says what to type; also the input's accessible name. */
  placeholder: string;
}

export function SearchField({ value, onChange, placeholder }: SearchFieldProps): JSX.Element {
  return (
    <label className="flex h-11 w-[300px] max-w-full items-center gap-2 rounded-sm border-[1.5px] border-line-strong bg-surface-raised px-3 text-ink-muted focus-within:border-bassin-strong">
      <Search className="h-[18px] w-[18px] shrink-0" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-muted"
      />
    </label>
  );
}
```

- [ ] **Step 4: Create `src/components/ui/StatusBadge.tsx`, `RankChip.tsx`, `ClubTag.tsx`**

`src/components/ui/StatusBadge.tsx`:

```tsx
/**
 * Responsabilité : pastille de statut d'un meeting (Provisoire, Définitif, À importer).
 * Appelé par : SidebarMeetingCard.tsx, MeetingCard.tsx, ResumeMeetingCard.tsx.
 * Suppression casserait : l'affichage du statut des meetings.
 */
import { meetingStatusLabel } from '@/lib/export-data';
import type { BadgeStatus } from '@/lib/ui-labels';
import { cn } from '@/lib/utils';

// Dark text on a light tint of the same family: never yellow on yellow.
const BADGE_CLASSES: Record<BadgeStatus, string> = {
  provisional: 'bg-warning-light text-warning',
  final: 'bg-success-light text-success',
  pending: 'bg-surface-sunken text-ink-soft',
};

export interface StatusBadgeProps {
  status: BadgeStatus;
}

export function StatusBadge({ status }: StatusBadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-[3px] text-[13px] font-semibold leading-[18px]',
        BADGE_CLASSES[status]
      )}
    >
      {status === 'pending' ? 'À importer' : meetingStatusLabel(status)}
    </span>
  );
}
```

`src/components/ui/RankChip.tsx`:

```tsx
/**
 * Responsabilité : numéro de rang, aux couleurs de la médaille pour les trois premiers.
 * Appelé par : PodiumCards.tsx, TeamRankingTable.tsx, IndividualRankingTable.tsx.
 * Suppression casserait : l'affichage des rangs dans les classements.
 */
import { placeLabel } from '@/lib/ui-labels';
import { cn } from '@/lib/utils';

// Ink digits on the medal colours: white on gold was about 2:1.
const MEDAL_CLASSES: Record<number, string> = {
  1: 'bg-medal-gold text-ink',
  2: 'bg-medal-silver text-ink',
  3: 'bg-medal-bronze text-ink',
};

export interface RankChipProps {
  rank: number;
  size?: 'md' | 'lg';
}

export function RankChip({ rank, size = 'md' }: RankChipProps): JSX.Element {
  return (
    <span
      aria-label={placeLabel(rank)}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-display font-bold tabular-nums',
        size === 'lg' ? 'h-10 w-10 rounded-full text-[22px]' : 'h-[34px] w-[34px] rounded-sm text-[19px]',
        MEDAL_CLASSES[rank] ?? 'text-ink-soft'
      )}
    >
      {rank}
    </span>
  );
}
```

`src/components/ui/ClubTag.tsx`:

```tsx
/**
 * Responsabilité : étiquette « Notre club » accolée à AS Cherbourg Natation dans les classements.
 * Appelé par : TeamRankingTable.tsx, IndividualRankingTable.tsx.
 * Suppression casserait : le repérage de notre club autrement que par la couleur.
 */
export function ClubTag(): JSX.Element {
  return (
    <span className="whitespace-nowrap rounded-full bg-corail-soft px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.04em] text-corail-strong">
      Notre club
    </span>
  );
}
```

- [ ] **Step 5: Create `src/components/layout/PageHeader.tsx` and `FilterBar.tsx`**

`src/components/layout/PageHeader.tsx`:

```tsx
/**
 * Responsabilité : en-tête de page (surtitre, titre, résumé, actions à droite).
 * Appelé par : toutes les pages.
 * Suppression casserait : le titre et les actions principales de chaque écran.
 */
import type { ReactNode } from 'react';

export interface PageHeaderProps {
  /** Usually the open meeting's name. */
  overline?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ overline, title, subtitle, actions }: PageHeaderProps): JSX.Element {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex flex-col gap-1.5">
        {overline && <span className="text-sm font-semibold text-ink-muted">{overline}</span>}
        <h1 className="font-display text-[44px] font-bold leading-none text-marine">{title}</h1>
        {subtitle && <p className="text-[15px] text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}
```

`src/components/layout/FilterBar.tsx`:

```tsx
/**
 * Responsabilité : carte blanche qui regroupe les filtres d'une page de classement.
 * Appelé par : RankingToolbar.tsx, IndividualPage.tsx.
 * Suppression casserait : la mise en page des filtres des classements.
 */
import type { ReactNode } from 'react';

export interface FilterBarProps {
  children: ReactNode;
}

export function FilterBar({ children }: FilterBarProps): JSX.Element {
  return (
    <section aria-label="Filtres" className="flex flex-wrap items-center gap-8 rounded-lg bg-surface-raised px-4 py-3 shadow-card">
      {children}
    </section>
  );
}
```

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit`, `npm run test` → pass. (The primitives are not used yet; Tasks 5–11 use every one of them.)

```bash
git add src/components/ui src/components/layout/PageHeader.tsx src/components/layout/FilterBar.tsx
git commit -m "feat: add shared UI primitives for the redesign"
```

---

### Task 5: Sidebar and app shell

Canvas board: « Après — Classement par équipes » (left column) and « Après — Accueil » (sidebar with no meeting).

**Files:**
- Create: `src/components/layout/SidebarMeetingCard.tsx`
- Rewrite: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/AppShell.tsx`
- Delete: `src/components/layout/Header.tsx`

**Interfaces:**
- Consumes: `Meeting.resultCount` (Task 2), `meetingBadgeStatus` (Task 3), `StatusBadge` (Task 4), `useAppVersion` (existing hook, returns `string | null`).
- Produces: `Sidebar(props: { meeting: Meeting | null })`.

- [ ] **Step 1: Create `src/components/layout/SidebarMeetingCard.tsx`**

```tsx
/**
 * Responsabilité : carte « Meeting ouvert » (nom + statut) ou « Aucun meeting ouvert » dans la barre latérale.
 * Appelé par : Sidebar.tsx.
 * Suppression casserait : l'indication permanente du meeting en cours et de son statut.
 */
import type { Meeting } from '@/lib/db';
import { meetingBadgeStatus } from '@/lib/ui-labels';
import { StatusBadge } from '@/components/ui/StatusBadge';

const CARD_LABEL = 'text-xs font-semibold uppercase tracking-[0.08em] text-on-marine-muted';

export interface SidebarMeetingCardProps {
  meeting: Meeting | null;
}

export function SidebarMeetingCard({ meeting }: SidebarMeetingCardProps): JSX.Element {
  if (!meeting) {
    return (
      <div className="flex flex-col gap-1.5 rounded-lg border-[1.5px] border-dashed border-marine-line p-3.5">
        <span className={CARD_LABEL}>Aucun meeting ouvert</span>
        <span className="text-sm leading-snug text-on-marine-subtle">
          Ouvrez ou créez un meeting pour accéder à l'import et aux résultats.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-marine-raised p-3.5">
      <span className={CARD_LABEL}>Meeting ouvert</span>
      <span className="text-base font-semibold leading-tight text-on-marine">{meeting.name}</span>
      <span>
        <StatusBadge status={meetingBadgeStatus(meeting)} />
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `src/components/layout/Sidebar.tsx`**

```tsx
/**
 * Responsabilité : navigation latérale (logo, meeting ouvert, étapes, résultats, paramètres, version).
 * Appelé par : AppShell.tsx.
 * Suppression casserait : la navigation entre écrans.
 */
import { NavLink } from 'react-router-dom';
import { Award, Check, Home, Settings, Upload, User, Users, type LucideIcon } from 'lucide-react';
import logoUrl from '../../../resources/icon.png';
import type { Meeting } from '@/lib/db';
import { cn } from '@/lib/utils';
import { useAppVersion } from '@/hooks/use-app-version';
import { SidebarMeetingCard } from './SidebarMeetingCard';

interface NavEntry {
  to: string;
  label: string;
  icon: LucideIcon;
}

const MEETINGS_ENTRY: NavEntry = { to: '/', label: 'Meetings', icon: Home };
const IMPORT_ENTRY: NavEntry = { to: '/import', label: 'Import CSV', icon: Upload };
const RESULT_ENTRIES: readonly NavEntry[] = [
  { to: '/classement', label: 'Par équipes', icon: Users },
  { to: '/individuels', label: 'Individuels', icon: User },
  { to: '/palmares', label: 'Palmarès des rigolos', icon: Award },
];
const SETTINGS_ENTRY: NavEntry = { to: '/parametres', label: 'Paramètres', icon: Settings };

const ITEM_BASE = 'flex h-11 items-center gap-3 rounded-sm px-3 text-[15px] transition-colors';
const SECTION_LABEL = 'px-3 pb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-on-marine-muted';

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    ITEM_BASE,
    isActive ? 'bg-surface-raised font-semibold text-marine' : 'font-medium text-on-marine-subtle hover:bg-marine-raised'
  );
}

interface NavItemProps {
  entry: NavEntry;
  enabled: boolean;
  done?: boolean;
}

/** Disabled entries stay visible (greyed): the menu keeps the same shape whether or not a meeting is open. */
function NavItem({ entry, enabled, done = false }: NavItemProps): JSX.Element {
  const Icon = entry.icon;
  const content = (
    <>
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      <span>{entry.label}</span>
      {done && (
        <span
          className="ml-auto flex h-[22px] w-[22px] items-center justify-center rounded-full bg-success-bright text-marine"
          aria-label="terminé"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
        </span>
      )}
    </>
  );

  if (!enabled) {
    return (
      <span aria-disabled="true" className={cn(ITEM_BASE, 'cursor-not-allowed font-medium text-on-marine-subtle opacity-40')}>
        {content}
      </span>
    );
  }
  return (
    <NavLink to={entry.to} end={entry.to === '/'} className={navLinkClass}>
      {content}
    </NavLink>
  );
}

export interface SidebarProps {
  meeting: Meeting | null;
}

export function Sidebar({ meeting }: SidebarProps): JSX.Element {
  const version = useAppVersion();
  const hasResults = meeting !== null && meeting.resultCount > 0;

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-y-0 left-0 z-20 flex w-sidebar flex-col gap-6 overflow-y-auto bg-marine px-4 py-6 text-on-marine"
    >
      <div className="flex items-center gap-3 px-2">
        {/* White tile: the logo's navy half would vanish on the navy sidebar. */}
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-raised">
          <img src={logoUrl} alt="" className="h-8 w-8 object-contain" />
        </span>
        <span className="flex flex-col">
          <span className="font-display text-xl font-bold leading-6 tracking-[0.02em]">MDLM Ranking</span>
          <span className="text-[13px] text-on-marine-muted">AS Cherbourg Natation</span>
        </span>
      </div>

      <SidebarMeetingCard meeting={meeting} />

      <div className="flex flex-col gap-1">
        <NavItem entry={MEETINGS_ENTRY} enabled />
      </div>

      <div className="flex flex-col gap-1">
        <span className={SECTION_LABEL}>Données</span>
        <NavItem entry={IMPORT_ENTRY} enabled={meeting !== null} done={hasResults} />
      </div>

      <div className="flex flex-col gap-1">
        <span className={SECTION_LABEL}>Résultats</span>
        {RESULT_ENTRIES.map((entry) => (
          <NavItem key={entry.to} entry={entry} enabled={hasResults} />
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-1">
        {/* Not gated on a meeting: restoring a backup on a fresh install is the
            one thing you need Paramètres for before any meeting exists. */}
        <NavItem entry={SETTINGS_ENTRY} enabled />
        {version && <span className="px-3 pt-2 text-xs text-on-marine-faint">Version {version}</span>}
      </div>
    </nav>
  );
}
```

If `npx tsc --noEmit` rejects the `.png` import, check that `src/vite-env.d.ts` still has `/// <reference types="vite/client" />` (it declares image modules); do not add a new declaration file.

- [ ] **Step 3: Update `src/components/layout/AppShell.tsx`**

Remove the `Header` import. Replace the returned JSX with:

```tsx
    <div className="flex min-h-screen bg-surface">
      <Sidebar meeting={meetingState.currentMeeting} />
      <div className="ml-sidebar flex h-screen flex-1 flex-col">
        <main className="flex-1 overflow-y-auto px-10 py-8">
          <Outlet context={context} />
        </main>
      </div>
      <UpdateToast />
    </div>
```

Delete `src/components/layout/Header.tsx` (`git rm`). Its content (meeting name + status) now lives in `SidebarMeetingCard`, and each page shows the meeting name in its `PageHeader` overline.

- [ ] **Step 4: Verify and commit**

Run: `npx tsc --noEmit`, `npm run test` → pass.
Visual check with `npm run dev`:
- no meeting open → dashed card, Meetings active, Import/Résultats greyed but visible;
- meeting with results → Import has the green ✓ and the three result links work;
- keyboard Tab shows the focus ring on each link.

```bash
git add -A src/components/layout
git commit -m "feat: redesign the sidebar and drop the header bar"
```

---

### Task 6: Accueil (meetings)

Canvas board: « Après — Accueil ».

**Files:**
- Create: `src/components/meeting/ResumeMeetingCard.tsx`
- Rewrite: `src/components/meeting/MeetingCard.tsx`, `MeetingList.tsx`, `MeetingForm.tsx`, `src/pages/HomePage.tsx`

**Interfaces:**
- Consumes: `Button`, `StatusBadge`, `PageHeader` (Task 4); `meetingBadgeStatus`, `resultCountLabel` (Task 3); `formatMeetingCreatedAt` (existing, `src/lib/export-data.ts`).
- Produces: `MeetingForm(props: { onSubmit: (input: MeetingInput) => Promise<void> })` — the `onCancel` prop is removed (the form is always visible). `ResumeMeetingCard(props: { meeting: Meeting; onOpenRanking: () => void; onImport: () => void })`.

- [ ] **Step 1: Rewrite `src/components/meeting/MeetingCard.tsx`**

```tsx
/**
 * Responsabilité : ligne résumant un meeting (nom, date de création, nombre de résultats, statut) sur l'Accueil.
 * Appelé par : MeetingList.tsx.
 * Suppression casserait : l'affichage de la liste des meetings.
 */
import { ChevronRight } from 'lucide-react';
import type { Meeting } from '@/lib/db';
import { formatMeetingCreatedAt } from '@/lib/export-data';
import { meetingBadgeStatus, resultCountLabel } from '@/lib/ui-labels';
import { StatusBadge } from '@/components/ui/StatusBadge';

export interface MeetingCardProps {
  meeting: Meeting;
  onOpen: (meeting: Meeting) => void;
}

export function MeetingCard({ meeting, onOpen }: MeetingCardProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onOpen(meeting)}
      className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface"
    >
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[17px] font-semibold text-ink">{meeting.name}</span>
        <span className="text-sm text-ink-muted">
          Créé le {formatMeetingCreatedAt(meeting)} · {resultCountLabel(meeting.resultCount)}
        </span>
      </span>
      <StatusBadge status={meetingBadgeStatus(meeting)} />
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden />
    </button>
  );
}
```

- [ ] **Step 2: Rewrite `src/components/meeting/MeetingList.tsx`**

Keep the existing header comment. Replace the body:

```tsx
import type { Meeting } from '@/lib/db';
import { MeetingCard } from './MeetingCard';

export interface MeetingListProps {
  meetings: Meeting[];
  onOpen: (meeting: Meeting) => void;
}

export function MeetingList({ meetings, onOpen }: MeetingListProps): JSX.Element {
  if (meetings.length === 0) {
    return (
      <p className="rounded-lg bg-surface-raised p-5 text-[15px] text-ink-muted shadow-card">
        Aucun meeting pour l'instant. Créez-en un pour commencer.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg bg-surface-raised shadow-card">
      {meetings.map((meeting) => (
        <li key={meeting.id}>
          <MeetingCard meeting={meeting} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Rewrite `src/components/meeting/MeetingForm.tsx`**

Update the header comment's « Appelé par » to `HomePage.tsx.` (check with `grep -rn "MeetingForm" src` that nothing else uses it). Body:

```tsx
import { useState, type FormEvent } from 'react';
import type { MeetingInput } from '@/lib/db';
import { Button } from '@/components/ui/Button';

export interface MeetingFormProps {
  onSubmit: (input: MeetingInput) => Promise<void>;
}

export function MeetingForm({ onSubmit }: MeetingFormProps): JSX.Element {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ name });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 rounded-lg bg-surface-raised p-5 shadow-card">
      <label htmlFor="meeting-name" className="text-[15px] font-semibold text-ink">
        Nom du meeting
      </label>
      <input
        id="meeting-name"
        type="text"
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Meeting de la Mer 2027"
        className="h-12 rounded-sm border-[1.5px] border-line-strong px-3.5 text-base text-ink outline-none placeholder:text-ink-muted focus:border-bassin-strong"
      />
      <Button type="submit" variant="primary" size="lg" disabled={isSubmitting}>
        Créer et importer le CSV
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Create `src/components/meeting/ResumeMeetingCard.tsx`**

```tsx
/**
 * Responsabilité : carte « Reprendre » du dernier meeting sur l'Accueil (statut, résultats, accès direct).
 * Appelé par : HomePage.tsx.
 * Suppression casserait : l'accès en un clic au meeting du jour.
 */
import { ArrowRight } from 'lucide-react';
import type { Meeting } from '@/lib/db';
import { meetingBadgeStatus, resultCountLabel } from '@/lib/ui-labels';
import { StatusBadge } from '@/components/ui/StatusBadge';

export interface ResumeMeetingCardProps {
  meeting: Meeting;
  onOpenRanking: () => void;
  onImport: () => void;
}

export function ResumeMeetingCard({ meeting, onOpenRanking, onImport }: ResumeMeetingCardProps): JSX.Element {
  const hasResults = meeting.resultCount > 0;

  return (
    <section
      aria-label="Dernier meeting"
      className="flex flex-wrap items-center justify-between gap-8 rounded-xl bg-marine px-8 py-7 text-on-marine shadow-raised"
    >
      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-on-marine-muted">Reprendre</span>
        <span className="font-display text-4xl font-bold leading-none">{meeting.name}</span>
        <div className="flex items-center gap-2.5 text-[15px] text-on-marine-subtle">
          <StatusBadge status={meetingBadgeStatus(meeting)} />
          <span>{resultCountLabel(meeting.resultCount)}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {hasResults && (
          <button
            type="button"
            onClick={onImport}
            className="inline-flex h-12 items-center rounded-sm border-[1.5px] border-on-marine-faint px-5 text-base font-semibold text-on-marine transition-colors hover:bg-marine-raised"
          >
            Réimporter un CSV
          </button>
        )}
        <button
          type="button"
          onClick={hasResults ? onOpenRanking : onImport}
          className="inline-flex h-12 items-center gap-2 rounded-sm bg-surface-raised px-6 text-base font-bold text-marine transition-colors hover:bg-marine-soft"
        >
          {hasResults ? 'Ouvrir le classement' : 'Importer le CSV'}
          <ArrowRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </section>
  );
}
```

The two buttons here are the inverted (on-navy) version of `Button`; they appear only on this card, so they stay local rather than becoming a fourth `Button` variant.

- [ ] **Step 5: Rewrite `src/pages/HomePage.tsx`**

Keep the header comment. Body:

```tsx
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import type { Meeting } from '@/lib/db';
import { MeetingForm } from '@/components/meeting/MeetingForm';
import { MeetingList } from '@/components/meeting/MeetingList';
import { ResumeMeetingCard } from '@/components/meeting/ResumeMeetingCard';

const STEPS = ['Créer le meeting', "Importer le CSV exporté d'extraNat", 'Consulter, puis exporter en PDF'] as const;

export default function HomePage(): JSX.Element {
  const { meetingState } = useOutletContext<AppOutletContext>();
  const navigate = useNavigate();
  // getAllMeetings returns meetings by id DESC: the first one is the most recent.
  const latest = meetingState.meetings[0];

  // An existing meeting opens on its ranking (RankingPage redirects to /import
  // when it has no results); a new one goes straight to Import.
  const openAt = (meeting: Meeting, path: '/classement' | '/import'): void => {
    meetingState.selectMeeting(meeting.id);
    navigate(path);
  };

  return (
    <div className="flex flex-col gap-7">
      <PageHeader title="Meetings" subtitle="Reprenez là où vous en étiez, ou créez le meeting du jour." />

      {meetingState.error && <p className="text-sm text-error">{meetingState.error}</p>}

      {latest && (
        <ResumeMeetingCard
          meeting={latest}
          onOpenRanking={() => openAt(latest, '/classement')}
          onImport={() => openAt(latest, '/import')}
        />
      )}

      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start gap-6">
        <section aria-labelledby="all-meetings" className="flex flex-col gap-3">
          <h2 id="all-meetings" className="font-display text-2xl font-bold text-marine">
            Tous les meetings
          </h2>
          {meetingState.isLoading ? (
            <p className="text-[15px] text-ink-muted">Chargement des meetings…</p>
          ) : (
            <MeetingList meetings={meetingState.meetings} onOpen={(meeting) => openAt(meeting, '/classement')} />
          )}
        </section>

        <section aria-labelledby="new-meeting" className="flex flex-col gap-3">
          <h2 id="new-meeting" className="font-display text-2xl font-bold text-marine">
            Nouveau meeting
          </h2>
          <MeetingForm
            onSubmit={async (input) => {
              const meeting = await meetingState.createMeeting(input);
              openAt(meeting, '/import');
            }}
          />
          {/* Numbered because it is a real sequence: the order is the information. */}
          <ol className="flex flex-col gap-2.5 pt-1">
            {STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-3 text-[15px] text-ink-soft">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bassin-soft font-bold text-bassin-strong">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit`, `npm run test` → pass.
Visual check: the latest meeting appears in the navy « Reprendre » card; a meeting without results shows « À importer » and « Importer le CSV »; creating a meeting lands on Import; clicking a meeting with results lands on the ranking.

```bash
git add src/components/meeting src/pages/HomePage.tsx
git commit -m "feat: redesign the Accueil screen"
```

---

### Task 7: Import

Canvas board: « Après — Import réussi ».

**Files:**
- Create: `src/components/import/StatTile.tsx`
- Modify: `src/components/import/DropZone.tsx` (JSX and classes only; the drag/drop logic stays)
- Rewrite: `src/pages/ImportPage.tsx`

**Interfaces:**
- Consumes: `Button`, `PageHeader` (Task 4); `countRowsByCategory` (Task 3); `categoryShortLabel`, `resultCountLabel` (Task 3); `Meeting.resultCount` (Task 2).
- Produces: `DropZone` gains `compact?: boolean`. `StatTile(props: { value: number; label: string; children?: ReactNode })`.

- [ ] **Step 1: Create `src/components/import/StatTile.tsx`**

```tsx
/**
 * Responsabilité : tuile « grand chiffre + libellé » du résumé d'import (nageurs, clubs, catégories).
 * Appelé par : ImportPage.tsx.
 * Suppression casserait : le résumé chiffré du fichier importé.
 */
import type { ReactNode } from 'react';
import { formatPoints } from '@/lib/utils';

export interface StatTileProps {
  value: number;
  label: string;
  /** Shown under the label, e.g. one chip per category. */
  children?: ReactNode;
}

export function StatTile({ value, label, children }: StatTileProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-surface-header px-5 py-4">
      <span className="font-display text-[44px] font-bold leading-none tabular-nums text-marine">{formatPoints(value)}</span>
      <span className="text-[15px] text-ink-soft">{label}</span>
      {children && <div className="flex flex-wrap gap-1.5 pt-2">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Restyle `src/components/import/DropZone.tsx`**

Add `compact?: boolean;` to `DropZoneProps` (doc comment: `/** Smaller horizontal version, shown under a successful import. */`) and destructure it with a default `compact = false`. Add `import { Button } from '@/components/ui/Button';`. Keep every handler as is. Replace the returned JSX with:

```tsx
    <div
      role="button"
      tabIndex={0}
      aria-busy={state === 'processing'}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleBrowseClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          handleBrowseClick();
        }
      }}
      className={cn(
        'flex rounded-xl border-2 border-dashed bg-surface-raised transition-colors',
        compact ? 'items-center gap-5 px-8 py-6' : 'flex-col items-center justify-center gap-4 px-8 py-14 text-center',
        state === 'dragover' ? 'border-bassin-strong bg-bassin-soft' : 'border-line-strong',
        state === 'processing' ? 'cursor-wait' : 'cursor-pointer',
        className
      )}
    >
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleInputChange} />

      {state === 'processing' ? (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-bassin-strong" aria-hidden />
          <p className="text-base font-semibold text-ink">Analyse du fichier…</p>
        </>
      ) : (
        <>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-bassin-soft">
            <FileUp className="h-6 w-6 text-bassin-strong" aria-hidden />
          </span>
          <span className={cn('flex flex-col gap-0.5', compact && 'flex-1')}>
            <span className="text-[17px] font-semibold text-ink">
              {compact ? 'Nouvelle version du fichier ?' : 'Déposez le fichier CSV extraNat ici'}
            </span>
            <span className="text-[15px] text-ink-muted">
              {compact
                ? 'Glissez-la ici : les résultats de ce meeting seront mis à jour, sans doublons.'
                : "ou choisissez-le sur l'ordinateur."}
            </span>
          </span>
          <Button
            onClick={(event) => {
              event.stopPropagation();
              handleBrowseClick();
            }}
          >
            Parcourir…
          </Button>
        </>
      )}
    </div>
```

(« sans doublons » is true: `insertSwimmerResults` upserts per swimmer and category.)

- [ ] **Step 3: Rewrite `src/pages/ImportPage.tsx`**

Keep the header comment. Body:

```tsx
import { useCallback, useMemo, useState } from 'react';
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { DropZone } from '@/components/import/DropZone';
import { StatTile } from '@/components/import/StatTile';
import { Button } from '@/components/ui/Button';
import { countRowsByCategory } from '@/lib/csv-parser';
import { categoryShortLabel, resultCountLabel } from '@/lib/ui-labels';

// The parser's encoding ids, as a volunteer would read them.
const ENCODING_LABELS = { latin1: 'ISO-8859-1', 'utf-8': 'UTF-8' } as const;

export default function ImportPage(): JSX.Element {
  const { importState, meetingState } = useOutletContext<AppOutletContext>();
  const { result, fileName, error, handleFileAccepted, handleFileRejected } = importState;
  const { refresh } = meetingState;
  const [persistError, setPersistError] = useState<string | null>(null);
  const [isPersisting, setIsPersisting] = useState(false);
  const navigate = useNavigate();

  const meeting = meetingState.currentMeeting;
  const meetingId = meeting?.id ?? null;

  const handleAccepted = useCallback(
    async (file: File) => {
      setPersistError(null);
      const parsed = await handleFileAccepted(file);
      if (parsed && meetingId !== null) {
        setIsPersisting(true);
        try {
          await window.electronAPI.importCsv(meetingId, parsed.rows);
          // Reload meetings so resultCount (sidebar ✓, Accueil) reflects the import.
          await refresh();
        } catch (err) {
          setPersistError(err instanceof Error ? err.message : String(err));
        } finally {
          setIsPersisting(false);
        }
      }
    },
    [handleFileAccepted, meetingId, refresh]
  );

  const categoryCounts = useMemo(() => (result ? countRowsByCategory(result.rows) : []), [result]);

  if (!meeting) {
    return <Navigate to="/" replace />;
  }

  const imported = result !== null && persistError === null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        overline={meeting.name}
        title="Importer les résultats"
        subtitle="Fichier CSV de cotations exporté depuis extraNat (FFN)."
      />

      {error && <p className="text-sm text-error">{error}</p>}
      {persistError && <p className="text-sm text-error">Échec de l'enregistrement : {persistError}</p>}

      {imported && (
        <section aria-label="Résultat de l'import" className="flex flex-col gap-6 rounded-xl bg-surface-raised px-8 py-7 shadow-card">
          <div className="flex flex-wrap items-center gap-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-success-light">
              <Check className="h-7 w-7 text-success" strokeWidth={2.6} aria-hidden />
            </span>
            <div className="flex flex-1 flex-col gap-1">
              <p className="font-display text-3xl font-bold leading-none text-success">
                {isPersisting ? 'Enregistrement du fichier…' : 'Fichier importé et enregistré'}
              </p>
              <p className="text-[15px] text-ink-muted">{fileName}</p>
            </div>
            <Button variant="primary" size="lg" iconAfter={ArrowRight} disabled={isPersisting} onClick={() => navigate('/classement')}>
              Voir le classement
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <StatTile value={result.swimmerCount} label="nageurs" />
            <StatTile value={result.clubCount} label="clubs" />
            <StatTile value={result.categories.length} label="catégories">
              {categoryCounts.map(({ category, count }) => (
                <span key={category} className="rounded-full border border-line-strong bg-surface-raised px-2.5 py-0.5 text-sm text-ink">
                  {categoryShortLabel(category)} · {count}
                </span>
              ))}
            </StatTile>
          </div>

          {result.warnings.length > 0 && (
            <details className="text-sm text-warning">
              <summary className="cursor-pointer font-semibold">
                {result.warnings.length} avertissement{result.warnings.length > 1 ? 's' : ''}
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
                {result.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </details>
          )}

          <details className="text-sm text-ink-muted">
            <summary className="cursor-pointer font-semibold text-ink-soft">Détails techniques</summary>
            <p className="pt-2">
              Encodage détecté : {ENCODING_LABELS[result.encoding]} · séparateur : « {result.delimiter} » ·{' '}
              {result.rows.length} lignes lues
            </p>
          </details>
        </section>
      )}

      {!imported && meeting.resultCount > 0 && (
        <p className="rounded-lg bg-bassin-soft px-5 py-4 text-[15px] text-ink">
          {resultCountLabel(meeting.resultCount)} pour ce meeting. Un nouveau fichier les met à jour, sans doublons.
        </p>
      )}

      <DropZone compact={imported} onFileAccepted={handleAccepted} onFileRejected={handleFileRejected} />
    </div>
  );
}
```

Note: `result` is narrowed inside the `imported &&` block only through `imported`; if TypeScript complains that `result` may be null there, write the condition as `{result !== null && persistError === null && ( … )}` and keep `imported` for the two other uses.

- [ ] **Step 4: Verify and commit**

Run: `npx tsc --noEmit`, `npm run test` → pass.
Visual check with `test/fixtures/sample.csv`: green success card, tiles 211 / 38 / 3 with chips « Dames · 90 », « Messieurs · 121 », « Mixte · 211 »; the sidebar Import item gets its ✓ right after the import; « Détails techniques » is folded.

```bash
git add src/components/import src/pages/ImportPage.tsx
git commit -m "feat: redesign the Import screen"
```

---

### Task 8: Team ranking (Classement par équipes)

Canvas board: « Après — Classement par équipes ».

**Files:**
- Create: `src/components/ranking/PodiumCards.tsx`
- Rewrite: `src/components/ranking/CategoryTabs.tsx`, `RankingToolbar.tsx`, `TeamRankingTable.tsx`, `TeamRow.tsx`, `SwimmerDetail.tsx`, `src/pages/RankingPage.tsx`

**Interfaces:**
- Consumes: Task 3 labels (`placeLabel`, `formatGap`, `leaderRatio`, `birthLabel`, `countedSummary`, `categoryShortLabel`), Task 4 primitives, `formatRetainedSwimmers` (utils, from PR #11), `detectGender` (`src/lib/individual-ranking.ts`), `TeamResult`, `SwimmerEntry`, `filterTeamResultsByClub` (`src/lib/ranking-engine.ts`), `TOP_N_OPTIONS`, `TopN` (`src/hooks/use-ranking.ts`).
- Produces:
  - `CategoryTabs(props: { categories: string[]; active: string; onChange: (category: string) => void })` — same props as today.
  - `RankingToolbar(props: { categories: string[]; category: string; onCategoryChange: (c: string) => void; topN: TopN; onTopNChange: (t: TopN) => void; search: string; onSearchChange: (v: string) => void })`
  - `PodiumCards(props: { results: TeamResult[] })`
  - `TeamRankingTable(props: { results: TeamResult[]; category: string; search: string })`

- [ ] **Step 1: Rewrite `src/components/ranking/CategoryTabs.tsx`**

Keep the header comment, update « Appelé par » to `RankingToolbar.tsx, IndividualPage.tsx, PalmaresPage.tsx.`. Body:

```tsx
import { categoryShortLabel } from '@/lib/ui-labels';
import { Segmented } from '@/components/ui/Segmented';

export interface CategoryTabsProps {
  categories: string[];
  active: string;
  onChange: (category: string) => void;
}

export function CategoryTabs({ categories, active, onChange }: CategoryTabsProps): JSX.Element {
  const options = categories.map((category) => ({ value: category, label: categoryShortLabel(category) }));
  return <Segmented label="Catégorie" options={options} value={active} onChange={onChange} />;
}
```

- [ ] **Step 2: Rewrite `src/components/ranking/RankingToolbar.tsx`**

Update the header comment: « Responsabilité : filtres du classement par équipes (catégorie, nageurs comptés par club, recherche). Appelé par : RankingPage.tsx. Suppression casserait : le filtrage du classement. » Body:

```tsx
import { TOP_N_OPTIONS, type TopN } from '@/hooks/use-ranking';
import { FilterBar } from '@/components/layout/FilterBar';
import { Segmented } from '@/components/ui/Segmented';
import { SearchField } from '@/components/ui/SearchField';
import { CategoryTabs } from './CategoryTabs';

const TOP_N_SEGMENTS = TOP_N_OPTIONS.map((value) => ({ value, label: String(value) }));

export interface RankingToolbarProps {
  categories: string[];
  category: string;
  onCategoryChange: (category: string) => void;
  topN: TopN;
  onTopNChange: (topN: TopN) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

export function RankingToolbar({
  categories,
  category,
  onCategoryChange,
  topN,
  onTopNChange,
  search,
  onSearchChange,
}: RankingToolbarProps): JSX.Element {
  return (
    <FilterBar>
      <CategoryTabs categories={categories} active={category} onChange={onCategoryChange} />
      <Segmented label="Nageurs comptés par club" options={TOP_N_SEGMENTS} value={topN} onChange={onTopNChange} />
      <div className="ml-auto">
        <SearchField value={search} onChange={onSearchChange} placeholder="Rechercher un club" />
      </div>
    </FilterBar>
  );
}
```

- [ ] **Step 3: Create `src/components/ranking/PodiumCards.tsx`**

```tsx
/**
 * Responsabilité : les trois premiers clubs en cartes au-dessus du tableau, dans l'ordre de lecture 1-2-3.
 * Appelé par : RankingPage.tsx.
 * Suppression casserait : le résumé du podium sur l'écran de classement.
 */
import type { TeamResult } from '@/lib/ranking-engine';
import { formatGap, placeLabel } from '@/lib/ui-labels';
import { cn, formatPoints } from '@/lib/utils';
import { RankChip } from '@/components/ui/RankChip';

export interface PodiumCardsProps {
  /** The full ranking (not the search-filtered view): the podium never changes while searching. */
  results: TeamResult[];
}

// Left to right 1-2-3, not the 2-1-3 podium shape: people read left to right.
// The 1st card is wider and navy so it still stands out.
export function PodiumCards({ results }: PodiumCardsProps): JSX.Element | null {
  const podium = results.slice(0, 3);
  if (podium.length === 0) return null;
  const leaderPoints = podium[0].totalPoints;

  return (
    <section aria-label="Podium" className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4">
      {podium.map((team) => {
        const featured = team.rank === 1;
        return (
          <article
            key={team.club}
            className={cn(
              'flex min-w-0 flex-col gap-2.5 rounded-lg px-6 py-5',
              featured ? 'bg-marine text-on-marine shadow-raised' : 'bg-surface-raised text-ink shadow-card'
            )}
          >
            <div className="flex items-center gap-3">
              <RankChip rank={team.rank} size="lg" />
              <span
                className={cn(
                  'text-[13px] font-bold uppercase tracking-[0.08em]',
                  featured ? 'text-on-marine-muted' : 'text-ink-muted'
                )}
              >
                {placeLabel(team.rank)}
              </span>
            </div>
            <span className="break-words text-lg font-semibold">{team.club}</span>
            <div className="flex flex-wrap items-baseline gap-2">
              <span
                className={cn(
                  'font-display text-5xl font-bold leading-none tabular-nums',
                  featured ? 'text-on-marine' : 'text-marine'
                )}
              >
                {formatPoints(team.totalPoints)}
              </span>
              <span className={cn('text-[15px]', featured ? 'text-on-marine-muted' : 'text-ink-muted')}>
                {featured ? 'points' : `points · ${formatGap(team.totalPoints, leaderPoints)} du 1er`}
              </span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
```

- [ ] **Step 4: Rewrite `src/components/ranking/SwimmerDetail.tsx`**

Update the header comment: « Responsabilité : détail déplié d'un club : phrase de synthèse et cartes des nageurs comptés. Appelé par : TeamRow.tsx. » Body:

```tsx
import type { SwimmerEntry } from '@/lib/ranking-engine';
import { detectGender } from '@/lib/individual-ranking';
import { birthLabel, countedSummary } from '@/lib/ui-labels';
import { cn, formatPoints } from '@/lib/utils';

export interface SwimmerDetailProps {
  /** The swimmers counted in the total (top N slice). */
  swimmers: SwimmerEntry[];
  /** Swimmers the club entered in this category. */
  entered: number;
  /** Category name, e.g. "Classement Dames": tells "Né" from "Née". */
  category: string;
  isOwnClub: boolean;
}

export function SwimmerDetail({ swimmers, entered, category, isOwnClub }: SwimmerDetailProps): JSX.Element {
  const gender = detectGender(category);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-muted">{countedSummary(swimmers.length, entered)}</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
        {/* Keyed on array index: swimmers is a fresh, stable slice built by computeTeamRanking
            for this render and is never sorted/filtered afterwards; rank and names can repeat. */}
        {swimmers.map((swimmer, index) => (
          <div
            key={index}
            className={cn(
              'flex flex-col gap-0.5 rounded-md border bg-surface-raised px-4 py-3',
              isOwnClub ? 'border-corail-line' : 'border-line'
            )}
          >
            <span className="text-[15px] font-semibold text-ink">
              {swimmer.lastname.toUpperCase()} {swimmer.firstname}
            </span>
            <span className="text-[13px] text-ink-muted">{birthLabel(swimmer.birthyear, gender)}</span>
            <span className="font-display text-[22px] font-bold tabular-nums text-marine">
              {formatPoints(swimmer.points)} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Rewrite `src/components/ranking/TeamRow.tsx`**

Keep the header comment. Body:

```tsx
import { Fragment, memo } from 'react';
import { flexRender, type Row } from '@tanstack/react-table';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamResult } from '@/lib/ranking-engine';
import { SwimmerDetail } from './SwimmerDetail';

export interface TeamRowProps {
  row: Row<TeamResult>;
  category: string;
  isOwnClub: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

/** One club row in the ranking table, plus its expandable swimmer-detail row. */
function TeamRowComponent({ row, category, isOwnClub, isExpanded, onToggle }: TeamRowProps): JSX.Element {
  const cells = row.getVisibleCells();
  const team = row.original;

  return (
    <Fragment>
      {/* The whole row toggles on click (mouse); the chevron is the keyboard-accessible button. */}
      <tr
        onClick={onToggle}
        className={cn(
          'h-14 cursor-pointer border-t transition-colors',
          isOwnClub ? 'border-corail-line bg-corail-wash hover:bg-corail-soft' : 'border-line hover:bg-surface'
        )}
      >
        {cells.map((cell) => (
          <td key={cell.id} className="px-3 py-2 first:pl-5">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
        <td className="pr-5 text-right">
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? 'Masquer' : 'Voir'} les nageurs de ${team.club}`}
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-sm transition-colors',
              isOwnClub ? 'text-corail-strong hover:bg-corail-soft' : 'text-ink-muted hover:bg-surface-sunken'
            )}
          >
            <ChevronDown className={cn('h-5 w-5 transition-transform', isExpanded && 'rotate-180')} aria-hidden />
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr className={isOwnClub ? 'bg-corail-wash' : 'bg-surface'}>
          <td colSpan={cells.length + 1} className="pb-5 pl-[92px] pr-5 pt-1">
            <SwimmerDetail swimmers={team.swimmers} entered={team.swimmerCount} category={category} isOwnClub={isOwnClub} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}

export const TeamRow = memo(TeamRowComponent);
```

- [ ] **Step 6: Rewrite `src/components/ranking/TeamRankingTable.tsx`**

Keep the header comment. Body:

```tsx
import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { ASCN_CLUB_NAME, cn, formatPoints, formatRetainedSwimmers } from '@/lib/utils';
import { filterTeamResultsByClub, type TeamResult } from '@/lib/ranking-engine';
import { formatGap, leaderRatio } from '@/lib/ui-labels';
import { RankChip } from '@/components/ui/RankChip';
import { ClubTag } from '@/components/ui/ClubTag';
import { TeamRow } from './TeamRow';

export interface TeamRankingTableProps {
  /** The full ranking of the category; the search filter is applied here. */
  results: TeamResult[];
  category: string;
  search: string;
}

const columnHelper = createColumnHelper<TeamResult>();

const COLUMN_WIDTHS: Record<string, string> = {
  rank: 'w-[72px]',
  swimmerCount: 'w-[170px]',
  gap: 'w-[110px]',
  totalPoints: 'w-[240px]',
};
const RIGHT_ALIGNED = new Set(['gap', 'totalPoints']);

// TanStack Table's ColumnDef<TData, TValue> needs a shared TValue across heterogeneous
// columns; `any` here is the library's own documented pattern for a mixed column array.
function buildColumns(leaderPoints: number): ColumnDef<TeamResult, any>[] {
  return [
    columnHelper.accessor('rank', {
      header: 'Rang',
      cell: (info) => <RankChip rank={info.getValue()} />,
    }),
    columnHelper.accessor('club', {
      header: 'Club',
      cell: (info) => (
        <span className="flex flex-wrap items-center gap-2.5 text-base font-semibold text-ink">
          {info.getValue()}
          {info.getValue() === ASCN_CLUB_NAME && <ClubTag />}
        </span>
      ),
    }),
    columnHelper.accessor('swimmerCount', {
      header: 'Nageurs',
      cell: (info) => (
        <span className="text-sm text-ink-muted">
          {formatRetainedSwimmers(info.row.original.swimmers.length, info.getValue())}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'gap',
      header: 'Écart',
      cell: (info) => (
        <span className="block text-right text-[15px] tabular-nums text-ink-muted">
          {formatGap(info.row.original.totalPoints, leaderPoints)}
        </span>
      ),
    }),
    columnHelper.accessor('totalPoints', {
      header: 'Points',
      cell: (info) => {
        const isOwnClub = info.row.original.club === ASCN_CLUB_NAME;
        const width = `${Math.round(leaderRatio(info.getValue(), leaderPoints) * 100)}%`;
        return (
          <span className="flex items-center justify-end gap-3.5">
            {/* The bar shows the gap to the 1st at a glance, without reading numbers. */}
            <span className={cn('block h-1.5 w-[120px] rounded-full', isOwnClub ? 'bg-corail-line' : 'bg-line')}>
              <span
                className={cn('block h-1.5 rounded-full', isOwnClub ? 'bg-corail' : 'bg-bassin')}
                style={{ width }}
              />
            </span>
            <span className="min-w-[64px] text-right font-display text-[23px] font-bold tabular-nums text-ink">
              {formatPoints(info.getValue())}
            </span>
          </span>
        );
      },
    }),
  ];
}

export function TeamRankingTable({ results, category, search }: TeamRankingTableProps): JSX.Element {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => filterTeamResultsByClub(results, search), [results, search]);
  // Gaps and bars compare every club to the 1st of the whole ranking, not of the filtered view.
  const leaderPoints = results[0]?.totalPoints ?? 0;
  const columns = useMemo(() => buildColumns(leaderPoints), [leaderPoints]);

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (team) => team.club,
  });

  function toggle(club: string): void {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(club)) {
        next.delete(club);
      } else {
        next.add(club);
      }
      return next;
    });
  }

  if (filtered.length === 0) {
    return (
      <p className="rounded-lg bg-surface-raised p-8 text-center text-[15px] text-ink-muted shadow-card">
        {search.trim() !== '' ? 'Aucun club ne correspond à la recherche.' : 'Aucun classement pour cette catégorie.'}
      </p>
    );
  }

  return (
    <section aria-label="Classement complet" className="overflow-hidden rounded-lg bg-surface-raised shadow-card">
      <table className="w-full table-fixed border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="h-11 bg-surface-header text-left text-[13px] font-bold uppercase tracking-[0.06em] text-ink-muted">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className={cn('px-3 first:pl-5', COLUMN_WIDTHS[header.id], RIGHT_ALIGNED.has(header.id) && 'text-right')}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
              <th scope="col" className="w-14 pr-5">
                <span className="sr-only">Détail</span>
              </th>
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <TeamRow
              key={row.id}
              row={row}
              category={category}
              isOwnClub={row.original.club === ASCN_CLUB_NAME}
              isExpanded={expanded.has(row.original.club)}
              onToggle={() => toggle(row.original.club)}
            />
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 7: Rewrite `src/pages/RankingPage.tsx`**

Keep the header comment and the data logic (`useMeetingRows`, `resolveActiveCategories`, `useRanking`, `usePrintExport`, guards). Replace the imports of UI pieces and the returned JSX:

```tsx
import { useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { Download, FileSpreadsheet } from 'lucide-react';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { useMeetingRows } from '@/hooks/use-meeting-rows';
import { useRanking } from '@/hooks/use-ranking';
import { usePrintExport } from '@/hooks/use-print-export';
import { resolveActiveCategories } from '@/lib/ranking-engine';
import { categoryShortLabel } from '@/lib/ui-labels';
import { Button } from '@/components/ui/Button';
import { RankingToolbar } from '@/components/ranking/RankingToolbar';
import { PodiumCards } from '@/components/ranking/PodiumCards';
import { TeamRankingTable } from '@/components/ranking/TeamRankingTable';
```

Guard branches become:

```tsx
  if (isLoading) {
    return <p className="text-[15px] text-ink-muted">Chargement du classement…</p>;
  }
  if (rowsError) {
    return <p className="text-sm text-error">{rowsError}</p>;
  }
```

Final return:

```tsx
  const clubCount = ranking.teamResults.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        overline={meeting.name}
        title="Classement par équipes"
        subtitle={`${categoryShortLabel(ranking.category)} · ${ranking.topN} meilleurs nageurs par club · ${clubCount} ${clubCount >= 2 ? 'clubs classés' : 'club classé'}`}
        actions={
          <>
            <Button
              icon={FileSpreadsheet}
              disabled={isExporting}
              onClick={() => exportExcel(meeting, ranking.category, ranking.teamResults)}
            >
              Excel
            </Button>
            {/* PDF is the primary action: it is what gets printed and posted by the pool. */}
            <Button
              variant="primary"
              icon={Download}
              disabled={isExporting}
              onClick={() => exportPdf(meeting, ranking.category, ranking.teamResults)}
            >
              Exporter en PDF
            </Button>
          </>
        }
      />
      <RankingToolbar
        categories={categories}
        category={ranking.category}
        onCategoryChange={ranking.setCategory}
        topN={ranking.topN}
        onTopNChange={ranking.setTopN}
        search={search}
        onSearchChange={setSearch}
      />
      {error && <p className="text-sm text-error">{error}</p>}
      <PodiumCards results={ranking.teamResults} />
      <TeamRankingTable results={ranking.teamResults} category={ranking.category} search={search} />
    </div>
  );
```

The meeting status badge that `RankingToolbar` used to show is gone on purpose: the status now lives in the sidebar card only (it was shown twice).

- [ ] **Step 8: Verify and commit**

Run: `npx tsc --noEmit`, `npm run test` → pass.
Visual check with the fixture, Mixte, 5 nageurs: podium cards CN VIRY-CHÂTILLON 5 841 · BOULOGNE BILLANCOURT NATATION 5 364 (−477 du 1er) · AC CHERBOURG EN COTENTIN 5 201 (−640 du 1er); AS CHERBOURG NATATION row 7 has the coral tint, « Notre club », −1 106, and expands to 5 cards with « 25 autres nageurs du club ne comptent pas dans le total »; Tab reaches each chevron; the search filters rows but not the podium; both exports still work.

```bash
git add src/components/ranking src/pages/RankingPage.tsx
git commit -m "feat: redesign the team ranking screen"
```

---

### Task 9: Individual ranking (Individuels)

Same patterns as Task 8; there is no canvas board for this screen.

**Files:**
- Rewrite: `src/components/ranking/IndividualRankingTable.tsx`, `src/pages/IndividualPage.tsx`

**Interfaces:**
- Consumes: `PageHeader`, `FilterBar`, `Button`, `SearchField`, `RankChip`, `ClubTag` (Task 4); `CategoryTabs` (Task 8); `categoryShortLabel` (Task 3).
- Produces: `IndividualRankingTable(props: { results: IndividualResult[]; prizeCount: number; search: string })`. The `showCategory` prop and `categoryBadgeLabel` are removed (the page always passed `false`).

- [ ] **Step 1: Rewrite `src/components/ranking/IndividualRankingTable.tsx`**

Update the header comment's « Appelé par » if needed (`IndividualPage.tsx`). Body:

```tsx
import { useMemo } from 'react';
import { ASCN_CLUB_NAME, cn, formatPoints } from '@/lib/utils';
import type { IndividualResult } from '@/lib/individual-ranking';
import { RankChip } from '@/components/ui/RankChip';
import { ClubTag } from '@/components/ui/ClubTag';

export interface IndividualRankingTableProps {
  results: IndividualResult[];
  /** The first N swimmers get a prize tag (« 1er Prix », « 2e Prix »). */
  prizeCount: number;
  search: string;
}

export function IndividualRankingTable({ results, prizeCount, search }: IndividualRankingTableProps): JSX.Element {
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return results;
    return results.filter(
      (r) =>
        r.lastname.toLowerCase().includes(query) ||
        r.firstname.toLowerCase().includes(query) ||
        r.club.toLowerCase().includes(query)
    );
  }, [results, search]);

  if (filtered.length === 0) {
    return (
      <p className="rounded-lg bg-surface-raised p-8 text-center text-[15px] text-ink-muted shadow-card">
        {search.trim() ? 'Aucun nageur ne correspond à la recherche.' : 'Aucun résultat individuel.'}
      </p>
    );
  }

  return (
    <section aria-label="Classement individuel" className="overflow-hidden rounded-lg bg-surface-raised shadow-card">
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="h-11 bg-surface-header text-left text-[13px] font-bold uppercase tracking-[0.06em] text-ink-muted">
            <th scope="col" className="w-[190px] pl-5 pr-3">Rang</th>
            <th scope="col" className="px-3">Nom</th>
            <th scope="col" className="w-[90px] px-3">Année</th>
            <th scope="col" className="px-3">Club</th>
            <th scope="col" className="w-[130px] pl-3 pr-5 text-right">Points</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => {
            const isOwnClub = r.club === ASCN_CLUB_NAME;
            return (
              <tr
                key={`${r.lastname}-${r.firstname}-${r.birthyear}-${r.club}`}
                className={cn('h-14 border-t', isOwnClub ? 'border-corail-line bg-corail-wash' : 'border-line')}
              >
                <td className="py-2 pl-5 pr-3">
                  <span className="flex items-center gap-2">
                    <RankChip rank={r.rank} />
                    {r.rank <= prizeCount && (
                      <span className="whitespace-nowrap rounded-full bg-corail-soft px-2.5 py-0.5 text-xs font-bold text-corail-strong">
                        {r.rank === 1 ? '1er Prix' : `${r.rank}e Prix`}
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-3 py-2 text-base font-semibold text-ink">
                  {r.lastname} {r.firstname}
                </td>
                <td className="px-3 py-2 text-[15px] tabular-nums text-ink-muted">{r.birthyear}</td>
                <td className="px-3 py-2">
                  <span className="flex flex-wrap items-center gap-2.5 text-[15px] text-ink">
                    {r.club}
                    {isOwnClub && <ClubTag />}
                  </span>
                </td>
                <td className="py-2 pl-3 pr-5 text-right font-display text-[23px] font-bold tabular-nums text-ink">
                  {formatPoints(r.points)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 2: Rewrite the JSX of `src/pages/IndividualPage.tsx`**

Keep the header comment, `PRIZE_COUNT`, the data hooks and guards. Add `const [search, setSearch] = useState('');` next to `activeCategory`. Imports:

```tsx
import { useMemo, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { Download, FileSpreadsheet } from 'lucide-react';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterBar } from '@/components/layout/FilterBar';
import { useMeetingRows } from '@/hooks/use-meeting-rows';
import { useIndividualExport } from '@/hooks/use-individual-export';
import { computeIndividualRanking, filterByCategory } from '@/lib/individual-ranking';
import { categoryShortLabel } from '@/lib/ui-labels';
import { Button } from '@/components/ui/Button';
import { SearchField } from '@/components/ui/SearchField';
import { CategoryTabs } from '@/components/ranking/CategoryTabs';
import { IndividualRankingTable } from '@/components/ranking/IndividualRankingTable';
```

Guards: `if (isLoading) return <p className="text-[15px] text-ink-muted">Chargement…</p>;` (error guard unchanged). Return:

```tsx
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        overline={meeting.name}
        title="Classement individuel"
        subtitle={`${categoryShortLabel(currentCategory)} · ${displayedResults.length} nageurs`}
        actions={
          <>
            <Button
              icon={FileSpreadsheet}
              disabled={isExporting || displayedResults.length === 0}
              onClick={() => void exportExcel(meeting, currentCategory, displayedResults)}
            >
              Excel
            </Button>
            <Button
              variant="primary"
              icon={Download}
              disabled={isExporting || displayedResults.length === 0}
              onClick={() => void exportPdf(meeting, currentCategory, displayedResults)}
            >
              Exporter en PDF
            </Button>
          </>
        }
      />
      <FilterBar>
        <CategoryTabs categories={categories} active={currentCategory} onChange={setActiveCategory} />
        <div className="ml-auto">
          <SearchField value={search} onChange={setSearch} placeholder="Rechercher un nageur ou un club" />
        </div>
      </FilterBar>
      {exportError && <p className="text-sm text-error">{exportError}</p>}
      <IndividualRankingTable results={displayedResults} prizeCount={PRIZE_COUNT} search={search} />
    </div>
  );
```

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit`, `npm run test` → pass.
Visual check: ranks 1–3 in medal colours, « 1er Prix » / « 2e Prix » tags, ASCN swimmers tinted with « Notre club », search filters by name or club, exports work.

```bash
git add src/components/ranking/IndividualRankingTable.tsx src/pages/IndividualPage.tsx
git commit -m "feat: redesign the individual ranking screen"
```

---

### Task 10: Palmarès des rigolos

Canvas board: « Après — Palmarès des rigolos ».

**Files:**
- Modify: `src/lib/fun-awards.ts`, `test/fun-awards.test.ts`
- Rewrite: `src/components/ranking/FunAwardsGrid.tsx`, `src/pages/PalmaresPage.tsx`

**Interfaces:**
- Produces: `FunAward.icon: FunAwardIcon` replaces `FunAward.emoji: string`; `export type FunAwardIcon = 'hourglass' | 'sprout' | 'duo' | 'camera' | 'crown' | 'zap';`. The lib names the icon (keeping `src/lib` free of React); `FunAwardsGrid` decides how it looks.

- [ ] **Step 1: Write the failing test**

In `test/fun-awards.test.ts`, in `'each award has required fields'`, replace `expect(award.emoji).toBeTruthy();` with `expect(award.icon).toBe(EXPECTED_ICONS[award.id]);` and add near the top of the file (after the imports):

```ts
// One Lucide icon per prize (no emoji in the interface).
const EXPECTED_ICONS: Record<string, string> = {
  doyen: 'hourglass',
  releve: 'sprout',
  'duo-mixte': 'duo',
  'photo-finish': 'camera',
  'club-anciens': 'crown',
  'jeune-garde': 'zap',
};
```

Run: `npx vitest run test/fun-awards.test.ts` → FAIL (`expected undefined to be 'hourglass'`).

- [ ] **Step 2: Implement in `src/lib/fun-awards.ts`**

Replace `emoji: string;` in `FunAward` with:

```ts
  /** Icon key; FunAwardsGrid maps it to a Lucide icon and a colour. */
  icon: FunAwardIcon;
```

and add above the interface:

```ts
export type FunAwardIcon = 'hourglass' | 'sprout' | 'duo' | 'camera' | 'crown' | 'zap';
```

Replace the six `emoji:` lines: `doyen` → `icon: 'hourglass',` (both genders), `releve` → `icon: 'sprout',`, `duo-mixte` → `icon: 'duo',`, `photo-finish` → `icon: 'camera',`, `club-anciens` → `icon: 'crown',`, `jeune-garde` → `icon: 'zap',`.

Run: `npm run test` → PASS.

- [ ] **Step 3: Rewrite `src/components/ranking/FunAwardsGrid.tsx`**

Update the header comment's « Appelé par » to `PalmaresPage.tsx.`. Body:

```tsx
import { Camera, Crown, Hourglass, Sprout, UsersRound, Zap, type LucideIcon } from 'lucide-react';
import type { FunAward, FunAwardIcon } from '@/lib/fun-awards';
import { cn } from '@/lib/utils';

const ICONS: Record<FunAwardIcon, { Icon: LucideIcon; tone: string }> = {
  hourglass: { Icon: Hourglass, tone: 'bg-corail-wash text-corail-strong' },
  sprout: { Icon: Sprout, tone: 'bg-success-light text-success' },
  duo: { Icon: UsersRound, tone: 'bg-bassin-soft text-bassin-strong' },
  camera: { Icon: Camera, tone: 'bg-bassin-soft text-bassin-strong' },
  crown: { Icon: Crown, tone: 'bg-warning-light text-warning' },
  zap: { Icon: Zap, tone: 'bg-marine-soft text-marine' },
};

export interface FunAwardsGridProps {
  awards: FunAward[];
}

export function FunAwardsGrid({ awards }: FunAwardsGridProps): JSX.Element {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
      {awards.map((award) => {
        const { Icon, tone } = ICONS[award.icon];
        return (
          <article key={award.id} className="flex flex-col gap-3.5 rounded-xl bg-surface-raised p-6 shadow-card">
            <div className="flex items-center gap-3.5">
              <span className={cn('flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px]', tone)}>
                <Icon className="h-[26px] w-[26px]" aria-hidden />
              </span>
              <h2 className="font-display text-[28px] font-bold leading-tight text-marine">{award.title}</h2>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xl font-semibold text-ink">{award.winner.name}</span>
              {/* Club prizes use the club as the winner's name: don't print it twice. */}
              {award.winner.club !== award.winner.name && (
                <span className="text-[15px] font-medium text-bassin-strong">{award.winner.club}</span>
              )}
            </div>
            <span className="self-start rounded-full bg-surface-sunken px-3 py-1 text-sm font-semibold text-ink-soft">
              {award.winner.detail}
            </span>
          </article>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Rewrite the JSX of `src/pages/PalmaresPage.tsx`**

Keep the header comment and data logic. Add `import { PageHeader } from '@/components/layout/PageHeader';`. Loading guard: `<p className="text-[15px] text-ink-muted">Chargement…</p>`. Return:

```tsx
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        overline={meeting.name}
        title="Palmarès des rigolos"
        subtitle="Prix humoristiques calculés automatiquement à partir des résultats."
        actions={<CategoryTabs categories={categories} active={currentTab} onChange={setActiveCategory} />}
      />
      {awards.length === 0 ? (
        <p className="text-[15px] text-ink-muted">Aucun prix disponible pour cette catégorie.</p>
      ) : (
        <FunAwardsGrid awards={awards} />
      )}
    </div>
  );
```

- [ ] **Step 5: Verify and commit**

Run: `npx tsc --noEmit`, `npm run test` → pass.
Visual check (fixture, Mixte): Le Doyen — BRACHET Robert, EXOCET MASTER CLUB, « Né en 1938 (88 ans) »; Le Club des Anciens shows EXOCET MASTER CLUB once; no emoji anywhere.

```bash
git add src/lib/fun-awards.ts test/fun-awards.test.ts src/components/ranking/FunAwardsGrid.tsx src/pages/PalmaresPage.tsx
git commit -m "feat: replace fun award emoji with icons and redesign the Palmarès"
```

---

### Task 11: Paramètres and update toast

No canvas board; apply the same system. Logic does not change.

**Files:**
- Modify: `src/pages/SettingsPage.tsx`, `src/components/settings/SettingsForm.tsx`, `src/components/settings/BackupSection.tsx`, `src/components/settings/BackupConfigSection.tsx`, `src/components/layout/UpdateToast.tsx`

**Interfaces:**
- Consumes: `PageHeader`, `Button`, `Segmented` (Task 4).

- [ ] **Step 1: `SettingsPage.tsx`**

Replace the `<header>…</header>` block with `<PageHeader overline={meeting?.name} title="Paramètres" />` (import it), the outer `space-y-6` with `flex flex-col gap-6`, and the no-meeting paragraph class with `text-[15px] text-ink-muted`.

- [ ] **Step 2: `SettingsForm.tsx` status toggle → `Segmented`**

Replace the whole « Statut » `<div>` (label span + the `.map` of two buttons) with:

```tsx
          <Segmented
            label="Statut"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(next) => {
              setStatus(next);
              setSavedAt(null);
            }}
          />
```

and add at module level (after the imports):

```tsx
const STATUS_OPTIONS = [
  { value: 'provisional', label: 'Provisoire' },
  { value: 'final', label: 'Définitif' },
] as const;
```

If TypeScript infers `value` too narrowly or too widely for `setStatus`, type it as `ReadonlyArray<SegmentedOption<MeetingStatus>>` (import `SegmentedOption` from `@/components/ui/Segmented` and `MeetingStatus` from `@/lib/db`). Remove `cn` from the imports if it is no longer used.

- [ ] **Step 3: Class migration in the settings files and `UpdateToast.tsx`**

Apply this table to every `className` in the five files. Replace action `<button>`s with `<Button>` (keep `type`, `onClick`, `disabled` and the icon, passed as `icon={…}`):

| Old | New |
| --- | --- |
| card `rounded-lg bg-neutral-0 p-6 shadow-card` | `rounded-lg bg-surface-raised p-6 shadow-card` |
| section `h2` `font-display text-sm font-semibold uppercase tracking-wide text-primary-800` | `font-display text-2xl font-bold text-marine` |
| label `block text-xs font-medium uppercase tracking-wide text-neutral-600` (or `-500`) | `block text-sm font-semibold text-ink` |
| input `… border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-secondary-400 focus:outline-none` | `mt-1.5 h-11 w-full rounded-sm border-[1.5px] border-line-strong px-3.5 text-base text-ink outline-none focus:border-bassin-strong` |
| main save / export / restore button (`bg-secondary-*` + `text-neutral-0`) | `<Button variant="primary">` |
| « Parcourir » / other outlined buttons | `<Button>` (secondary) |
| text link button `text-secondary-700 hover:underline` | `text-sm font-semibold text-bassin-strong underline-offset-2 hover:underline` |
| `text-neutral-700` | `text-ink` |
| `text-neutral-600` | `text-ink-muted` |
| `text-neutral-400` (disabled checkbox label) | `text-ink-muted opacity-60` |
| checkbox `border-neutral-300 text-secondary-600 focus:ring-secondary-400` | `h-5 w-5 accent-[var(--color-marine)]` |
| destructive confirm `bg-error … text-neutral-0` | keep `bg-error`, use `text-on-marine` and `h-11 rounded-sm px-5 font-semibold` |
| `UpdateToast` container `bg-primary-900 … text-neutral-0` | `bg-marine-deep … text-on-marine` |
| `UpdateToast` icon `text-secondary-400` | `text-on-marine-faint` |
| `UpdateToast` « Redémarrer maintenant » (`bg-secondary-800 …`) | `h-11 rounded-sm bg-surface-raised px-4 text-sm font-semibold text-marine hover:bg-marine-soft` |
| `UpdateToast` « Plus tard » `text-neutral-300 hover:text-neutral-0` | `h-11 rounded-sm px-4 text-sm font-semibold text-on-marine-subtle hover:text-on-marine` |
| `bg-error-light`, `text-error`, `text-success`, `text-warning` | unchanged |

When done, this must print nothing:

```bash
grep -nE "(primary|secondary|accent|neutral)-[0-9]|font-mono" src/pages/SettingsPage.tsx src/components/settings/*.tsx src/components/layout/UpdateToast.tsx
```

- [ ] **Step 4: Verify and commit**

Run: `npx tsc --noEmit`, `npm run test` → pass.
Visual check: Paramètres with and without an open meeting; save shows « Paramètres enregistrés. »; backup export and the restore preview still work; the update toast can be previewed by temporarily calling its state setter in DevTools (do not commit that).

```bash
git add src/pages/SettingsPage.tsx src/components/settings src/components/layout/UpdateToast.tsx
git commit -m "feat: apply the redesign to Paramètres and the update toast"
```

---

### Task 12: Remove the old system, guard it, update the docs

**Files:**
- Create: `test/no-legacy-tokens.test.ts`
- Modify: `tailwind.config.ts`, `src/styles/globals.css`, `docs/design-system.md`, `docs/screens.md`, `CLAUDE.md`
- Delete: `src/components/ranking/GenderTabs.tsx` (unused: `grep -rn "GenderTabs" src` finds only the file itself — check before deleting)

- [ ] **Step 1: Write the guard test**

```ts
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// Phase 11 replaced the primary/secondary/accent/neutral palettes and the mono
// font with the « Tableau de bassin » tokens. This fails if one comes back.
const LEGACY = /\b(?:bg|text|border|ring|divide|from|to|via|fill|stroke|outline|accent|placeholder|shadow)-(?:primary|secondary|accent|neutral)-\d{1,3}\b|\bfont-mono\b/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx|ts|css)$/.test(name) ? [full] : [];
  });
}

describe('legacy design tokens', () => {
  it('are no longer used in the renderer', () => {
    const offenders = sourceFiles('src').filter((file) => LEGACY.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
```

Run: `npx vitest run test/no-legacy-tokens.test.ts`. `src/styles/globals.css` is expected in the list at this point (its `.font-mono` rule goes in Step 2). If it lists other files, migrate them with the Task 11 table (typical leftovers: loading paragraphs, error boundaries, `App.tsx`). Stop and report if a leftover is in `src/lib/pdf-export.tsx` or another export file: those use react-pdf styles, not Tailwind, and are out of scope.

- [ ] **Step 2: Delete the old tokens**

- `tailwind.config.ts`: delete the `primary`, `secondary`, `accent`, `neutral` color entries and `fontFamily.mono`; delete `boxShadow['card-hover']` and `boxShadow.dropdown` if `grep -rn "shadow-card-hover\|shadow-dropdown" src` finds nothing; delete `spacing['4.5']`, `spacing['13']`, `spacing['15']` if unused (grep `-4.5\b`, `-13\b`, `-15\b` in `src` first).
- `globals.css`: delete the `--color-primary-*`, `--color-secondary-*`, `--color-accent-*` blocks and the `--color-neutral-*` block; delete `--shadow-card-hover` / `--shadow-dropdown` if their Tailwind entries were deleted. Keep `--color-medal-*`, the semantic colours and `--shadow-card`. In `@layer base`, change `.font-mono, [data-numeric]` to just `[data-numeric]`.
- `git rm src/components/ranking/GenderTabs.tsx`.

Run: `npx tsc --noEmit`, `npm run test` (the guard and contrast tests included) → pass. `npm run dev`: click through every screen once; nothing should have lost its colour (a missing colour means a class still points at a deleted token — `grep` for it and migrate it).

- [ ] **Step 3: Update the living docs**

`docs/design-system.md`: rewrite with the Task 1 token list (name, hex, usage), fonts (Barlow Condensed for titles and numbers, Barlow for text, bundled in `src/assets/fonts/`, no network), radii, shadows, touch sizes, the contrast rules from Global Constraints, the `src/components/ui/` primitives, and a link to the design system artifact https://claude.ai/artifact/4hd1YLZVKGhsRcjB2kjiya.

`docs/screens.md`: update Accueil (Reprendre card, list with result counts, always-visible form, steps), Import (success card, tiles, folded technical details, compact drop zone, existing results note), Classement (header exports with PDF primary, filter card, podium 1-2-3, table with gap/bar/« N retenus sur M », own club tint, keyboard chevron), Individuels (same patterns, prize tags), Palmarès (icon cards), and add a « Barre latérale » section (meeting card, Données/Résultats sections, greyed items, ✓ after import, version).

`CLAUDE.md`:
- In « Design System », replace the colour table and the « Typographie » and « Composants » lists with a short summary: tokens `marine` / `bassin` (+`bassin-strong` for text) / `corail` (+`corail-strong` for text) / `ink` / `surface` / `line`, medals with ink digits, Barlow Condensed + Barlow (bundled), radii 8/10/12/16, 44 px targets, link to `docs/design-system.md` and the design system artifact.
- In « Plan de construction », add the row `| 11 | Refonte visuelle « Tableau de bassin » — tokens, polices embarquées, barre latérale, podium, écrans Accueil/Import/Classement/Individuels/Palmarès/Paramètres | Interface lisible au bord du bassin |` and add this plan's path to the « Détail des phases » note.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove the pre-redesign palette and fonts, update design docs"
```

- [ ] **Step 5: Open the PR**

Follow `.ai/pull-request.md` exactly: run the `/humanizer` skill on the new user-facing French texts (they are listed in Tasks 3, 5–10), run `npx tsc --noEmit` and `npm run test`, push `feat/phase-11-redesign`, open the PR with the title `feat: redesign the interface (Tableau de bassin)` and a body listing the screens, the new tokens and the checks, then request the isolated `/code-review` required by the PR rules. Do not merge.

---

## Self-Review Notes

- Spec coverage: tokens/contrast (T1), offline fonts (T1), sidebar with meeting card, ✓ and greyed items (T2, T5), Accueil resume + counts (T2, T6), Import success/tiles/folded details (T7), ranking header/PDF primary/filters/podium 1-2-3/table/drill-down/own club (T8), Individuels (T9), Palmarès without emoji (T10), Paramètres (T11), cleanup and docs (T12). « Mode annonce » was dropped by the user and is intentionally absent.
- Values differ from the first design-system draft on two tokens, on purpose: `corail-strong` is `#B3390A` (the draft's `#C2410C` gave 4.2:1 on `corail-soft`) and `line-strong` is `#8394A6` (the draft's `#C5D0DB` gave 1.6:1 for control borders). The contrast test in Task 1 enforces both.

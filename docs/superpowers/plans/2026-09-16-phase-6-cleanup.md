# Phase 6 — Refactoring & Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all print functionality, rename `print-data.ts` to `export-data.ts`, add header comments to all files, enforce the 300-line file limit, sweep dead code, restructure documentation into living docs, and update CLAUDE.md.

**Architecture:** This is a cleanup phase — no new features. The print screen, print components, and print button are removed. The `print-data.ts` module is renamed because it's still used by PDF/Excel exports and `MeetingCard`. Documentation is restructured from phase-based specs into living docs that describe the current app state.

**Tech Stack:** React 18 + TypeScript (strict), Tailwind CSS, Vitest. No new dependencies.

## Global Constraints

- TypeScript `strict: true`, no `any` — use `unknown` + type guards.
- Components: `PascalCase.tsx`; hooks: `use-kebab-case.ts`; lib: `kebab-case.ts`.
- UI entirely in French, French punctuation (espace insécable avant `:`, `;`, `!`, `?`).
- Every file must have a header comment: what it does, who calls it, what breaks if deleted.
- One file = one responsibility. Never exceed 300 lines per file.
- Never leave dead code: no unused imports, variables, functions, or commented-out code.
- Run `npm run test` and `npm run lint` (`tsc -b --noEmit`) after each task; both must pass before committing.

---

### Task 1: Remove print page, print components, and print route

**Files:**
- Delete: `src/pages/PrintPage.tsx`
- Delete: `src/components/print/PrintPreview.tsx`
- Delete: `src/components/print/PrintControls.tsx`
- Delete: `src/components/print/A4Page.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: clean route config and sidebar without `/impression`

- [ ] **Step 1: Delete the four print files**

Delete these files:
```
src/pages/PrintPage.tsx
src/components/print/PrintPreview.tsx
src/components/print/PrintControls.tsx
src/components/print/A4Page.tsx
```

- [ ] **Step 2: Remove the print route from App.tsx**

Current `src/App.tsx`:
```typescript
import PrintPage from '@/pages/PrintPage';
// ...
<Route path="impression" element={<PrintPage />} />
```

Remove the `PrintPage` import and the `<Route path="impression" ...>` line. The file should become:

```typescript
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import HomePage from '@/pages/HomePage';
import ImportPage from '@/pages/ImportPage';
import RankingPage from '@/pages/RankingPage';
import SettingsPage from '@/pages/SettingsPage';

export default function App(): JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="classement" element={<RankingPage />} />
          <Route path="parametres" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
```

- [ ] **Step 3: Remove the Impression nav entry from Sidebar.tsx**

In `src/components/layout/Sidebar.tsx`, remove from `NAV_ITEMS`:
```typescript
{ to: '/impression', label: 'Impression', icon: Printer },
```

Also remove the `Printer` import from Lucide:
```typescript
// Before:
import { Home, Printer, Settings, Trophy, Upload } from 'lucide-react';
// After:
import { Home, Settings, Trophy, Upload } from 'lucide-react';
```

- [ ] **Step 4: Run tests and lint**

Run: `npm run test`
Expected: PASS (print tests may fail — handle in next step)

Run: `npm run lint`
Expected: PASS

- [ ] **Step 5: Delete the empty print components directory**

```bash
rmdir src/components/print
```

If tests reference deleted print files, those test files are handled in the next task.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove print page, print components, and impression route"
```

---

### Task 2: Remove print button from RankingToolbar and A4Page from RankingPage

**Files:**
- Modify: `src/components/ranking/RankingToolbar.tsx`
- Modify: `src/pages/RankingPage.tsx`
- Modify: `src/styles/globals.css`

**Interfaces:**
- Consumes: `RankingToolbar` loses `onPrint` prop
- Produces: `RankingToolbarProps` without `onPrint`; `RankingPage` without hidden `A4Page`

- [ ] **Step 1: Remove onPrint from RankingToolbar**

In `src/components/ranking/RankingToolbar.tsx`:

1. Remove `onPrint` from `RankingToolbarProps`:
```typescript
export interface RankingToolbarProps {
  topN: TopN;
  onTopNChange: (topN: TopN) => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  isExporting: boolean;
}
```

2. Remove `onPrint` from the destructured props.

3. Remove the "Imprimer" button entirely:
```typescript
// DELETE this block:
<button type="button" onClick={onPrint} ...>
  <Printer ... />
  Imprimer
</button>
```

4. Remove the `Printer` import from Lucide:
```typescript
// Before:
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
// After:
import { Download, FileSpreadsheet } from 'lucide-react';
```

- [ ] **Step 2: Clean up RankingPage.tsx**

In `src/pages/RankingPage.tsx`:

1. Remove the `A4Page` import (already deleted).
2. Remove the `buildPrintMeta` import and `useMemo` for `meta` — it was only used by the hidden `A4Page` for `window.print()`. The `usePrintExport` hook calls `buildPrintMeta` internally when exporting, so the page doesn't need it.
3. Remove the hidden `<A4Page>` block at the bottom:
```typescript
// DELETE this entire block:
{meta && (
  <div className="fixed -left-[9999px] top-0 print:static print:left-auto print:top-auto">
    <A4Page meta={meta} category={ranking.category} results={ranking.teamResults} />
  </div>
)}
```
4. Remove `onPrint={() => window.print()}` from the `<RankingToolbar>` call.
5. Remove the `useMemo` import if no longer used (check if `useMemo` is still needed — it was only used for `meta`). Keep `useState` if still used for `search`.

The `<RankingToolbar>` call becomes:
```typescript
<RankingToolbar
  topN={ranking.topN}
  onTopNChange={ranking.setTopN}
  onExportPdf={() => exportPdf(meeting, ranking.category, ranking.teamResults)}
  onExportExcel={() => exportExcel(meeting, ranking.category, ranking.teamResults)}
  isExporting={isExporting}
/>
```

- [ ] **Step 3: Remove print CSS from globals.css**

In `src/styles/globals.css`, delete the entire `@media print` block (lines 89-103):
```css
/* DELETE this entire block: */
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

- [ ] **Step 4: Run tests and lint**

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ranking/RankingToolbar.tsx src/pages/RankingPage.tsx src/styles/globals.css
git commit -m "refactor: remove print button from toolbar and A4Page from ranking page"
```

---

### Task 3: Rename print-data.ts to export-data.ts

**Files:**
- Rename: `src/lib/print-data.ts` → `src/lib/export-data.ts`
- Rename: `test/print-data.test.ts` → `test/export-data.test.ts`
- Modify: every file that imports from `print-data` (see list below)

**Interfaces:**
- Consumes: all existing exports from `print-data.ts` (`PrintMeta`, `buildPrintMeta`, `parseMeetingDate`, `meetingStatusLabel`, `slugifyCategory`)
- Produces: same exports from `export-data.ts` — no API changes

Files that import from `print-data`:
- `src/hooks/use-print-export.ts`
- `src/lib/pdf-export.tsx`
- `src/lib/excel-export.ts`
- `src/components/meeting/MeetingCard.tsx`
- `test/print-data.test.ts`
- `test/pdf-export.test.ts`
- `test/excel-export.test.ts`

- [ ] **Step 1: Rename the source file**

```bash
git mv src/lib/print-data.ts src/lib/export-data.ts
git mv test/print-data.test.ts test/export-data.test.ts
```

- [ ] **Step 2: Update all imports**

In each file listed above, replace:
```typescript
// Before:
from '@/lib/print-data'
from '../src/lib/print-data'
from './print-data'
// After:
from '@/lib/export-data'
from '../src/lib/export-data'
from './export-data'
```

Specific files and their import lines:

**`src/hooks/use-print-export.ts`:**
```typescript
import { buildPrintMeta } from '@/lib/export-data';
```

**`src/lib/pdf-export.tsx`:**
```typescript
import type { PrintMeta } from './export-data';
import { slugifyCategory } from './export-data';
```

**`src/lib/excel-export.ts`:**
```typescript
import type { PrintMeta } from './export-data';
import { slugifyCategory } from './export-data';
```

**`src/components/meeting/MeetingCard.tsx`:**
```typescript
import { meetingStatusLabel, parseMeetingDate } from '@/lib/export-data';
```

**`test/export-data.test.ts`:**
```typescript
import { buildPrintMeta, parseMeetingDate, slugifyCategory } from '../src/lib/export-data';
```

**`test/pdf-export.test.ts`:**
```typescript
import { buildPrintMeta } from '../src/lib/export-data';
```

**`test/excel-export.test.ts`:**
```typescript
import { buildPrintMeta } from '../src/lib/export-data';
```

- [ ] **Step 3: Run tests and lint**

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: rename print-data.ts to export-data.ts"
```

---

### Task 4: Add header comments to all source files

**Files:**
- Modify: every `.ts` / `.tsx` file in `src/`, `electron/`, and `test/`

**Interfaces:**
- No interface changes — comments only

Every file gets a header comment answering:
1. What is this file's single responsibility?
2. Who calls it?
3. What would break if deleted?

Format:
```typescript
/**
 * Responsabilité : [description]
 * Appelé par : [caller(s)]
 * Suppression casserait : [consequence]
 */
```

- [ ] **Step 1: Add headers to `electron/` files**

**`electron/main.ts`:**
```typescript
/**
 * Responsabilité : point d'entrée du process principal Electron (fenêtre, DB, IPC).
 * Appelé par : Electron au démarrage de l'application.
 * Suppression casserait : l'application ne démarre plus.
 */
```

**`electron/preload.ts`:**
```typescript
/**
 * Responsabilité : expose l'API IPC au renderer via contextBridge.
 * Appelé par : Electron (chargé avant le renderer).
 * Suppression casserait : toute communication renderer ↔ main process.
 */
```

**`electron/ipc-handlers.ts`:**
```typescript
/**
 * Responsabilité : enregistre les handlers IPC pour les opérations DB et fichiers.
 * Appelé par : electron/main.ts au démarrage.
 * Suppression casserait : toutes les opérations de persistance (meetings, imports, exports).
 */
```

**`electron/ipc-channels.ts`:**
```typescript
/**
 * Responsabilité : noms de canaux IPC partagés entre main et renderer.
 * Appelé par : ipc-handlers.ts et preload.ts.
 * Suppression casserait : la correspondance des canaux entre les deux côtés du bridge.
 */
```

- [ ] **Step 2: Add headers to `src/lib/` files**

Add headers to: `csv-parser.ts`, `ranking-engine.ts`, `db.ts`, `export-data.ts`, `pdf-export.tsx`, `excel-export.ts`, `utils.ts`.

Examples:

**`src/lib/csv-parser.ts`:**
```typescript
/**
 * Responsabilité : parse les fichiers CSV FFN extraNat en lignes structurées.
 * Appelé par : ImportPage (via use-import.ts) et les tests.
 * Suppression casserait : l'import de fichiers CSV.
 */
```

**`src/lib/ranking-engine.ts`:**
```typescript
/**
 * Responsabilité : calcule le classement par équipes à partir des lignes nageurs.
 * Appelé par : use-ranking.ts, ipc-handlers.ts, et les tests.
 * Suppression casserait : tout le calcul de classement.
 */
```

**`src/lib/db.ts`:**
```typescript
/**
 * Responsabilité : opérations SQLite (CRUD meetings, swimmer_result, team_ranking).
 * Appelé par : electron/ipc-handlers.ts (main process uniquement).
 * Suppression casserait : toute la persistance de données.
 */
```

**`src/lib/export-data.ts`:**
```typescript
/**
 * Responsabilité : métadonnées et helpers pour les exports PDF/Excel.
 * Appelé par : use-print-export.ts, pdf-export.tsx, excel-export.ts, MeetingCard.tsx.
 * Suppression casserait : les exports PDF/Excel et l'affichage des cartes meeting.
 */
```

**`src/lib/utils.ts`:**
```typescript
/**
 * Responsabilité : helpers partagés (cn, formatPoints, ASCN_CLUB_NAME).
 * Appelé par : la plupart des composants et modules.
 * Suppression casserait : le formatage des classes CSS et des points.
 */
```

Continue for `pdf-export.tsx` and `excel-export.ts` with appropriate descriptions.

- [ ] **Step 3: Add headers to `src/hooks/` files**

Add headers to: `use-meeting.ts`, `use-import.ts`, `use-ranking.ts`, `use-print-export.ts`, `use-meeting-rows.ts`.

- [ ] **Step 4: Add headers to `src/components/` files**

Add headers to all component files in: `layout/`, `meeting/`, `ranking/`, `import/`.

- [ ] **Step 5: Add headers to `src/pages/` files**

Add headers to: `HomePage.tsx`, `ImportPage.tsx`, `RankingPage.tsx`, `SettingsPage.tsx`.

- [ ] **Step 6: Add headers to `src/main.tsx` and `src/App.tsx`**

**`src/main.tsx`:**
```typescript
/**
 * Responsabilité : point d'entrée React (monte l'App dans le DOM).
 * Appelé par : index.html via Vite.
 * Suppression casserait : le rendu de toute l'interface.
 */
```

**`src/App.tsx`:**
```typescript
/**
 * Responsabilité : routeur principal de l'application (définit les routes et le layout).
 * Appelé par : src/main.tsx.
 * Suppression casserait : toute la navigation entre écrans.
 */
```

- [ ] **Step 7: Run tests and lint**

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "docs: add header comments to all source files"
```

---

### Task 5: Dead code sweep and 300-line check

**Files:**
- Modify: any file with unused imports/exports
- Potentially split: any file exceeding 300 lines

**Interfaces:**
- No interface changes

- [ ] **Step 1: Check file lengths**

```bash
find src electron -name '*.ts' -o -name '*.tsx' | xargs wc -l | sort -rn | head -20
```

Any file over 300 lines must be split. Based on the current codebase, `csv-parser.ts` (247 lines) and `db.ts` (277 lines) are the largest but under the limit. Verify after header comments were added.

- [ ] **Step 2: Grep for unused exports**

```bash
# For each exported function/type, verify it's imported somewhere
grep -rn 'export ' src/lib/ --include='*.ts' --include='*.tsx'
```

Check each export is actually imported. Remove any orphaned exports.

- [ ] **Step 3: Check for unused imports**

Run: `npm run lint`

TypeScript's `noUnusedLocals` and `noUnusedParameters` (if enabled) will catch these. Manually inspect any warnings.

- [ ] **Step 4: Check for commented-out code**

```bash
grep -rn '^\s*//.*=' src/ electron/ --include='*.ts' --include='*.tsx' | head -30
```

Remove any commented-out code blocks. Comments explaining WHY are fine; commented-out code is not.

- [ ] **Step 5: Run tests and lint**

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 6: Commit (if changes were made)**

```bash
git add -A
git commit -m "refactor: dead code sweep and 300-line enforcement"
```

---

### Task 6: Restructure documentation into living docs

**Files:**
- Create: `docs/architecture.md`
- Create: `docs/screens.md`
- Create: `docs/data-model.md`
- Create: `docs/design-system.md`
- Create: `docs/algorithms.md`
- Move: `docs/superpowers/specs/` and `docs/superpowers/plans/` for phases 1-5 → `docs/archive/`
- Move: `docs/design-prompt.md` and `docs/technical-design.md` → `docs/archive/`

**Interfaces:**
- No code interfaces — documentation only

- [ ] **Step 1: Create docs/architecture.md**

Content should describe:
- Stack technique (React 18, Vite, TypeScript strict, Electron, better-sqlite3, etc.)
- Flux de données : `CSV (Latin-1) → csv-parser.ts → ranking-engine.ts → UI React / SQLite / PDF-XLSX`
- IPC architecture : main process owns SQLite, renderer communicates via contextBridge
- Folder structure (current, accurate)

- [ ] **Step 2: Create docs/screens.md**

Describe each screen as it exists now:
- **Accueil** (`/`) : liste des meetings, bouton "Nouveau meeting", clic pour ouvrir
- **Import** (`/import`) : drag & drop CSV, preview des données, persistance en DB
- **Classement** (`/classement`) : tableau par équipes, onglets catégories, sélecteur top N, export PDF/Excel
- **Paramètres** (`/parametres`) : configuration du meeting et règles de calcul

Note: Impression has been removed.

- [ ] **Step 3: Create docs/data-model.md**

Include:
- Full SQLite schema (CREATE TABLE statements from `db.ts`)
- TypeScript interfaces (`Meeting`, `MeetingInput`, `RawSwimmerRow`, `TeamResult`)
- Relations between tables
- Note on `user_version` pragma

- [ ] **Step 4: Create docs/design-system.md**

Include:
- Color tokens (copy from CLAUDE.md / globals.css)
- Typography (Montserrat, Inter, JetBrains Mono)
- Component patterns (border-radius, shadows, spacing, transitions)
- Light mode only

- [ ] **Step 5: Create docs/algorithms.md**

Include:
- Team ranking algorithm (step by step)
- Reference results (Classement Mixte, top 5)
- Note: individual ranking and fun awards will be added in Phase 8

- [ ] **Step 6: Archive old phase docs**

```bash
mkdir -p docs/archive
git mv docs/design-prompt.md docs/archive/
git mv docs/technical-design.md docs/archive/
git mv docs/superpowers/specs/2026-09-15-phase-2-ranking-screen-design.md docs/archive/
git mv docs/superpowers/specs/2026-09-15-phase-3-export-print-design.md docs/archive/
git mv docs/superpowers/plans/2026-09-15-phase-2-ranking-screen.md docs/archive/
git mv docs/superpowers/plans/2026-09-15-phase-3-export-print.md docs/archive/
git mv docs/superpowers/plans/2026-09-16-phase-4-sqlite-persistence.md docs/archive/
git mv docs/superpowers/plans/2026-09-16-settings-screen.md docs/archive/
git mv docs/superpowers/specs/2026-09-16-settings-screen-design.md docs/archive/
```

Keep Phase 6-9 specs and plans in place (they're the current work).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "docs: restructure into living docs, archive old phase specs"
```

---

### Task 7: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- No code interfaces

- [ ] **Step 1: Update the stack technique section**

Remove `shadcn/ui` from the UI line:
```markdown
- **UI** : Tailwind CSS + Lucide icons
```

- [ ] **Step 2: Update the screens list**

Remove item 4 (Impression). The list becomes:
```markdown
1. **Accueil** — Liste des meetings, créer/ouvrir
2. **Import** — Drag & drop CSV, preview, validation colonnes
3. **Classement** — Tableau des clubs avec drill-down nageurs, filtres par catégorie, sélecteur top N, export PDF/Excel
4. **Paramètres** — Config meeting (nom, date, lieu, statut) et règles de calcul (top N, catégories)
```

- [ ] **Step 3: Update the project structure tree**

Remove:
- `├── components/ui/` line (empty directory)
- `├── print/` line and its children
- `├── PrintPage.tsx` line

Add references to new docs:
```markdown
├── docs/
│   ├── architecture.md       # Stack, flux de données, IPC, dossiers
│   ├── screens.md            # Description de chaque écran
│   ├── data-model.md         # Schéma SQLite, interfaces TypeScript
│   ├── design-system.md      # Couleurs, typo, composants
│   ├── algorithms.md         # Algorithmes de calcul
│   └── archive/              # Specs et plans des phases précédentes
```

- [ ] **Step 4: Add reference to living docs**

Add a short section pointing to the new docs:
```markdown
## Documentation détaillée

Les fichiers dans `docs/` décrivent l'état actuel de l'application :
- `docs/architecture.md` — Stack, flux de données, structure
- `docs/screens.md` — Description de chaque écran
- `docs/data-model.md` — Schéma SQLite et types
- `docs/design-system.md` — Design tokens et composants
- `docs/algorithms.md` — Algorithmes de calcul
```

- [ ] **Step 5: Run tests and lint (sanity check)**

Run: `npm run test`
Expected: PASS

Run: `npm run lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md to reflect cleanup changes"
```

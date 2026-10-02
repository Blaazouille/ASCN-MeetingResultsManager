# Phase 10 — Auto-Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app self-maintaining on a non-technical user's machine — automatic SemVer versioning from commits, a custom NSIS installer, CI that builds and publishes the Windows installer, and an in-app updater that checks, downloads, and installs updates without the user ever visiting GitHub.

**Architecture:** `release-please` turns Conventional Commits on `main` into a versioned GitHub Release with changelog; a second GitHub Actions workflow builds the Windows installer on release publish and attaches it (plus `electron-updater`'s `latest.yml`/`.blockmap`) to that release; the packaged app's main process (`electron/auto-updater.ts`) checks that release feed once at startup via `electron-updater`, downloads silently, and tells the renderer through a new IPC channel so a toast can offer "Restart now" / "Later".

**Tech Stack:** `electron-updater` (runtime), `@commitlint/cli` + `@commitlint/config-conventional` (dev, enforced via the existing Husky hook chain), `google-github-actions/release-please-action@v4` and `softprops/action-gh-release@v2` (GitHub Actions, not npm deps).

## Global Constraints

- Spec of record: `docs/superpowers/specs/2026-09-18-phase-10-auto-update-design.md` — already written and committed; this plan implements it as-is except where noted inline (one deviation, in Task 3).
- No file exceeds 300 lines; every new file gets the project's standard header comment (Responsabilité / Appelé par / Suppression casserait).
- All user-visible strings are in French with correct French punctuation (non-breaking space before `:`, `;`, `!`, `?`).
- New dependencies for this phase (`electron-updater`, `@commitlint/cli`, `@commitlint/config-conventional`) were approved as part of the spec — do not add anything beyond these three.
- Windows-only target, no code signing (SmartScreen warning is accepted) — matches the spec's stated scope.
- `npm run test` and `npm run lint` (`tsc -b --noEmit`) must pass after every task that touches TypeScript.
- No automated test for `electron/auto-updater.ts`, `src/hooks/use-auto-update.ts`, or `src/components/layout/UpdateToast.tsx`: this codebase already has zero tests for `electron/*.ts` (main.ts, preload.ts, ipc-handlers.ts) and zero component/hook tests anywhere (`test/` only covers pure `src/lib/*` modules — csv-parser, db, ranking-engine, excel-export, export-data, fun-awards, individual-ranking, pdf-export). This plan follows that existing precedent rather than introducing a new testing pattern for one phase; verification is manual (Task 7), matching the spec's own §7.
- Commit messages from this point on must be Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, etc.) — Task 2 makes this locally enforced, and every task after it depends on it.
- Pushing branches, opening PRs, merging the release-please PR, and creating/installing GitHub Releases are not executed autonomously — those are flagged for explicit confirmation when reached (Task 7).

---

### Task 1: electron-builder — GitHub publish target & NSIS installer

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `build.publish` (GitHub provider config) that `electron-builder` reads to emit `latest.yml`/`.blockmap` — consumed by Task 3's CI build step and by `electron-updater` in Task 4.

- [ ] **Step 1: Add the GitHub publish target and NSIS options to `package.json`**

Replace the `"build"` block (currently lines 20-38):

```json
  "build": {
    "appId": "fr.ascn.mdlm-ranking",
    "productName": "MDLM Ranking",
    "icon": "resources/icon.png",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "dist-electron/**/*",
      "resources/icon.png"
    ],
    "win": {
      "target": "nsis"
    },
    "mac": {
      "target": "dmg"
    }
  },
```

with:

```json
  "build": {
    "appId": "fr.ascn.mdlm-ranking",
    "productName": "MDLM Ranking",
    "icon": "resources/icon.png",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "dist-electron/**/*",
      "resources/icon.png"
    ],
    "publish": {
      "provider": "github",
      "owner": "Blaazouille",
      "repo": "ASCN-MeetingResultsManager"
    },
    "win": {
      "target": "nsis"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "perMachine": false
    },
    "mac": {
      "target": "dmg"
    }
  },
```

- [ ] **Step 2: Add the `electron-updater` runtime dependency**

```bash
npm install electron-updater
```

Expected: `package.json` gains `electron-updater` under `"dependencies"` and `package-lock.json` updates.

- [ ] **Step 3: Verify the installer builds with the new options**

```bash
npm run build:win
```

Expected: succeeds (may take a few minutes on first run while electron-builder downloads tooling), produces `release/*.exe`, `release/latest.yml`, and a `.blockmap` file. Running the produced `.exe` manually should prompt for an install directory instead of installing one-click (spot-check this now or fold it into Task 7's end-to-end pass — don't block the rest of the plan on manually launching the installer).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: configure electron-builder GitHub publish target and NSIS installer options"
```

---

### Task 2: commitlint guard rail

**Files:**
- Create: `commitlint.config.js`
- Create: `.husky/commit-msg`
- Modify: `package.json` (devDependencies)

**Interfaces:**
- Produces: a `commit-msg` git hook that rejects any commit message not matching Conventional Commits — every commit made in Tasks 3-7 of this plan must satisfy it.

- [ ] **Step 1: Install commitlint**

```bash
npm install -D @commitlint/cli @commitlint/config-conventional
```

- [ ] **Step 2: Write the commitlint config**

`package.json` has `"type": "module"`, so a `.js` file here is loaded as ESM — use `export default`, not `module.exports` (the latter would throw `ReferenceError: module is not defined`):

```javascript
export default { extends: ['@commitlint/config-conventional'] };
```

- [ ] **Step 3: Write the commit-msg hook**

The repo's `core.hooksPath` is already `.husky/_`, whose generated `commit-msg` shim dispatches to `.husky/commit-msg` if present — no `husky` reinstall needed, just add the file:

```sh
#!/bin/sh
npx --no-install commitlint --edit "$1"
```

- [ ] **Step 4: Make the hook executable**

```bash
chmod +x .husky/commit-msg
```

- [ ] **Step 5: Verify the hook rejects a non-conventional message**

```bash
git commit --allow-empty -m "not a conventional commit"
```

Expected: FAILS — commitlint prints a rule violation (e.g. `subject may not be empty`, `type must be one of [...]`) and no commit is created (`git log -1` still shows the previous commit).

- [ ] **Step 6: Commit (this message itself proves the hook accepts valid input)**

```bash
git add commitlint.config.js .husky/commit-msg package.json package-lock.json
git commit -m "feat: add commitlint guard rail for conventional commits"
```

Expected: PASSES.

---

### Task 3: CI workflows — release-please + build-release

**Files:**
- Create: `.github/workflows/release-please.yml`
- Create: `.github/workflows/build-release.yml`

**Interfaces:**
- Consumes: `build.publish` from Task 1 (so `electron-builder` emits `latest.yml`/`.blockmap`).
- Produces: on merge to `main`, a release PR / tagged GitHub Release (release-please); on that release's publish event, an attached Windows installer.

- [ ] **Step 1: Write `release-please.yml`**

```yaml
name: Gestion des releases (release-please)

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: google-github-actions/release-please-action@v4
        with:
          release-type: node
```

- [ ] **Step 2: Write `build-release.yml`**

Deviation from the literal spec snippet: the spec's version runs `electron-builder --win` with `GH_TOKEN` set and no `--publish` flag. Since Task 1 now configures `build.publish`, `electron-builder`'s default publish policy (`onTagOrDraft`) would trigger it to *also* try publishing to the already-existing tagged release, racing with the explicit `action-gh-release` upload below. Passing `--publish never` keeps `electron-builder` local-only (it still emits `latest.yml`/`.blockmap` — that generation is tied to `publish` being *configured*, not to the publish policy) and leaves `action-gh-release` as the single uploader, so `GH_TOKEN` is no longer needed on the build step either.

```yaml
name: Build et publication de la release

on:
  release:
    types: [published]

permissions:
  contents: write

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Installer Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Installer les dépendances
        run: npm ci

      - name: Build de l'installeur Windows
        # --publish never : la release existe déjà (créée par release-please) ; ce
        # workflow ne fait qu'y attacher les artefacts via action-gh-release plus
        # bas. Sans ce flag, electron-builder tenterait de publier lui-même sur la
        # release taguée (build.publish est configuré) et entrerait en conflit
        # avec l'upload explicite ci-dessous.
        run: npm run build:win -- --publish never

      - name: Attacher les artefacts à la release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            release/*.exe
            release/latest.yml
            release/*.blockmap
```

- [ ] **Step 3: Verify**

No local runtime check applies to GitHub Actions workflow files. Confirm with `git diff --stat` that exactly these two new files were added, and re-read both against the YAML above for typos (indentation errors are the most common failure mode and only surface once pushed).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/release-please.yml .github/workflows/build-release.yml
git commit -m "ci: add release-please and build-release workflows"
```

---

### Task 4: Auto-updater — main process wiring

**Files:**
- Modify: `electron/ipc-channels.ts`
- Modify: `electron/preload.ts`
- Create: `electron/auto-updater.ts`
- Modify: `electron/main.ts`

**Interfaces:**
- Produces: `IpcChannels.updateDownloaded` (`'update:downloaded'`, main → renderer, no payload) and `IpcChannels.quitAndInstallUpdate` (`'update:quitAndInstall'`, renderer → main, invoke, no payload/return); `initAutoUpdater(onUpdateDownloaded: () => void): void` exported from `electron/auto-updater.ts`; `window.electronAPI.onUpdateDownloaded(callback: () => void): () => void` (returns an unsubscribe function) and `window.electronAPI.quitAndInstallUpdate(): Promise<void>` exposed on `ElectronAPI` — consumed by Task 5's `useAutoUpdate` hook.

- [ ] **Step 1: Add the two new IPC channels**

In `electron/ipc-channels.ts`, add inside the `IpcChannels` object, after `saveFileDialog: 'dialog:saveFile',`:

```typescript
  openFileDialog: 'dialog:openFile',
  saveFileDialog: 'dialog:saveFile',

  updateDownloaded: 'update:downloaded',
  quitAndInstallUpdate: 'update:quitAndInstall',
} as const;
```

(i.e. insert the two new lines before the closing `} as const;`).

- [ ] **Step 2: Expose the two new methods in preload.ts**

In `electron/preload.ts`, add to the `electronAPI` object, after the "File dialogs" section:

```typescript
  // File dialogs
  openFileDialog: (filters?: FileFilter[]): Promise<string | null> => ipcRenderer.invoke(IpcChannels.openFileDialog, filters),
  saveFileDialog: (defaultName: string, filters?: FileFilter[]): Promise<string | null> =>
    ipcRenderer.invoke(IpcChannels.saveFileDialog, defaultName, filters),

  // Auto-update
  onUpdateDownloaded: (callback: () => void): (() => void) => {
    const listener = (): void => callback();
    ipcRenderer.on(IpcChannels.updateDownloaded, listener);
    return () => ipcRenderer.removeListener(IpcChannels.updateDownloaded, listener);
  },
  quitAndInstallUpdate: (): Promise<void> => ipcRenderer.invoke(IpcChannels.quitAndInstallUpdate),
};
```

- [ ] **Step 3: Create `electron/auto-updater.ts`**

```typescript
/**
 * Responsabilité : configure electron-updater, vérifie les mises à jour au démarrage, notifie le renderer.
 * Appelé par : electron/main.ts (une fois au démarrage, après app.whenReady()).
 * Suppression casserait : l'app ne vérifie plus jamais de mise à jour ; elle reste fonctionnelle mais ne se met plus à jour automatiquement.
 */
import { autoUpdater } from 'electron-updater';
import { ipcMain } from 'electron';
import { IpcChannels } from './ipc-channels';

// Laisse le démarrage (fenêtre, DB) se terminer avant de solliciter le réseau.
const UPDATE_CHECK_DELAY_MS = 5000;

/**
 * Vérifie une seule fois les mises à jour au lancement (pas de polling — usage
 * occasionnel, jour de meeting) et appelle onUpdateDownloaded une fois la mise
 * à jour téléchargée silencieusement en arrière-plan.
 */
export function initAutoUpdater(onUpdateDownloaded: () => void): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true; // filet de sécurité si l'utilisateur ignore le prompt
  autoUpdater.on('update-downloaded', onUpdateDownloaded);
  autoUpdater.on('error', () => {}); // échec silencieux : vérification en arrière-plan, non bloquante

  ipcMain.handle(IpcChannels.quitAndInstallUpdate, () => {
    autoUpdater.quitAndInstall();
  });

  setTimeout(() => {
    void autoUpdater.checkForUpdates();
  }, UPDATE_CHECK_DELAY_MS);
}
```

- [ ] **Step 4: Wire it up in `electron/main.ts`**

Change the `createWindow` signature from `function createWindow(): void {` to `function createWindow(): BrowserWindow {` and add `return mainWindow;` as its last line (mainWindow is assigned earlier in the same function body — no other change needed inside it).

Add imports at the top, alongside the existing ones:

```typescript
import { registerIpcHandlers } from './ipc-handlers';
import { createDatabase } from '../src/lib/db-schema';
import { initAutoUpdater } from './auto-updater';
import { IpcChannels } from './ipc-channels';
```

In the `app.whenReady().then(...)` block, replace:

```typescript
    const dbPath = path.join(app.getPath('userData'), 'ascn-meeting-results.sqlite3');
    const db = createDatabase(dbPath);
    registerIpcHandlers(db);
    createWindow();
```

with:

```typescript
    const dbPath = path.join(app.getPath('userData'), 'ascn-meeting-results.sqlite3');
    const db = createDatabase(dbPath);
    registerIpcHandlers(db);
    const window = createWindow();
    initAutoUpdater(() => window.webContents.send(IpcChannels.updateDownloaded));
```

- [ ] **Step 5: Verify**

```bash
npm run lint
```

Expected: no TypeScript errors.

```bash
npm run dev
```

Expected: the app window opens normally (Ctrl+C to stop once confirmed — the updater's 5s-delayed `checkForUpdates()` will no-op quietly in dev since there's no packaged update feed, consistent with the swallowed-error design).

- [ ] **Step 6: Commit**

```bash
git add electron/ipc-channels.ts electron/preload.ts electron/auto-updater.ts electron/main.ts
git commit -m "feat: wire electron-updater into the main process"
```

---

### Task 5: Auto-updater — renderer UI

**Files:**
- Create: `src/hooks/use-auto-update.ts`
- Create: `src/components/layout/UpdateToast.tsx`
- Modify: `src/components/layout/AppShell.tsx`

**Interfaces:**
- Consumes: `window.electronAPI.onUpdateDownloaded` / `window.electronAPI.quitAndInstallUpdate` from Task 4.
- Produces: `useAutoUpdate(): { isUpdateReady: boolean; restartToUpdate: () => void; dismiss: () => void }`; `<UpdateToast />` (no props).

- [ ] **Step 1: Create the hook**

```typescript
/**
 * Responsabilité : état et actions pour le toast de mise à jour (écoute update:downloaded, déclenche le redémarrage).
 * Appelé par : UpdateToast.tsx.
 * Suppression casserait : le toast de mise à jour ne s'affiche plus jamais.
 */
import { useCallback, useEffect, useState } from 'react';

export interface UseAutoUpdateResult {
  isUpdateReady: boolean;
  restartToUpdate: () => void;
  dismiss: () => void;
}

/** Subscribes to the main process's update-downloaded notification for the lifetime of the component. */
export function useAutoUpdate(): UseAutoUpdateResult {
  const [isUpdateReady, setIsUpdateReady] = useState(false);

  useEffect(() => {
    return window.electronAPI.onUpdateDownloaded(() => setIsUpdateReady(true));
  }, []);

  const restartToUpdate = useCallback(() => {
    void window.electronAPI.quitAndInstallUpdate();
  }, []);

  const dismiss = useCallback(() => setIsUpdateReady(false), []);

  return { isUpdateReady, restartToUpdate, dismiss };
}
```

- [ ] **Step 2: Create the toast component**

```tsx
/**
 * Responsabilité : toast non bloquant proposant de redémarrer pour appliquer une mise à jour téléchargée.
 * Appelé par : AppShell.tsx.
 * Suppression casserait : l'utilisateur n'est plus jamais informé qu'une mise à jour est prête.
 */
import { RefreshCw } from 'lucide-react';
import { useAutoUpdate } from '@/hooks/use-auto-update';

export function UpdateToast(): JSX.Element | null {
  const { isUpdateReady, restartToUpdate, dismiss } = useAutoUpdate();

  if (!isUpdateReady) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 rounded-lg bg-primary-900 px-5 py-4 text-neutral-0 shadow-card">
      <RefreshCw className="h-5 w-5 shrink-0 text-secondary-400" aria-hidden />
      <p className="font-body text-sm font-medium">Une mise à jour est prête.</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={restartToUpdate}
          className="rounded-md bg-secondary-500 px-3 py-1.5 text-sm font-medium text-neutral-0 transition-colors duration-150 hover:bg-secondary-600"
        >
          Redémarrer maintenant
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-300 transition-colors duration-150 hover:text-neutral-0"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Mount it in `AppShell.tsx`**

Add the import alongside the existing ones:

```typescript
import { UpdateToast } from './UpdateToast';
```

Add `<UpdateToast />` as the last child of the root `<div className="flex min-h-screen bg-neutral-50">`, after the existing `<div className="ml-[220px] ...">` block:

```tsx
  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar hasMeeting={meetingState.currentMeeting !== null} />
      <div className="ml-[220px] flex h-screen flex-1 flex-col">
        <Header currentMeeting={meetingState.currentMeeting} />
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet context={context} />
        </main>
      </div>
      <UpdateToast />
    </div>
  );
```

- [ ] **Step 4: Verify**

```bash
npm run lint
```

Expected: no TypeScript errors. (Visual confirmation of the toast itself requires an actual downloaded update, which only exists once Tasks 1-4 are live in a packaged build — covered in Task 7.)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-auto-update.ts src/components/layout/UpdateToast.tsx src/components/layout/AppShell.tsx
git commit -m "feat: show a restart toast when an update has downloaded"
```

---

### Task 6: Documentation

**Files:**
- Modify: `docs/architecture.md`
- Modify: `.ai/pull-request.md`

- [ ] **Step 1: Replace the Phase 9 placeholder section in `docs/architecture.md`**

Replace the section currently at lines 37-45 (`## Versioning, installeur et auto-update (Phase 9 — non démarré)` through the paragraph ending `Phase 9).`) with:

```markdown
## Versioning, installeur et auto-update (Phase 10)

- **Versioning automatique** : `release-please` (`.github/workflows/release-please.yml`) lit les commits Conventional Commits sur `main` et maintient une PR de release qui bump `package.json` et `CHANGELOG.md`. Fusionner cette PR crée le tag, la GitHub Release et le changelog automatiquement — plus de bump manuel. `commitlint` (hook Husky `commit-msg`) bloque localement tout commit qui ne respecte pas Conventional Commits, condition dont dépend le calcul de version.
- **Build & publication** : `.github/workflows/build-release.yml` se déclenche à la publication d'une release, construit l'installeur Windows (`npm run build:win`) et attache `.exe`, `latest.yml` et `.blockmap` à la release existante.
- **Installeur** : NSIS personnalisé (`build.nsis` dans `package.json`) — choix du dossier d'installation, raccourci bureau, pas de mode one-click. Pas de signature de code (déploiement à un seul poste non technique) ; l'avertissement SmartScreen est accepté.
- **Auto-updater in-app** : `electron/auto-updater.ts` (`electron-updater`) vérifie les mises à jour une fois au démarrage, télécharge silencieusement, et notifie le renderer via le canal IPC `update:downloaded`. Le composant `UpdateToast` (`src/components/layout/UpdateToast.tsx`, monté dans `AppShell`) propose "Redémarrer maintenant" (`quitAndInstall()` via IPC) ou "Plus tard" — dans ce dernier cas, `autoInstallOnAppQuit` installe la mise à jour à la prochaine fermeture naturelle de l'app.
```

Also update the folder structure diagram further down: add `auto-updater.ts` to the `electron/` listing, and `use-auto-update.ts` to the `hooks/` listing.

- [ ] **Step 2: Replace the manual SemVer checklist item in `.ai/pull-request.md`**

Replace line 34:

```markdown
- [ ] **SemVer (package.json)** — La version a été incrémentée selon la règle : `Major` (changement cassant / rupture de compatibilité des données locales), `Minor` (nouvelle fonctionnalité), `Patch` (correctif) [https://electronjs.org].
```

with:

```markdown
- [ ] **Commits Conventional Commits** — Les commits suivent Conventional Commits (`feat:`, `fix:`, `chore:`, etc.), vérifiés localement par le hook `commit-msg` (`commitlint`). La version est calculée automatiquement par `release-please` à partir de ces commits — plus de bump manuel de `package.json`.
```

- [ ] **Step 3: Commit**

```bash
git add docs/architecture.md .ai/pull-request.md
git commit -m "docs: document the Phase 10 auto-update architecture"
```

---

### Task 7: Manual end-to-end verification

This task has real-world side effects on the actual GitHub repository (pushing, opening/merging a PR, creating a tagged Release) and requires the app to be installed on a machine to observe the updater — none of it is safe to run autonomously. Confirm with the user before doing any of the GitHub-side steps (pushing the branch and opening the PR is already covered by the project's standard PR workflow and fine to do at the normal point; merging the release-please PR and watching it build/publish is the part to explicitly confirm).

Checklist (from the spec's §9 Critères de validation):

- [ ] A malformed commit (not Conventional Commits) is rejected locally by the `commit-msg` hook — already exercised in Task 2.
- [ ] Push this branch and open the PR; once merged to `main`, `release-please` opens/updates a `chore(main): release X.Y.Z` PR.
- [ ] Merging that release PR creates the git tag, the GitHub Release, and the changelog automatically.
- [ ] The release's publish event triggers `build-release.yml`, which attaches the `.exe`, `latest.yml`, and `.blockmap`.
- [ ] The NSIS installer prompts for an install directory (not one-click).
- [ ] Install the app, then publish a second release with a higher version: on next launch, the "Redémarrer maintenant / Plus tard" toast appears.
- [ ] "Redémarrer maintenant" installs and relaunches the app at the new version.
- [ ] "Plus tard" dismisses the toast; closing and reopening the app still applies the update (`autoInstallOnAppQuit`).
- [ ] Offline, no error is visible to the user.
- [ ] `npm run test` and `npm run lint` pass.
- [ ] No file exceeds 300 lines; every new file has a header comment.

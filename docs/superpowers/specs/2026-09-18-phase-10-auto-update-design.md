# Phase 10 — Versioning automatique, installeur personnalisé, auto-updater

> Rendre l'app distribuable et auto-maintenue sur un poste géré par un utilisateur non technique (le père de Jason) qui ne va pas télécharger les mises à jour lui-même depuis GitHub.

## Contexte

Dépôt GitHub public. Cible : Windows uniquement (pas de signature de code — l'avertissement SmartScreen est accepté, l'utilisateur clique "Plus d'infos → Exécuter quand même"). macOS reste hors scope tant qu'aucune diffusion Mac n'est nécessaire.

## 1. Versioning automatique — `release-please`

### Pourquoi
L'utilisateur ne doit jamais avoir à bumper `package.json` ou créer un tag manuellement — le risque d'oubli est réel. `release-please` (action GitHub officielle Google) lit les commits Conventional Commits depuis le dernier release et maintient automatiquement une PR de release.

### Fonctionnement
1. À chaque push sur `main`, `google-github-actions/release-please-action` analyse les commits (`feat:`, `fix:`, `chore:`, `feat!:`/`BREAKING CHANGE:` pour un major) depuis le dernier tag.
2. Elle maintient une PR ouverte `chore(main): release X.Y.Z` qui bump `package.json` (`version`) et met à jour `CHANGELOG.md`.
3. Quand cette PR est mergée (au moment choisi par Jason), release-please crée automatiquement : le tag git `vX.Y.Z`, la GitHub Release, et les notes de version (changelog groupé par type de commit : Features / Bug Fixes / etc.).

### Fichier
**Nouveau : `.github/workflows/release-please.yml`**
```yaml
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

### Remplace la règle manuelle existante
La ligne SemVer de `.ai/pull-request.md` ("La version a été incrémentée selon la règle...") est remplacée : la version n'est plus bumpée manuellement dans la PR de la feature, mais calculée automatiquement par release-please à partir des types de commits. `.ai/pull-request.md` doit être mis à jour pour refléter ce changement (checklist : "Les commits suivent Conventional Commits" au lieu de "La version a été incrémentée").

## 2. `commitlint` — garde-fou sur le format des commits

### Pourquoi
Le calcul de version par release-please dépend entièrement du respect du format Conventional Commits. Un commit mal formé fausserait silencieusement le bump (ou l'omettrait). `commitlint` bloque le commit localement avant que le problème n'atteigne `main`.

### Implémentation
- Nouvelles dépendances dev : `@commitlint/cli`, `@commitlint/config-conventional`.
- **Nouveau : `commitlint.config.js`**
  ```javascript
  module.exports = { extends: ['@commitlint/config-conventional'] };
  ```
- Hook Husky `commit-msg` (nouveau, à côté du hook `pre-commit` existant) :
  ```bash
  npx --no-install commitlint --edit "$1"
  ```

## 3. Installeur NSIS personnalisé

### Pourquoi
Permettre à l'utilisateur de choisir le dossier d'installation plutôt que subir l'installeur "one-click" par défaut d'electron-builder.

### Implémentation
Dans `package.json` → `build.nsis` :
```jsonc
"nsis": {
  "oneClick": false,
  "allowToChangeInstallationDirectory": true,
  "createDesktopShortcut": true,
  "perMachine": false
}
```
Pas de signature de code (coût non justifié pour un déploiement à un seul poste non technique) — l'avertissement SmartScreen est accepté.

## 4. Build + publication automatique (CI)

### Pourquoi
Une fois la release créée par release-please, l'installeur Windows doit être construit et attaché automatiquement — Jason ne doit pas lancer `npm run build:win` ni uploader de fichier à la main.

### Fichier
**Nouveau : `.github/workflows/build-release.yml`**
```yaml
on:
  release:
    types: [published]
jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build:win
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - uses: softprops/action-gh-release@v2
        with:
          files: |
            release/*.exe
            release/latest.yml
            release/*.blockmap
```
`electron-builder` génère `latest.yml` (métadonnées de version consommées par `electron-updater`) et le fichier `.blockmap` (mise à jour différentielle) automatiquement lors du build — aucune config supplémentaire requise au-delà de `publish` déjà géré par `GH_TOKEN`.

La release et ses notes existent déjà (créées par release-please à l'étape 1) — ce workflow ne fait qu'y attacher les artefacts de build, il n'en crée pas une nouvelle.

## 5. Auto-updater in-app

### Pourquoi
L'utilisateur cible ne va pas vérifier ou télécharger de mise à jour lui-même — l'app doit le faire pour lui, sans qu'il ait besoin de comprendre ce qui se passe.

### Nouveau fichier : `electron/auto-updater.ts`
**Responsabilité** : configure `electron-updater`, vérifie les mises à jour au démarrage, notifie le renderer.
**Appelant** : `electron/main.ts` (appelé une fois au démarrage, après `app.whenReady()`).
**Impact si supprimé** : l'app ne vérifie plus jamais de mise à jour ; elle reste fonctionnelle mais ne se met plus à jour automatiquement.

```typescript
import { autoUpdater } from 'electron-updater';

export function initAutoUpdater(onUpdateDownloaded: () => void): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true; // filet de sécurité si l'utilisateur ignore le prompt
  autoUpdater.on('update-downloaded', onUpdateDownloaded);
  autoUpdater.on('error', () => {}); // échec silencieux : vérification en arrière-plan, non bloquante
  setTimeout(() => autoUpdater.checkForUpdates(), 5000); // laisse le démarrage se terminer d'abord
}
```

### Comportement
- Une seule vérification par lancement de l'app (pas de polling périodique — usage occasionnel, jour de meeting).
- Téléchargement automatique et silencieux si une mise à jour est trouvée.
- `autoInstallOnAppQuit = true` : même si l'utilisateur ignore le prompt, la mise à jour s'installe silencieusement à la prochaine fermeture naturelle de l'app. Aucune mise à jour ne reste bloquée indéfiniment.
- Toute erreur (hors ligne, GitHub injoignable) est avalée silencieusement — pas de dialogue d'erreur pour un utilisateur non technique face à une vérification de fond non critique.

### IPC
**`electron/ipc-channels.ts`** : nouveau canal `update:downloaded` (main → renderer, sans payload).
**`electron/preload.ts`** : expose `onUpdateDownloaded(callback)` via `contextBridge`.
**`electron/main.ts`** : `initAutoUpdater(() => mainWindow.webContents.send('update:downloaded'))`.

### UI
**Nouveau composant : `src/components/layout/UpdateToast.tsx`** (rendu dans `AppShell`, aux côtés de la navbar/sidebar) : petit toast non bloquant affiché à la réception de `update:downloaded`.
- Texte : "Une mise à jour est prête." avec deux boutons : "Redémarrer maintenant" / "Plus tard".
- "Redémarrer maintenant" → IPC vers le main process qui appelle `autoUpdater.quitAndInstall()`.
- "Plus tard" → ferme simplement le toast (la mise à jour s'installera de toute façon à la prochaine fermeture, cf. `autoInstallOnAppQuit`).

## 6. Notes de version

Générées automatiquement par release-please (changelog par type de commit), affichées sur la page GitHub Release. Pas de notes personnalisées écrites à la main — cohérent avec l'objectif "zéro intervention manuelle".

## 7. Tests

- `electron/auto-updater.ts` : logique minimale (wrapper autour d'`electron-updater`), pas de logique métier complexe à tester unitairement. Vérifier via test manuel (voir critères de validation).
- Pas de nouveau module `src/lib/` pur à tester — ce Phase est majoritairement infra/CI/Electron main process.

## 8. Documentation à mettre à jour

- `CLAUDE.md` : plan de construction déjà mis à jour (Phase 10 ajoutée, Phase 9 = backup/restore restaurée).
- `docs/architecture.md` : remplacer la section "Phase 9 — non démarré" par une section "Phase 10" décrivant l'architecture ci-dessus.
- `.ai/pull-request.md` : remplacer la checklist "SemVer bumped manuellement" par "Commits suivent Conventional Commits (vérifié par commitlint)".

## 9. Critères de validation

- [ ] Un commit mal formé (hors Conventional Commits) est rejeté localement par le hook `commit-msg`.
- [ ] Une PR mergée sur `main` avec des commits `feat:`/`fix:` déclenche l'ouverture/mise à jour de la PR de release par release-please.
- [ ] Merger la PR de release crée le tag, la GitHub Release et le changelog automatiquement.
- [ ] La publication de la release déclenche `build-release.yml`, qui attache l'installeur `.exe`, `latest.yml` et `.blockmap`.
- [ ] L'installeur NSIS propose bien le choix du dossier d'installation (pas de one-click).
- [ ] Au lancement de l'app avec une mise à jour disponible, le toast "Redémarrer maintenant / Plus tard" apparaît.
- [ ] "Redémarrer maintenant" installe et relance l'app avec la nouvelle version.
- [ ] "Plus tard" ferme le toast ; fermer puis rouvrir l'app applique quand même la mise à jour (test avec deux versions publiées successivement).
- [ ] Hors ligne, aucune erreur n'est visible côté utilisateur.
- [ ] `npm run test` et `npm run lint` passent.
- [ ] Aucun fichier ne dépasse 300 lignes ; chaque nouveau fichier a un header comment.

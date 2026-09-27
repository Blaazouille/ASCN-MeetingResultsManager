# Architecture

> Décrit l'état actuel de l'application. Mis à jour à chaque phase.

## Stack technique

- **Frontend** : React 18 + Vite + TypeScript (strict)
- **Desktop** : Electron (main + renderer, IPC bridge via `contextBridge`)
- **UI** : Tailwind CSS + Lucide icons
- **Tableaux** : TanStack Table (headless)
- **Persistance** : SQLite via `better-sqlite3` (main process uniquement)
- **CSV** : Papa Parse (auto-détection encodage + délimiteur)
- **Export PDF** : `@react-pdf/renderer`
- **Export Excel** : ExcelJS
- **Tests** : Vitest

## Flux de données

```
CSV (Latin-1) → csv-parser.ts → ranking-engine.ts → UI React
                                                    → SQLite (historique, via IPC)
                                                    → export-data.ts → pdf-export.tsx / excel-export.ts
```

Le parseur CSV (`src/lib/csv-parser.ts`) et le moteur de calcul (`src/lib/ranking-engine.ts`) sont indépendants de React et testés unitairement.

## Architecture IPC

Le process **main** Electron (`electron/main.ts`) possède la base SQLite (`src/lib/db.ts`) et enregistre les handlers IPC (`electron/ipc-handlers.ts`). Le **renderer** (React) n'accède jamais directement à SQLite : il passe par l'API exposée dans `electron/preload.ts` via `contextBridge`, sur la fenêtre globale `window.electronAPI`. Les noms de canaux sont centralisés dans `electron/ipc-channels.ts` pour éviter toute divergence entre les deux côtés du bridge.

Le classement par équipes est calculé côté renderer (`useRanking` → `computeTeamRanking`) plutôt que via IPC : cela évite un aller-retour à chaque changement de top N ou de catégorie. Les canaux IPC de calcul/sauvegarde de classement existent et sont testés, mais ne sont pas encore appelés — réservés à un usage futur (historique de classements).

## Configuration Electron

La fenêtre principale (`BrowserWindow`) est configurée avec `autoHideMenuBar: true` — la barre de menus native est cachée par défaut et accessible via la touche Alt. Le layout utilise une sidebar en position `fixed` et un header `sticky` : seul le contenu principal (`<main>`) défile, la sidebar et le header restent visibles en permanence.

## Versioning, installeur et auto-update (Phase 10)

- **Versioning automatique** : `release-please` lit les commits Conventional Commits sur `main` et maintient une PR de release qui bump `package.json` et `CHANGELOG.md`. Fusionner cette PR crée le tag, la GitHub Release et le changelog automatiquement — plus de bump manuel.
- **Garde-fous Conventional Commits** (condition dont dépend le calcul de version) : `commitlint` (hook Husky `commit-msg`, config `commitlint.config.js`) bloque localement tout commit non conforme ; `.github/workflows/commitlint-pr.yml` vérifie en CI le **titre de chaque PR**, car les PR sont fusionnées en squash et c'est ce titre qui devient le commit lu par `release-please` sur `main`.
- **Build & publication** : un seul workflow, `.github/workflows/release-please.yml`, à deux jobs. Le job `release-please` crée ou met à jour la PR de release ; quand une release vient d'être créée (sortie `release_created`), le job `build-windows` (Node 24) se place sur le tag, construit l'installeur (`npm run build:win -- --publish never`) et attache `.exe`, `latest.yml` et `.blockmap` à cette release. Les deux étapes sont dans le même workflow parce qu'une release publiée avec le `GITHUB_TOKEN` par défaut ne déclenche aucun autre workflow : un workflow séparé `on: release` ne se lancerait jamais.
- **Installeur** : NSIS personnalisé (`build.nsis` dans `package.json`) — choix du dossier d'installation, raccourci bureau, pas de mode one-click. Le fichier s'appelle `MDLM-Ranking-Setup-<version>.exe` (`artifactName`), sans espace : `electron-builder` écrit dans `latest.yml` un nom où les espaces deviennent des tirets, alors que GitHub remplace les espaces par des points dans le nom des fichiers attachés à une release. Avec des espaces, le fichier désigné par `latest.yml` n'existerait donc jamais sur la release et chaque téléchargement de mise à jour échouerait. Pas de signature de code (déploiement à un seul poste non technique) ; l'avertissement SmartScreen est accepté.
- **Auto-updater in-app** : `electron/auto-updater.ts` (`electron-updater`) vérifie les mises à jour une fois au démarrage, télécharge silencieusement, et notifie le renderer via le canal IPC `update:downloaded` (main → renderer). Le composant `UpdateToast` (`src/components/layout/UpdateToast.tsx`, monté dans `AppShell`) propose "Redémarrer maintenant" — le renderer invoque alors le canal `update:quitAndInstall` (renderer → main), qui appelle `autoUpdater.quitAndInstall()` — ou "Plus tard" : dans ce cas, `autoInstallOnAppQuit` installe la mise à jour à la prochaine fermeture naturelle de l'app. Les échecs de vérification (hors ligne, etc.) sont absorbés silencieusement.

## Organisation des dossiers

```
├── electron/
│   ├── main.ts               # Process principal Electron
│   ├── preload.ts            # Context bridge IPC
│   ├── ipc-handlers.ts       # Handlers filesystem + SQLite
│   ├── ipc-channels.ts       # Noms de canaux IPC partagés
│   └── auto-updater.ts       # Vérification et téléchargement des mises à jour
├── src/
│   ├── main.tsx               # Point d'entrée React
│   ├── App.tsx                # Routeur principal
│   ├── lib/
│   │   ├── csv-parser.ts      # Parseur CSV FFN extraNat
│   │   ├── ranking-engine.ts  # Algorithme de classement
│   │   ├── db-schema.ts       # Schéma SQLite et migrations
│   │   ├── db.ts              # Opérations CRUD SQLite
│   │   ├── export-data.ts     # Métadonnées et helpers pour les exports
│   │   ├── pdf-export.tsx     # Génération PDF
│   │   ├── excel-export.ts    # Génération Excel
│   │   ├── download.ts        # Déclenchement du téléchargement navigateur
│   │   └── utils.ts           # Helpers (formatPoints, cn, etc.)
│   ├── hooks/
│   │   ├── use-meeting.ts
│   │   ├── use-import.ts
│   │   ├── use-ranking.ts
│   │   ├── use-meeting-rows.ts
│   │   ├── use-print-export.ts
│   │   └── use-auto-update.ts
│   ├── components/
│   │   ├── layout/            # AppShell, Sidebar, Header, UpdateToast
│   │   ├── meeting/            # MeetingCard, MeetingList, MeetingForm
│   │   ├── import/             # DropZone
│   │   ├── ranking/            # TeamRankingTable, TeamRow, SwimmerDetail, CategoryTabs, RankingToolbar
│   │   └── settings/           # SettingsForm
│   └── pages/
│       ├── HomePage.tsx
│       ├── ImportPage.tsx
│       ├── RankingPage.tsx
│       └── SettingsPage.tsx
├── test/
│   └── *.test.ts
└── docs/
    ├── architecture.md
    ├── screens.md
    ├── data-model.md
    ├── design-system.md
    ├── algorithms.md
    └── archive/                # Specs et plans des phases précédentes
```

# Architecture

> Décrit l'état actuel de l'application. Mis à jour à chaque changement de comportement. Ce fichier contient **la seule arborescence** du dépôt (voir « Organisation des dossiers ») ; un test (`test/docs-architecture.test.ts`) vérifie que chaque fichier de `src/lib/`, `src/hooks/` et `electron/` y figure.

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

**Mouvements après un réimport** : `insertSwimmerResults` range, dans la même transaction et avant toute écriture, les lignes existantes dans `import_snapshot` (un seul instantané par meeting : celui d'avant le dernier import). Le canal `import:getSnapshot` le renvoie ; le renderer calcule lui-même les flèches (`rankMovements`) en reclassant l'instantané avec la catégorie, le top N et le seuil affichés, et le résumé de l'écran Import (`summarizeImportChanges`). L'instantané n'est pas inclus dans `BackupData` : après une restauration, il n'y a plus d'import précédent à comparer.

Le classement par équipes est calculé côté renderer (`useRanking` → `computeTeamRanking`) plutôt que via IPC : cela évite un aller-retour à chaque changement de top N ou de catégorie.

**Canaux déclarés mais jamais appelés par le renderer** (dette connue, à trancher dans une issue séparée — règle « pas de code mort ») :
- `ranking:compute` / `ranking:save` : le premier calcule et persiste (`saveTeamRanking`), le second est un no-op. Les handlers existent et `saveTeamRanking` est testé (`test/db.test.ts`), mais aucun écran ne les invoque.
- `export:pdf` / `export:excel` : handlers qui lèvent « not implemented ». Les exports passent en réalité par le renderer (`pdf-export.tsx`, `excel-export.ts`, `download.ts`).

## Sauvegarde et restauration (Phase 9)

### Flux de sauvegarde et restauration

```
SQLite (meeting, swimmer_result, team_ranking)
    ↓
exportDatabase() [src/lib/backup.ts]
    ↓
BackupData (JSON : version, appName, exportedAt, meetings[])
    ↓
Fichier .json sur disque
    ↓
validateBackup() [src/lib/backup-validation.ts]
    ↓
restoreDatabase() [src/lib/backup.ts]
    ↓
SQLite (remplacement complet — tous les meetings existants sont supprimés avant l'insertion des meetings du fichier)
```

### Sauvegardes automatiques

Les sauvegardes automatiques s'exécutent dans `electron/auto-backup.ts` après chaque import CSV réussi (trigger point : fin de `insertSwimmerResults` dans `import:csv` handler). Elles ne bloquent jamais l'import — tout défaut de sauvegarde est journalisé et ignoré (`performAutoBackup` enveloppe le code dans un try/catch qui swallow les erreurs).

La configuration des sauvegardes (`backupDir` et `maxBackups`) est stockée dans un fichier JSON distinct (`backup-config.json`) sous `app.getPath('userData')`, en dehors de SQLite. Cela garantit que la config survit à une restauration complète de la base (la restauration ne touche que les tables SQLite, pas le système de fichiers Electron).

### Canaux IPC pour backup/restore

Canaux IPC de `electron/ipc-channels.ts` :

- `backup:export` — exporte la base entière en JSON
- `backup:import` — valide un fichier JSON importé
- `backup:confirm-import` — enregistre l'import après confirmation de l'utilisateur
- `backup:cancel-import` — libère l'import en attente côté main quand l'utilisateur annule l'aperçu
- `backup:get-config` — charge la config de sauvegarde automatique
- `backup:set-config` — enregistre la config de sauvegarde automatique
- `backup:choose-dir` — ouvre un dialogue pour sélectionner le dossier de sauvegarde

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
├── CLAUDE.md                      # Porte d'entrée IA : résumé, règles, liens (pas d'arborescence)
├── README.md                      # Présentation, installation, commandes, liens
├── .ai/                           # Règles de collaboration IA (conventions, PR, tests, revue…)
├── electron/
│   ├── main.ts                    # Process principal Electron
│   ├── preload.ts                 # Context bridge IPC
│   ├── ipc-handlers.ts            # Handlers filesystem + SQLite
│   ├── ipc-channels.ts            # Noms de canaux IPC partagés
│   ├── auto-backup.ts             # Sauvegarde automatique après import CSV, avec rotation
│   └── auto-updater.ts            # Vérification et téléchargement des mises à jour
├── src/
│   ├── main.tsx                   # Point d'entrée React
│   ├── App.tsx                    # Routeur principal
│   ├── lib/                       # Logique pure, indépendante de React
│   │   ├── csv-parser.ts          # Parseur CSV FFN extraNat
│   │   ├── ranking-engine.ts      # Classement par équipes
│   │   ├── rank-ties.ts           # Rangs ex-aequo, détection des égalités sur le podium
│   │   ├── individual-ranking.ts  # Classement individuel, détection du genre
│   │   ├── fun-awards.ts          # Prix rigolos du palmarès
│   │   ├── db-schema.ts           # Schéma SQLite et migrations
│   │   ├── db.ts                  # Opérations CRUD SQLite
│   │   ├── import-snapshot.ts     # Instantané des résultats d'avant le dernier import (table import_snapshot)
│   │   ├── import-diff.ts         # Mouvements de rang et résumé des changements entre deux imports
│   │   ├── backup.ts              # Export/restauration complète de la base en JSON
│   │   ├── backup-validation.ts   # Types de sauvegarde et validation d'un fichier externe
│   │   ├── export-data.ts         # Métadonnées et helpers pour les exports
│   │   ├── pdf-export.tsx         # PDF du classement par équipes
│   │   ├── excel-export.ts        # Excel du classement par équipes
│   │   ├── individual-pdf-export.tsx   # PDF du classement individuel
│   │   ├── individual-excel-export.ts  # Excel du classement individuel
│   │   ├── download.ts            # Déclenchement du téléchargement navigateur
│   │   ├── focus-trap.ts          # Calcul du focus suivant dans une modale
│   │   ├── ui-labels.ts           # Libellés et valeurs d'affichage dérivés des données
│   │   └── utils.ts               # Helpers (formatPoints, cn, etc.)
│   ├── hooks/
│   │   ├── use-meeting.ts         # Meetings : liste, création, mise à jour, suppression
│   │   ├── use-meeting-rows.ts    # Lignes nageurs d'un meeting (cache)
│   │   ├── use-previous-rows.ts   # Résultats d'avant le dernier import (instantané), pour les flèches de mouvement
│   │   ├── use-import.ts          # Import CSV (parse, aperçu, persistance)
│   │   ├── use-ranking.ts         # Classement par équipes (catégorie, top N, recherche)
│   │   ├── use-print-export.ts    # Exports PDF/Excel du classement par équipes (nom hérité, voir note)
│   │   ├── use-individual-export.ts # Exports PDF/Excel du classement individuel
│   │   ├── use-modal-keyboard.ts  # Échap, piège à focus et restitution du focus des modales
│   │   ├── use-app-version.ts     # Version de l'app
│   │   └── use-auto-update.ts     # Notification de mise à jour téléchargée
│   ├── components/
│   │   ├── layout/                # AppShell, Sidebar, SidebarMeetingCard, PageHeader, FilterBar, UpdateToast
│   │   ├── meeting/               # MeetingCard, MeetingList, MeetingForm, ResumeMeetingCard, DeleteMeetingDialog
│   │   ├── import/                # DropZone, StatTile, ImportChanges
│   │   ├── ranking/               # TeamRankingTable, TeamRow, SwimmerDetail, CategoryTabs, RankingToolbar,
│   │   │                          # PodiumCards, ExportActions, IndividualRankingTable, FunAwardsGrid
│   │   ├── settings/              # SettingsForm, BackupSection, BackupConfigSection
│   │   └── ui/                    # Button, Segmented, SearchField, ImportPendingBadge, RankChip, ClubTag, MovementBadge
│   ├── pages/                     # HomePage, ImportPage, RankingPage, IndividualPage, PalmaresPage, SettingsPage
│   ├── styles/
│   │   ├── globals.css            # Tailwind base + custom properties (tokens)
│   │   └── fonts.css              # Déclarations @font-face (polices embarquées)
│   └── assets/fonts/              # Barlow / Barlow Condensed (.woff2), embarquées hors ligne
├── test/                          # Tests Vitest : un fichier par module de src/lib et electron, plus les
│   │                              # garde-fous design-tokens, no-legacy-tokens et docs-architecture
│   └── fixtures/                  # sample.csv (vrai CSV Latin-1), expected-ranking.json, CSV d'essais manuels
├── resources/icon.png
└── docs/
    ├── architecture.md            # Ce fichier
    ├── screens.md
    ├── data-model.md
    ├── design-system.md
    ├── algorithms.md
    └── archive/                   # Specs et plans des phases terminées (historique figé, ne pas mettre à jour)
```

**Nommage hérité** : `use-print-export.ts` (`usePrintExport`, `buildPrintMeta` dans `export-data.ts`) garde le mot « print » bien que l'impression ait été retirée en Phase 6. Il pilote en réalité les exports PDF/Excel ; le renommage est volontairement laissé hors de la remise à plat de la documentation.

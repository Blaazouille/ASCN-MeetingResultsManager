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
validateBackup() [src/lib/backup.ts]
    ↓
restoreDatabase() [src/lib/backup.ts]
    ↓
SQLite (skip des meetings existants par défaut, ou remplacement si l'option overwrite est cochée)
```

### Sauvegardes automatiques

Les sauvegardes automatiques s'exécutent dans `electron/auto-backup.ts` après chaque import CSV réussi (trigger point : fin de `insertSwimmerResults` dans `import:csv` handler). Elles ne bloquent jamais l'import — tout défaut de sauvegarde est journalisé et ignoré (`performAutoBackup` enveloppe le code dans un try/catch qui swallow les erreurs).

La configuration des sauvegardes (`backupDir` et `maxBackups`) est stockée dans un fichier JSON distinct (`backup-config.json`) sous `app.getPath('userData')`, en dehors de SQLite. Cela garantit que la config survit à une restauration complète de la base (la restauration ne touche que les tables SQLite, pas le système de fichiers Electron).

### Canaux IPC pour backup/restore

Nouveaux canaux IPC enregistrés dans `electron/ipc-channels.ts` :

- `backup:export` — exporte la base entière en JSON
- `backup:import` — valide un fichier JSON importé
- `backup:confirm-import` — enregistre l'import après confirmation de l'utilisateur
- `backup:get-config` — charge la config de sauvegarde automatique
- `backup:set-config` — enregistre la config de sauvegarde automatique
- `backup:choose-dir` — ouvre un dialogue pour sélectionner le dossier de sauvegarde

## Configuration Electron

La fenêtre principale (`BrowserWindow`) est configurée avec `autoHideMenuBar: true` — la barre de menus native est cachée par défaut et accessible via la touche Alt. Le layout utilise une sidebar en position `fixed` et un header `sticky` : seul le contenu principal (`<main>`) défile, la sidebar et le header restent visibles en permanence.

## Versioning, installeur et auto-update (Phase 10 — non démarré)

Non implémenté pour l'instant : l'app est buildée et installée manuellement sur un seul poste. À prévoir quand la diffusion sort de ce cadre (plusieurs postes/bénévoles).

- **Versioning automatique** : dériver la version de `package.json` des commits (Conventional Commits + `semantic-release` ou équivalent), au lieu du bump manuel actuel documenté dans `.ai/pull-request.md`. Générer les release notes depuis les messages de commit.
- **Installeur** : remplacer l'installeur NSIS par défaut d'`electron-builder` par une configuration NSIS personnalisée (branding ASCN, choix du dossier, raccourcis) côté Windows ; signer le `.dmg` côté macOS pour éviter l'avertissement Gatekeeper.
- **Auto-updater in-app** : intégrer `electron-updater` (ou équivalent) pointant vers un canal de releases (GitHub Releases par ex.), avec vérification au démarrage et installation différée pour ne pas interrompre un meeting en cours.

Cette phase ne doit être lancée que lorsque le besoin réel apparaît (voir `CLAUDE.md` → Plan de construction, Phase 10).

## Organisation des dossiers

```
├── electron/
│   ├── main.ts               # Process principal Electron
│   ├── preload.ts            # Context bridge IPC
│   ├── ipc-handlers.ts       # Handlers filesystem + SQLite
│   ├── ipc-channels.ts       # Noms de canaux IPC partagés
│   └── auto-backup.ts        # Sauvegarde automatique après import CSV
├── src/
│   ├── main.tsx               # Point d'entrée React
│   ├── App.tsx                # Routeur principal
│   ├── lib/
│   │   ├── csv-parser.ts      # Parseur CSV FFN extraNat
│   │   ├── ranking-engine.ts  # Algorithme de classement
│   │   ├── db-schema.ts       # Schéma SQLite et migrations
│   │   ├── db.ts              # Opérations CRUD SQLite
│   │   ├── backup.ts          # Export/import complet de la base en JSON
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
│   │   └── use-print-export.ts
│   ├── components/
│   │   ├── layout/            # AppShell, Sidebar, Header
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

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

## Organisation des dossiers

```
├── electron/
│   ├── main.ts               # Process principal Electron
│   ├── preload.ts            # Context bridge IPC
│   ├── ipc-handlers.ts       # Handlers filesystem + SQLite
│   └── ipc-channels.ts       # Noms de canaux IPC partagés
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

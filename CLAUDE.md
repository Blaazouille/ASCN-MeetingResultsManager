# ASCN Meeting Results Manager

> Application desktop locale de gestion des classements par équipes pour le Meeting de la Mer (AS Cherbourg Natation).

## Résumé du projet

Remplacement d'une base Microsoft Access par une app Electron moderne. L'app importe un CSV de cotations FFN (extraNat), calcule les classements par équipes selon une règle configurable (top N nageurs par club), et produit des résultats imprimables et exportables (PDF, Excel).

**Utilisateur cible** : bénévole du club, au bord du bassin le jour du meeting, sous stress. L'interface doit être claire, rapide, sans ambiguïté.

## Stack technique

- **Frontend** : React 18 + Vite + TypeScript (strict)
- **Desktop** : Electron (main + renderer, IPC bridge via contextBridge)
- **UI** : shadcn/ui + Tailwind CSS + Lucide icons
- **Tableaux** : TanStack Table (headless)
- **Persistance** : SQLite via better-sqlite3 (main process uniquement)
- **CSV** : Papa Parse (auto-détection encodage + délimiteur)
- **Export PDF** : @react-pdf/renderer
- **Export Excel** : ExcelJS
- **Tests** : Vitest

## Architecture

```
Application locale, zéro serveur, zéro réseau.
CSV (Latin-1) → Parseur → Moteur de calcul → UI React
                                            → SQLite (historique)
                                            → PDF / XLSX (export)
```

Le parseur CSV et le moteur de calcul sont dans `src/lib/`, indépendants de React, testables unitairement.

## Format du CSV source (FFN extraNat)

- **Encodage** : Latin-1 (ISO 8859-1) — PAS UTF-8
- **Délimiteur** : point-virgule (`;`)
- **Colonnes** : `name;place;lastname;firstname;birthyear;nation;club;points;comment`
- **Points** : format texte `"1274 Pts"` → extraire la valeur numérique avec regex `(\d+)`
- **Catégories** : la colonne `name` contient le nom de la catégorie ("Classement Dames", "Classement Messieurs", "Classement Mixte")
- Le fichier fixture de test est dans `test/fixtures/sample.csv`

## Algorithme de classement par équipes

```
1. Filtrer les lignes où name === catégorie choisie (ex: "Classement Mixte")
2. Grouper par club
3. Pour chaque club :
   a. Trier les nageurs par points DESC
   b. Prendre les top min(N, nombre_de_nageurs) — N configurable, défaut 5
   c. Sommer leurs points → totalPoints
4. Trier les clubs par totalPoints DESC
5. Attribuer le rang (1-indexed, sans gaps)
```

**Résultat de référence** (Classement Mixte, top 5) — doit correspondre exactement :

| Rang | Club | Points |
|------|------|--------|
| 1 | CN VIRY-CHÂTILLON | 5841 |
| 2 | BOULOGNE BILLANCOURT NATATION | 5364 |
| 3 | AC CHERBOURG EN COTENTIN | 5201 |
| 4 | UAS ST-CLOUD | 5191 |
| 5 | EN CAEN | 5155 |
| 38 | CN BERGERAC | 561 |

Les 38 clubs doivent correspondre au fichier `test/fixtures/expected-ranking.json`.

## Design System

### Couleurs

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#0A3663` | Navbar, sidebar, headers structurels |
| `secondary` | `#00A4E4` | États actifs, tabs, liens, boutons secondaires |
| `accent` | `#FF6B35` | CTA, badges podium (1er/2e/3e), alertes |
| `neutral-0` | `#FFFFFF` | Fond des cartes |
| `neutral-50` | `#F4F7F6` | Fond de page |
| `neutral-900` | `#1A2332` | Texte principal |
| `neutral-600` | `#5B6B7D` | Texte secondaire |
| `success` | `#22C55E` | Validation, import OK |
| `warning` | `#F59E0B` | Statut provisoire |
| `error` | `#EF4444` | Erreurs |

Décliner chaque couleur en palette 50→900 dans `globals.css` (voir `docs/technical-design.md` §2).

### Typographie

- **Display / Headings** : Montserrat (600, 700)
- **Body / UI** : Inter (400, 500)
- **Data / Monospace** : JetBrains Mono (500, 700)

### Composants

- Border-radius : 8px (cartes/boutons), 6px (inputs), 4px (badges)
- Ombres : `0 1px 3px rgba(10,54,99,0.08), 0 1px 2px rgba(10,54,99,0.06)`
- Espacement : grille de 4px
- Transitions : 150ms ease
- Light mode uniquement (MVP)

## Structure du projet

```
├── CLAUDE.md                 ← Ce fichier
├── docs/
│   ├── design-prompt.md      # Spec des écrans UI (5 écrans + composants)
│   └── technical-design.md   # Spec technique complète (tokens, types, composants, IPC)
├── electron/
│   ├── main.ts               # Process principal Electron
│   ├── preload.ts            # Context bridge IPC
│   └── ipc-handlers.ts       # Handlers filesystem + SQLite
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── lib/
│   │   ├── csv-parser.ts     # Parseur CSV (wrapper Papa Parse)
│   │   ├── ranking-engine.ts # Algorithme de classement
│   │   ├── db.ts             # Opérations SQLite
│   │   ├── pdf-export.ts     # Génération PDF
│   │   ├── excel-export.ts   # Génération Excel
│   │   └── utils.ts          # Helpers (formatPoints, cn, etc.)
│   ├── hooks/
│   │   ├── use-meeting.ts
│   │   ├── use-import.ts
│   │   └── use-ranking.ts
│   ├── components/
│   │   ├── ui/               # shadcn/ui (généré)
│   │   ├── layout/           # AppShell, Sidebar, Header
│   │   ├── meeting/          # MeetingCard, MeetingList, MeetingForm
│   │   ├── import/           # DropZone, CsvPreview, ColumnMapper
│   │   ├── ranking/          # TeamRankingTable, TeamRow, SwimmerDetail, CategoryTabs
│   │   ├── print/            # PrintPreview, A4Page, PrintControls
│   │   └── settings/         # SettingsForm
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── ImportPage.tsx
│   │   ├── RankingPage.tsx
│   │   ├── PrintPage.tsx
│   │   └── SettingsPage.tsx
│   └── styles/
│       └── globals.css       # Tailwind base + custom properties
├── test/
│   ├── csv-parser.test.ts
│   ├── ranking-engine.test.ts
│   └── fixtures/
│       ├── sample.csv        # Vrai CSV Latin-1 du Meeting de la Mer
│       └── expected-ranking.json
└── resources/
    └── icon.png
```

## Conventions de code

### TypeScript
- `strict: true`, pas de `any` (utiliser `unknown` + type guards)
- `interface` pour les shapes, `type` pour unions/intersections
- Typer explicitement paramètres et retours de fonction

### React
- Composants fonctionnels uniquement
- Logique métier dans les hooks custom, pas dans les composants
- Props : `{ComponentName}Props`
- `React.memo()` pour les lignes de tableau lourdes
- Error boundaries par page

### Nommage des fichiers
- Composants : `PascalCase.tsx`
- Hooks : `use-kebab-case.ts`
- Lib/utils : `kebab-case.ts`

### CSS / Tailwind
- Classes utilitaires Tailwind dans le JSX
- CSS custom uniquement pour les styles d'impression et animations complexes
- Pas de `style` inline sauf valeurs dynamiques
- Utiliser `cn()` (clsx + tailwind-merge) pour les classes conditionnelles

### Formatage des nombres
- Points avec espace insécable comme séparateur de milliers : `5 841`
- `formatPoints(n: number): string` dans `utils.ts`
- `font-variant-numeric: tabular-nums` sur toutes les colonnes numériques

### Langue
- UI entièrement en français, pas de bibliothèque i18n
- Ponctuation française (espace insécable avant `:`, `;`, `!`, `?`)
- Dates : `Intl.DateTimeFormat` avec `fr-FR` → "16 nov. 2026"

## Écrans (MVP)

1. **Accueil** — Liste des meetings, créer/ouvrir
2. **Import** — Drag & drop CSV, preview, validation colonnes
3. **Classement** — Tableau des clubs avec drill-down nageurs, filtres par catégorie, sélecteur top N
4. **Impression** — Aperçu A4, export PDF, impression directe
5. **Paramètres** — Config meeting (nom, date, lieu, statut) et règles de calcul (top N, catégories)

Les specs détaillées de chaque écran sont dans `docs/design-prompt.md`.

## Modèle de données (SQLite)

3 tables : `meeting`, `swimmer_result`, `team_ranking`. Schéma complet dans `docs/technical-design.md` §5.

La base SQLite tourne dans le **main process** Electron. Le renderer communique via IPC (`contextBridge`). L'interface IPC est définie dans `docs/technical-design.md` §5.

## Commandes

```bash
npm install          # Installer les dépendances
npm run dev          # Dev mode (Vite + Electron)
npm run test         # Tests unitaires (Vitest)
npm run build:win    # Build Windows (.exe)
npm run build:mac    # Build macOS (.dmg)
```

## Plan de construction

| Phase | Contenu | Livrable |
|-------|---------|----------|
| 1 | Scaffold + parseur CSV + DropZone + design tokens | Import fonctionnel |
| 2 | Moteur de calcul + tableau de classement + tests | Classement affiché |
| 3 | Export PDF + Excel + aperçu impression | Exports fonctionnels |
| 4 | SQLite + historique + packaging Electron | App installable |
| 5 | Multi-classements, personnalisation, polish | Version complète |

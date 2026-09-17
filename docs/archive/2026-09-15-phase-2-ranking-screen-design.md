# Phase 2 — Écran Classement : Design

> Date : 2026-09-15
> Statut : Approuvé

## Contexte

Le moteur de calcul (`src/lib/ranking-engine.ts`) et le parseur CSV (`src/lib/csv-parser.ts`) ont été livrés en Phase 1, avec `DropZone.tsx` pour l'import. La Phase 2 du plan de construction (CLAUDE.md) livre l'écran Classement : tableau des clubs avec drill-down nageurs, filtres par catégorie, sélecteur Top N — et branche l'app sur un routing complet puisque le moteur de calcul était déjà prêt en avance.

## Portée

**Inclus dans cette phase :**
- AppShell + routing (`react-router-dom`) avec Sidebar 5 sections
- Migration du flux d'import actuel (`App.tsx`) vers `ImportPage`
- `RankingPage` avec tableau de classement, catégories, sélecteur Top N, drill-down nageurs, recherche par club
- Hooks `use-import.ts` et `use-ranking.ts`
- Tests pour la nouvelle logique (hooks) ; les tests de `ranking-engine.ts` existent déjà

**Hors scope (phases suivantes) :**
- HomePage, PrintPage, SettingsPage : placeholders non fonctionnels uniquement
- SQLite / persistance meeting (phase 4)
- Export PDF / Excel (phase 3)
- shadcn/ui (report à une phase ultérieure si besoin — Tailwind pur pour rester cohérent avec la Phase 1)

## Architecture

```
App.tsx
  └─ BrowserRouter
       └─ AppShell (Sidebar + Header + <Outlet/>)
            ├─ /              → HomePage (placeholder)
            ├─ /import        → ImportPage (logique DropZone existante)
            ├─ /classement    → RankingPage
            ├─ /impression    → PrintPage (placeholder)
            └─ /parametres    → SettingsPage (placeholder)
```

**Partage d'état Import → Classement** : pas de store global, pas de SQLite à ce stade.
`use-import.ts` encapsule le parsing (`parseCsv`) et l'état (`result`, `fileName`, `error`).
Le state est détenu au niveau `App.tsx` (ou un Context React léger si le prop drilling devient gênant) et transmis à `RankingPage` — qui redirige vers `/import` si aucun résultat n'est disponible.

## Composants

| Composant | Rôle |
|---|---|
| `layout/AppShell.tsx` | Layout général : sidebar 220px `bg-primary-800` + zone de contenu |
| `layout/Sidebar.tsx` | Navigation 5 items, icônes + labels, état actif en `secondary` |
| `layout/Header.tsx` | Barre du haut, contexte meeting (vide pour l'instant) |
| `ranking/CategoryTabs.tsx` | Tabs Mixte / Dames / Messieurs |
| `ranking/RankingToolbar.tsx` | Sélecteur Top N (3/5/7/10), badge statut "Provisoire" fixe |
| `ranking/TeamRankingTable.tsx` | Table TanStack : Rang, Club, Points, Nageurs, Expand |
| `ranking/TeamRow.tsx` | Ligne club, gère l'expansion |
| `ranking/SwimmerDetail.tsx` | Sous-tableau : rang individuel, nom, année, points |

**Règles de rendu** :
- Podium (rangs 1-3) : badge coloré (or/argent/bronze, dérivés de `accent`)
- Club "AS CHERBOURG NATATION" (ASCN) : mise en valeur (bordure `secondary`)
- Recherche par club : filtre client-side sur le nom, pas de dépendance ajoutée
- `formatPoints()` (existant) réutilisé pour l'affichage des points

## Hooks

- `hooks/use-import.ts` : `{ result, fileName, error, handleFileAccepted, handleFileRejected }`
- `hooks/use-ranking.ts` : `{ category, setCategory, topN, setTopN, teamResults }` — `computeTeamRanking()` mémoïsé (`useMemo`) sur `[rows, category, topN]`

## Tests

- `test/ranking-engine.test.ts` : déjà existant, valide l'algorithme contre `test/fixtures/expected-ranking.json` (38 clubs, Classement Mixte top 5)
- Nouveaux tests à écrire en TDD pendant l'implémentation : `use-ranking` (sélection catégorie/topN, recalcul), et tout autre point de logique non trivial identifié pendant l'implémentation

## Décisions actées (issues du brainstorming)

1. AppShell + routing dès la Phase 2 (plutôt que reporté à la Phase 4)
2. Tailwind pur, pas de shadcn/ui pour l'instant
3. Pages non implémentées affichées comme placeholders "à venir", visibles dans la Sidebar
4. Badge "Provisoire" affiché en dur (deviendra dynamique en Phase 4 avec le modèle de données meeting)
5. Pas de store global : state simple remonté dans `App.tsx`

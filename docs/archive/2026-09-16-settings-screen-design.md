# Écran Paramètres (Phase 5) — Design

## Contexte

Phases 1–4 sont livrées : import CSV, moteur de classement, exports PDF/Excel,
persistance SQLite, historique des meetings. La page Paramètres est un
placeholder (`src/pages/SettingsPage.tsx`). Le Phase 5 du plan de
construction (CLAUDE.md) couvre "Multi-classements, personnalisation,
polish" — ce design se limite à l'écran Paramètres tel que décrit dans
`docs/design-prompt.md` §Écran 5 : configuration du meeting en cours et des
règles de calcul du classement.

Pas de multi-classements nommés/sauvegardés dans ce périmètre — un seul jeu
de règles actif par meeting, comme aujourd'hui.

## Périmètre

- Formulaire deux colonnes :
  - **Informations meeting** : nom, date, lieu, statut (Provisoire/Définitif)
  - **Règles de calcul** : top N par défaut, catégories actives (cases à
    cocher Mixte/Dames/Messieurs), seuil minimum de nageurs par club (optionnel)
- Bouton "Enregistrer", lien "Réinitialiser les valeurs par défaut"
- Le classement (`RankingPage`) adopte les valeurs sauvegardées comme point
  de départ, mais reste ajustable en session via ses propres contrôles
  existants (sélecteur Top N, onglets de catégorie).
- Correction en marge : le badge de statut dans `RankingToolbar` est codé en
  dur à "Provisoire" ; il doit refléter `meeting.status`.

## Modèle de données

### Schéma SQLite (`src/lib/db.ts`)

La table `meeting` gagne trois colonnes :

```sql
ALTER TABLE meeting ADD COLUMN default_top_n INTEGER NOT NULL DEFAULT 5;
ALTER TABLE meeting ADD COLUMN min_swimmers INTEGER NOT NULL DEFAULT 0;
ALTER TABLE meeting ADD COLUMN active_categories TEXT;  -- JSON string[] ; NULL = toutes actives
```

`min_swimmers = 0` signifie "pas de seuil" (tous les clubs conservés).
`active_categories = NULL` signifie "toutes les catégories présentes dans les
données sont actives" (comportement actuel, inchangé si l'utilisateur ne
touche jamais aux Paramètres).

### Migration

`createDatabase` exécute déjà `CREATE TABLE IF NOT EXISTS` avec
`user_version = 1`. Les nouvelles colonnes sont ajoutées :

1. Dans `SCHEMA_SQL` pour les nouvelles bases (les `CREATE TABLE` incluent
   directement les 3 colonnes).
2. Via une migration pour les bases existantes : si `PRAGMA user_version`
   vaut 1, exécuter les 3 `ALTER TABLE ADD COLUMN` ci-dessus dans un essai
   individuel par colonne (`try { ... } catch { /* colonne déjà présente */ }`
   n'est pas nécessaire si on teste `user_version` correctement), puis
   `PRAGMA user_version = 2`.

### Types (`src/lib/db.ts`)

```typescript
export interface Meeting {
  // ...existant
  defaultTopN: number;
  minSwimmers: number;
  activeCategories: string[] | null;
}

export interface MeetingInput {
  // ...existant
  defaultTopN?: number;
  minSwimmers?: number;
  activeCategories?: string[] | null;
}
```

`createMeeting` / `updateMeeting` / `rowToMeeting` étendus pour lire/écrire
ces champs (JSON.stringify/parse pour `active_categories`).

## Moteur de classement (`src/lib/ranking-engine.ts`)

`RankingParams` gagne un champ optionnel :

```typescript
export interface RankingParams {
  category: string;
  topN: number;
  /** Clubs with fewer than this many swimmers in the category are excluded entirely. Omit or 0 = no threshold. */
  minSwimmers?: number;
}
```

Dans `computeTeamRanking`, après le regroupement par club et avant le tri
final : filtrer les clubs dont `clubRows.length < (params.minSwimmers ?? 0)`.
Le filtre porte sur le nombre total de nageurs du club dans la catégorie
(`swimmerCount`), pas sur le nombre retenus après troncature au top N.

## IPC / hooks

- `useMeeting` (`src/hooks/use-meeting.ts`) expose une nouvelle méthode
  `updateMeeting(id, input): Promise<Meeting>` qui appelle
  `window.electronAPI.updateMeeting` (déjà câblé côté IPC/preload) et met à
  jour `meetings` en place (remplace l'entrée modifiée, garde le tri
  existant).
- `useRanking` (`src/hooks/use-ranking.ts`) accepte des valeurs initiales
  optionnelles (`initialTopN`, `activeCategories`) utilisées uniquement pour
  l'état initial de `topN`/`category`, et calcule désormais `computeTeamRanking`
  avec `minSwimmers` passé depuis le meeting courant. `RankingPage` passe
  `meeting.defaultTopN`, `meeting.minSwimmers`, `meeting.activeCategories`.
- `CategoryTabs` reçoit la liste des catégories déjà filtrée par
  `RankingPage` : catégories présentes dans les données **∩** catégories
  actives du meeting (si `activeCategories` n'est pas `null` et que
  l'intersection n'est pas vide ; sinon fallback sur toutes les catégories
  présentes, pour ne jamais afficher un écran vide si l'utilisateur a
  décoché toutes les catégories par erreur).

## Écran Paramètres (`src/pages/SettingsPage.tsx`)

Nouveau composant `src/components/settings/SettingsForm.tsx` :

- État local du formulaire initialisé depuis `meetingState.currentMeeting`
  (redirection vers `/` si aucun meeting actif, comme les autres pages).
- Colonne gauche : `name` (text), `date` (date picker), `location` (text),
  `status` (toggle Provisoire/Définitif).
- Colonne droite : `defaultTopN` (select parmi `TOP_N_OPTIONS` existant),
  `activeCategories` (checkboxes pour les 3 catégories fixes FFN : Mixte,
  Dames, Messieurs — liste statique, pas dérivée des données importées),
  `minSwimmers` (input numérique optionnel, vide = pas de seuil).
- "Enregistrer" : valide (nom et date non vides), appelle
  `useMeeting().updateMeeting`, affiche une confirmation ou une erreur
  (pattern déjà utilisé dans `MeetingForm`).
- "Réinitialiser les valeurs par défaut" : remet uniquement les champs de la
  colonne droite (règles de calcul) à `defaultTopN = 5`, `minSwimmers` vide,
  toutes les catégories cochées — dans l'état local du formulaire seulement,
  sans sauvegarder tant que "Enregistrer" n'est pas cliqué.

## Correction en marge : badge de statut

`RankingToolbar` reçoit une nouvelle prop `status: MeetingStatus` (passée
par `RankingPage` depuis `meeting.status`) et affiche "Provisoire" ou
"Définitif" avec la couleur correspondante (warning / success) au lieu du
texte codé en dur.

## Tests

- `ranking-engine.test.ts` : cas `minSwimmers` (club sous le seuil exclu,
  seuil 0/absent = comportement actuel inchangé).
- `db.test.ts` (ou équivalent existant) : round-trip `createMeeting` /
  `updateMeeting` avec les 3 nouveaux champs, y compris `activeCategories:
  null`.
- Pas de nouveau test end-to-end UI (hors périmètre des tests Vitest
  existants, cohérent avec les pages actuelles qui n'ont pas de tests de
  composants).

## Hors périmètre (YAGNI)

- Classements multiples/nommés par meeting.
- Personnalisation du logo/en-tête au-delà de ce qui existe déjà pour
  l'impression.
- Validation avancée du seuil minimum (ex: avertissement si le seuil exclut
  tous les clubs) — un seuil trop élevé produit simplement un classement
  vide, comme une catégorie sans données.

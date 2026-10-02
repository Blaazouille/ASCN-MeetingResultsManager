# Phase 8 — Classement individuel & Palmarès des rigolos

> Ajouter un classement individuel global par points (tous catégories confondues) avec filtre par genre, et une section de prix humoristiques générés automatiquement à partir des données.

## 1. Classement individuel

### Concept
Un tableau de tous les nageurs du meeting, triés par points décroissants, indépendamment de leur catégorie ou club. L'objectif principal est de repérer rapidement les 2 meilleurs Dames et les 2 meilleurs Messieurs pour la remise des prix.

### Navigation
- Nouvel item dans la sidebar : "Individuels" avec l'icône `Users` (Lucide), positionné entre "Classement" et "Paramètres".
- Nouvelle route : `/individuels` → `IndividualPage.tsx`.

### Moteur de calcul

**Nouveau fichier : `src/lib/individual-ranking.ts`**

```typescript
interface IndividualResult {
  rank: number;
  lastname: string;
  firstname: string;
  birthyear: number;
  club: string;
  points: number;
  category: string;    // catégorie d'origine ("Classement Dames", etc.)
  gender: 'F' | 'M';  // déduit du nom de catégorie
}

function computeIndividualRanking(rows: RawSwimmerRow[]): IndividualResult[]
function detectGender(categoryName: string): 'F' | 'M'
```

**`computeIndividualRanking`** :
1. Prend tous les `RawSwimmerRow` (toutes catégories).
2. Dédoublonne si un nageur apparaît dans plusieurs catégories (garder le meilleur score). Clé de dédoublonnage : `lastname + firstname + birthyear + club`.
3. Trie par points DESC.
4. Attribue le rang (1-indexed, sans gaps).
5. Détecte le genre via le nom de catégorie ("Dames" → F, "Messieurs" → M, "Mixte" → utiliser le genre le plus probable ou ignorer — à confirmer).

**`detectGender`** :
- Si le nom de catégorie contient "Dames" → `'F'`
- Si le nom de catégorie contient "Messieurs" → `'M'`
- "Mixte" : les nageurs en Mixte apparaissent aussi dans Dames ou Messieurs. S'ils n'apparaissent que dans Mixte, on ne peut pas déterminer le genre → exclure du filtre genré, mais les garder dans le classement global.

### UI — `IndividualPage.tsx`

**Filtres** : deux onglets "Tous" / "Dames" / "Messieurs" (réutiliser le pattern `CategoryTabs`).

**Tableau** :
| Colonne | Contenu |
|---------|---------|
| Rang | Badge numérique (podium coloré pour 1-2) |
| Nom | `lastname firstname` |
| Année | `birthyear` |
| Club | Nom du club (highlight ASCN) |
| Points | `formatPoints()`, font-mono tabular-nums |
| Catégorie | Badge texte (Dames/Messieurs/Mixte) |

**Mise en valeur des lauréats** : les 2 premiers de chaque genre reçoivent un badge accent ("1er Prix", "2e Prix") à côté de leur rang.

**Recherche** : champ texte pour filtrer par nom ou club (réutiliser le pattern existant).

### Tests

**`test/individual-ranking.test.ts`** :
- Tri correct par points décroissants.
- Dédoublonnage : un nageur présent dans Mixte et Dames garde son meilleur score.
- `detectGender` : "Classement Dames" → F, "Classement Messieurs" → M, "Classement Mixte" → gestion correcte.
- Rangs 1-indexed sans gaps.
- Résultat de référence sur le fichier fixture `sample.csv`.

## 2. Palmarès des rigolos

### Concept
Prix humoristiques automatiquement calculés à partir des données du meeting. Section affichée en bas de la page `IndividualPage` ou dans un onglet dédié "Palmarès".

### Moteur de calcul

**Nouveau fichier : `src/lib/fun-awards.ts`**

```typescript
interface FunAward {
  id: string;           // identifiant unique du prix
  title: string;        // nom du prix en français
  emoji: string;        // emoji illustratif
  winner: {
    name: string;       // "DUPONT Jean"
    club: string;
    detail: string;     // explication ("Né en 1958 — 66 ans")
  };
}

function computeFunAwards(rows: RawSwimmerRow[]): FunAward[]
```

### Prix

| ID | Titre | Emoji | Logique |
|----|-------|-------|---------|
| `doyen` | Le Doyen / La Doyenne | 👴 | Nageur avec le `birthyear` le plus bas (le plus âgé) |
| `releve` | La Relève | 🌱 | Nageur avec le `birthyear` le plus élevé (le plus jeune) |
| `loup-solitaire` | Le Loup Solitaire | 🐺 | Nageur dont le club n'a qu'un seul représentant (tous catégories) |
| `photo-finish` | Le Photo-Finish | 📸 | Les deux nageurs consécutifs avec le plus petit écart de points |
| `regulier` | Le Régulier | 📏 | Nageur dont le score est le plus proche de la moyenne générale |
| `armada` | L'Armada | ⚓ | Club avec le plus grand nombre de nageurs inscrits |

### Affichage
Grille de cartes (2 ou 3 colonnes). Chaque carte :
- Emoji + titre du prix (heading)
- Nom du lauréat + club
- Détail explicatif (stat qui justifie le prix)

Style : cartes avec fond `neutral-0`, ombre `shadow-card`, coins arrondis, même design system que le reste.

### Tests

**`test/fun-awards.test.ts`** :
- Chaque prix retourne le bon gagnant sur le fichier fixture.
- Cas limites : un seul nageur, tous du même club (pas de Loup Solitaire), tous le même score (Le Régulier = n'importe qui).
- `computeFunAwards` retourne exactement 6 prix (ou moins si un prix n'a pas de gagnant valide).

## 3. Critères de validation

- [ ] La page Individuels est accessible depuis la sidebar.
- [ ] Le classement individuel trie correctement par points décroissants.
- [ ] Les filtres Dames/Messieurs fonctionnent.
- [ ] Les 2 premiers de chaque genre sont mis en valeur.
- [ ] La recherche par nom/club fonctionne.
- [ ] Les 6 prix rigolos s'affichent correctement.
- [ ] Tous les tests passent (`npm run test`).
- [ ] `npm run lint` passe.
- [ ] Tous les nouveaux fichiers ont un header comment.
- [ ] Aucun fichier ne dépasse 300 lignes.

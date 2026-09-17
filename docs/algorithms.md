# Algorithmes

## Classement par équipes

Implémenté dans `src/lib/ranking-engine.ts` (`computeTeamRanking`).

```
1. Filtrer les lignes où name === catégorie choisie (ex: "Classement Mixte")
2. Grouper par club
3. Exclure les clubs avec moins de nageurs que le seuil minSwimmers configuré (défaut : pas de seuil)
4. Pour chaque club restant :
   a. Trier les nageurs par points DESC
   b. Prendre les top min(N, nombre_de_nageurs) — N configurable, défaut 5 (issu du top N par défaut du meeting)
   c. Sommer leurs points → totalPoints
5. Trier les clubs par totalPoints DESC
6. Attribuer le rang (1-indexed, sans gaps)
```

### Résultat de référence (Classement Mixte, top 5)

| Rang | Club | Points |
|------|------|--------|
| 1 | CN VIRY-CHÂTILLON | 5841 |
| 2 | BOULOGNE BILLANCOURT NATATION | 5364 |
| 3 | AC CHERBOURG EN COTENTIN | 5201 |
| 4 | UAS ST-CLOUD | 5191 |
| 5 | EN CAEN | 5155 |
| 38 | CN BERGERAC | 561 |

Les 38 clubs doivent correspondre exactement à `test/fixtures/expected-ranking.json`.

## Recherche par club

`filterTeamResultsByClub` filtre les résultats déjà classés par nom de club, insensible à la casse. Une requête vide ou blanche retourne tous les résultats.

## Catégories actives

`resolveActiveCategories(present, active)` détermine les catégories proposées par l'écran Classement : l'intersection entre `present` (catégories réellement présentes dans les données importées) et `active` (catégories configurées dans Paramètres). `active === null` signifie « toutes actives ». Si l'intersection est vide, retombe sur toutes les catégories présentes pour ne jamais laisser un meeting sans catégorie sélectionnable.

## Classement individuel

Implémenté dans `src/lib/individual-ranking.ts` (`computeIndividualRanking`, `detectGender`, `filterByGender`).

```
1. Regrouper tous les nageurs de la session (toutes catégories)
2. Dédupliquer par (nom, prénom, année de naissance) — les doublons sont ignorés
3. Détecter le genre (Homme/Femme) pour chaque nageur :
   - Analyse du prénom français (liste de prénoms féminins / masculins)
   - Fallback : catégorie de la première occurrence (ex: "Classement Dames")
4. Filtrer optionnellement par genre (Dames, Messieurs) ou retourner tous
5. Trier par points DESC
6. Attribuer le rang (1-indexed, sans gaps)
```

### Badges de prix

- **1er Prix** : 1er nageur (toute catégories) ou 1er par genre (vue filtrée)
- **2e Prix** : 2e nageur (toute catégories) ou 2e par genre (vue filtrée)

### Recherche par nom ou club

Même logique que le classement par équipes : filtre insensible à la casse, requête vide retourne tous les résultats.

## Prix rigolos (Fun Awards)

Implémenté dans `src/lib/fun-awards.ts` (`computeFunAwards`).

6 prix humoristiques calculés sur tous les nageurs présents :

| Prix | Critère | Description |
|------|---------|-------------|
| **Doyen** | Année de naissance la plus ancienne | L'expérience, c'est bien en natation |
| **Relève** | Année de naissance la plus récente | L'avenir de la natation française |
| **Loup Solitaire** | Club unique (seul nageur du club) | Pas facile de représenter son club seul |
| **Photo-Finish** | Écart minimal (moins de 10 points) entre deux nageurs consécutifs | Des points qui se jouent à rien |
| **Régulier** | Club avec le plus de nageurs présents | Continuité et implication du club |
| **Armada** | Club avec le plus de points totalisés | Force brute du classement par équipes |

**Affichage** : section "Palmarès des rigolos" visible uniquement en vue `Tous` (non-filtrée), au bas de la page Individuels.

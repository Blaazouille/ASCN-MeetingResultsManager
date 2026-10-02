# Algorithmes

## Lecture du fichier CSV : lignes écartées

Implémenté dans `src/lib/csv-parser.ts` (`parseCsv`) et `src/lib/csv-cells.ts`. Chaque cas est signalé avec son numéro de ligne dans le fichier (ligne 1 = en-tête).

| Cellule | Contenu | Effet |
|---|---|---|
| `points` | vide | Ligne ignorée, comptée dans `ignoredRowCount` (« Lignes sans points » dans « À savoir ») |
| `points` | sans aucun chiffre (« N/A ») | **Import bloqué** : « Ligne N : points illisibles… ». Les points sont la donnée du classement : une cellule illisible signale un fichier qui n'est pas l'export attendu. |
| `place`, `birthyear` | vide ou pas un entier (« 19XX », « 1990.5 ») | Ligne ignorée, comptée dans `invalidRowCount`, avertissement qui nomme le nageur |

Pourquoi écarter la ligne plutôt que bloquer l'import pour `place` / `birthyear` : au bord du bassin, le bénévole ne peut pas corriger le fichier, et bloquer tout l'import pour une ligne le laisserait sans aucun classement. Garder la ligne n'est pas possible non plus : la valeur serait enregistrée à `NULL`, qui échappe à la contrainte `UNIQUE` et dupliquerait le nageur à chaque réimport. La ligne écartée est donc annoncée dans l'encart « À savoir » de l'écran Import, le détail (ligne, nageur, valeur lue) dans les avertissements. Un fichier sans colonne `place` ou `birthyear` n'a aucune ligne valide : il est refusé (« Aucune ligne exploitable… »).

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
6. Attribuer le rang « standard competition » (1, 2, 2, 4) : les ex-aequo partagent le rang, le suivant saute ; aucune règle de départage (à la charge du gérant)
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

Implémenté dans `src/lib/individual-ranking.ts` (`computeCategoryRanking`, `detectGender`).

```
1. Garder les lignes importées dont la catégorie est celle de l'onglet actif
2. Trier par points DESC
3. Attribuer le rang « standard competition » (1, 2, 2, 4) : les ex-aequo partagent le rang, le suivant saute ; aucune règle de départage (à la charge du gérant)
```

`detectGender` déduit le genre du NOM DE LA CATÉGORIE (« dames » → F, « messieurs » → M, sinon (Mixte) → aucun genre) pour accorder les libellés du détail nageur et du palmarès (« Née en », « La Doyenne »). Le genre n'est jamais déduit du prénom : seule la catégorie fait foi.

Chaque catégorie est classée à partir de ses propres lignes : un nageur présent en Dames et en Mixte apparaît dans les deux onglets, avec ses points de chacune. Dédoublonner entre catégories (en gardant le meilleur score) vidait l'onglet Mixte, dont les points sont plus bas que ceux de Dames et Messieurs.

### Badges de prix

L'écran Individuels (`IndividualRankingTable`) affiche « 1er Prix » et « 2e Prix » sur les nageurs de rang 1 et 2 de la vue affichée (donc de l'onglet de catégorie actif) : les ex-aequo reçoivent tous le même badge. Une égalité sur ces rangs ou sur le podium équipes déclenche un bandeau corail « à départager » (`TieBanner`, `findPodiumTies`).

### Recherche par nom ou club

Même logique que le classement par équipes : filtre insensible à la casse, requête vide retourne tous les résultats.

## Prix rigolos (Fun Awards)

Implémenté dans `src/lib/fun-awards.ts` (`computeFunAwards`). Affiché par `PalmaresPage` (écran dédié `/palmares`), qui n'envoie à la fonction que les lignes de la catégorie de l'onglet actif.

Un nageur n'est compté qu'une fois (identité : nom, prénom, année de naissance, club). Six prix, chacun omis si les données ne permettent pas de le calculer :

| Prix | Critère |
|------|---------|
| **Le Doyen / La Doyenne** | Année de naissance la plus ancienne (titre féminin si la catégorie est « Dames ») |
| **La Relève** | Année de naissance la plus récente |
| **Le Duo Mixte** | Parmi les clubs ayant exactement 1 nageuse (catégorie Dames) et 1 nageur (catégorie Messieurs), celui dont le total de points est le plus élevé |
| **Le Photo-Finish** | Plus petit écart de points entre deux nageurs consécutifs au classement (ex æquo possible) |
| **Le Club des Sages / Le Club des Grandes Dames** | Club à la moyenne d'âge la plus élevée (titre féminin si la catégorie est « Dames ») |
| **La Jeune Garde** | Club à la moyenne d'âge la plus basse |

Les deux prix par club (Sages / Jeune Garde) ne considèrent que les clubs d'au moins 3 nageurs (`MIN_CLUB_SIZE`) ayant une année de naissance valide. L'âge est calculé avec l'année civile en cours (`new Date().getFullYear()`).

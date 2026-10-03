# Algorithmes

## Lecture du fichier CSV : lignes écartées

Implémenté dans `src/lib/csv-parser.ts` (`parseCsv`), `src/lib/csv-row.ts` (`readSwimmerRow`, une ligne) et `src/lib/csv-cells.ts` (une cellule). Chaque cas est signalé avec son numéro de ligne dans le fichier (ligne 1 = en-tête).

| Cellule | Contenu | Effet |
|---|---|---|
| `points` | vide | Ligne ignorée, comptée dans `ignoredRowCount` (« Lignes sans points » dans « À savoir ») |
| `points` | sans aucun chiffre (« N/A ») | **Import bloqué** : « Ligne N : points illisibles… ». Les points sont la donnée du classement : une cellule illisible signale un fichier qui n'est pas l'export attendu. |
| `birthyear` | vide ou pas un entier (« 19XX », « 1990.5 ») | Ligne écartée ; le nageur est ajouté à `excludedSwimmers`, identifié par prénom, nom et club (deux homonymes de clubs différents sont deux nageurs), une seule fois avec la liste des catégories dont il est écarté |
| `place` | vide ou pas un entier (« 2e ») | Ligne **gardée** avec `place: null` (rang `NULL` en base), avertissement simple ; les points comptent |

Pourquoi l'année de naissance écarte la ligne : elle fait partie de l'identité du nageur, la clé `UNIQUE (meeting_id, category, lastname, firstname, birthyear, club)` de `swimmer_result`. Enregistrée à `NULL`, elle échapperait à cette clé (deux `NULL` ne sont jamais égaux en SQLite) et dupliquerait le nageur à chaque réimport. Bloquer tout l'import pour une ligne laisserait le bénévole sans aucun classement, alors qu'il ne peut pas corriger le fichier au bord du bassin. Les nageurs écartés sont donc nommés directement dans « À savoir » (« 2 nageurs non importés (année de naissance vide ou illisible dans le fichier) : Bob MARTIN (CN TEST) en Mixte ; Eve DURAND (CN TEST) en Dames et Mixte. Leurs points ne comptent pas dans ces classements. »). Le club distingue les homonymes et les catégories évitent d'écrire « dans aucun classement » pour un nageur écarté d'une catégorie mais importé dans une autre. Avant l'écriture, l'encart « Avant d'importer » ne les compte pas parmi les nageurs « absents du nouveau fichier » (`checkImportAgainstExisting`, paramètre `excluded`).

Pourquoi la place ne l'écarte pas : elle ne fait partie d'aucune clé et n'est pas affichée (les rangs individuels sont recalculés à partir des points). Un rang absent est rangé après les autres à la lecture (`ORDER BY rank IS NULL, rank`).

Colonnes absentes : sans colonne `place`, l'import se fait avec des rangs vides et un seul avertissement « Colonne manquante ». Sans colonne `points` ou `birthyear`, aucune ligne n'est exploitable : le fichier est refusé et l'erreur nomme la colonne (« Aucune ligne exploitable dans ce fichier (colonne absente : birthyear)… »). Les autres fichiers sans ligne exploitable donnent aussi leur cause (`noUsableRowCause`) : « aucune ligne avec des points », « aucune année de naissance lisible », les deux à la fois, ou un fichier qui ne contient que la ligne des titres de colonnes.

## Classement par équipes

Implémenté dans `src/lib/ranking-engine.ts` (`computeTeamRanking`).

```
1. Filtrer les lignes où name === catégorie choisie (ex: "Classement Mixte")
2. Grouper par club
3. Exclure les clubs avec moins de nageurs que le seuil minSwimmers configuré (défaut : pas de seuil) ; l'écran Classement indique combien de clubs sont ainsi exclus (`countClubsBelowThreshold`)
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

## Situation de « Notre club » (`club-summary.ts`)

`computeClubSummary(rows, ourClub, { category, topN, minSwimmers })` réutilise `computeTeamRanking` (aucun calcul de classement propre, la ligne ne peut pas contredire le tableau) pour la catégorie affichée seulement :

- **Classé** : rang (partagé si un autre club a le même total), nombre de clubs classés, total. L'écart « au-dessus » se mesure jusqu'au total strictement supérieur le plus proche (le club ex æquo ne compte pas), l'avance jusqu'au total strictement inférieur le plus proche. Pas d'écart au-dessus pour le 1er, pas d'avance pour le dernier.
- **Non classé** : le club a des nageurs dans la catégorie mais moins que le seuil.
- **Absent** : aucun nageur du club dans la catégorie (il en a dans une autre).

Résultat `null` si le club n'a aucun nageur dans le meeting : la ligne n'est pas affichée. Le club est reconnu par `isOurClub` ; le résultat garde son orthographe dans les résultats, qui sert à retrouver sa ligne dans le tableau.

## Recherche par club

`filterTeamResultsByClub` filtre les résultats déjà classés par nom de club, insensible à la casse. Une requête vide ou blanche retourne tous les résultats.

## Catégories actives

`resolveActiveCategories(present, active)` détermine les catégories proposées par les écrans Classement, Individuels et Palmarès : l'intersection entre `present` (catégories réellement présentes dans les données importées) et `active` (catégories configurées dans Paramètres). `active === null` signifie « toutes actives ». Si l'intersection est vide, retombe sur toutes les catégories présentes pour ne jamais laisser un meeting sans catégorie sélectionnable.

La catégorie affichée, commune à ces trois écrans, suit `src/lib/category-selection.ts` : `defaultCategory(categories)` renvoie la première catégorie dont le nom contient « Mixte » (insensible à la casse), sinon la première proposée (`''` si aucune) ; `resolveCategory(selected, categories)` garde le choix du bénévole tant qu'il est proposé, sinon applique `defaultCategory` ; `isStaleSelection` dit quand oublier ce choix (plus proposé, alors que la liste n'est pas vide : une liste vide veut dire « encore en chargement »). Le résumé de réimport (`summarizeImportChanges`) compte les clubs qui ont bougé dans `defaultCategory` des catégories du fichier.

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

## Déroulé de cérémonie

Implémenté dans `src/lib/ceremony-script.ts` (`buildCeremonyScript(meeting, rows, options)`), affiché par `CeremonyPage` (`/ceremonie`). Aucune logique de classement propre : chaque annonce vient des mêmes fonctions que les autres écrans, pour que la cérémonie ne puisse jamais contredire le Classement, les Individuels ou le Palmarès.

```
Pour chaque bloc coché, dans l'ordre choisi (défaut : Palmarès des rigolos, Prix individuels, Classement par équipes) :
  Pour chaque catégorie cochée pour la cérémonie, parmi les catégories actives présentes dans les données (resolveActiveCategories), dans l'ordre d'import :
    - Palmarès des rigolos : computeFunAwards sur les lignes de la catégorie, une annonce par prix
    - Prix individuels : computeCategoryRanking, rangs 1 à INDIVIDUAL_PRIZE_COUNT (2)
    - Classement par équipes : computeTeamRanking (top N et seuil du meeting), rangs 1 à N (défaut 3)
Les annonces classées sont à rebours (3e, 2e, puis 1re) ; les résultats d'un même rang forment une seule annonce (ex æquo annoncés ensemble).
```

- Filtre sur le rang, pas sur la position : des ex æquo à la dernière place annoncée sont tous gardés.
- Écart avec le suivant : points de l'annonce moins ceux du premier résultat classé en dessous ; absent s'il n'y a personne en dessous et pour les prix rigolos.
- Catégories annoncées (`ceremony-plan.ts`) : `defaultCeremonyCategories` coche les catégories dont le nom contient « mixte » (casse ignorée), ou toutes s'il n'y en a aucune. `resolveCeremonyCategories` applique le défaut tant que le gérant n'a touché à rien, garde son choix parmi les catégories disponibles, garde un choix vide tel quel (pas de retour silencieux au défaut) et ne revient au défaut que si aucune catégorie choisie ne figure plus dans les données ; `toggleCeremonyCategory` permet de tout décocher ; `isMissingCeremonyCategory` signale qu'aucune catégorie n'est cochée alors qu'il y en a à choisir (lancement et impression bloqués). Sur le fichier de référence : 10 annonces en Mixte seul, 30 avec les trois catégories.
- Points à vérifier (`ceremony-warnings.ts`) : chaque ex æquo d'une annonce classée, un dernier import de plus de 30 minutes (`STALE_IMPORT_MINUTES`), une catégorie active absente des données, une catégorie cochée sans aucune annonce (une catégorie non cochée n'est jamais signalée comme vide).

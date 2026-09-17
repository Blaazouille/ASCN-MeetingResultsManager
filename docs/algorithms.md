# Algorithmes

## Classement par équipes

Implémenté dans `src/lib/ranking-engine.ts` (`computeTeamRanking`).

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

## À venir

- Classement individuel (nageur par nageur, toutes catégories).
- Prix rigolos (fun awards) — calculs additionnels sur les mêmes données sources.

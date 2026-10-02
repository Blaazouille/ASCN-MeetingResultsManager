# MDLM Ranking — Meeting de la Mer

Application de bureau (Windows, macOS) qui calcule les classements par équipes du Meeting de la Mer (AS Cherbourg Natation). Elle importe le CSV de cotations FFN (extraNat), classe les clubs selon une règle configurable (les N meilleurs nageurs de chaque club) et exporte les résultats en PDF et Excel. Tout reste en local : aucun serveur, seule la recherche de mises à jour contacte GitHub.

Écrans : Accueil (meetings), Import CSV, Classement par équipes, Individuels, Palmarès des « rigolos », Paramètres (règles de calcul, sauvegarde et restauration).

## Installer

Télécharger `MDLM-Ranking-Setup-<version>.exe` sur la [page des releases](https://github.com/Blaazouille/ASCN-MeetingResultsManager/releases/latest). L'installeur n'est pas signé : Windows SmartScreen affiche un avertissement, choisir « Informations complémentaires » puis « Exécuter quand même ». Les mises à jour suivantes sont proposées dans l'application.

## Développer

```bash
npm install          # installer les dépendances
npm run dev          # Vite + Electron
npm run test         # tests Vitest
npm run lint         # vérification TypeScript
npm run build:win    # installeur Windows
npm run build:mac    # installeur macOS
```

Les commits suivent Conventional Commits (hook `commitlint`) ; les versions et le changelog sont gérés par `release-please`. Tout changement passe par une Pull Request.

## Documentation

- [`CLAUDE.md`](CLAUDE.md) — résumé du projet, conventions, règles
- [`docs/architecture.md`](docs/architecture.md) — stack, flux de données, IPC, arborescence
- [`docs/screens.md`](docs/screens.md) — chaque écran
- [`docs/data-model.md`](docs/data-model.md) — schéma SQLite et types
- [`docs/algorithms.md`](docs/algorithms.md) — classements et prix rigolos
- [`docs/design-system.md`](docs/design-system.md) — design « Tableau de bassin »
- `docs/archive/` — specs et plans des phases terminées

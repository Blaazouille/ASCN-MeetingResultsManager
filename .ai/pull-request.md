# Pull Request Rules

Règles obligatoires pour toute PR sur ce projet. Aucune merge sans validation complète.

## Flux obligatoire

1. Créer une branche depuis `main`
2. Coder + commiter
3. Ouvrir la PR
4. Lancer `/code-review` via un **agent isolé, sans contexte de session**
5. Corriger les findings bloquants
6. Merger uniquement si toutes les cases ci-dessous sont cochées

## Checklist de validation

### Code

- [ ] **DRY** — aucune logique dupliquée ; toute duplication est extraite en fonction ou constante partagée
- [ ] **YAGNI** — aucun code spéculatif, export inutilisé, abstraction prématurée ou fonctionnalité non demandée
- [ ] **KISS** — la solution la plus simple qui fonctionne ; pas de généricité injustifiée

### Qualité

- [ ] `npm run test` passe à 100 %
- [ ] `npx tsc --noEmit` ne retourne aucune erreur
- [ ] Aucun dead code : imports inutilisés, variables non utilisées, fonctions orphelines
- [ ] Chaque nouveau fichier a son commentaire d'en-tête (responsabilité, appelant, impact de suppression)

### UI / Textes

- [ ] Tous les textes visibles par l'utilisateur ont passé le skill `/humanizer`
- [ ] Les libellés, messages d'erreur et copies sont en français avec ponctuation correcte

### Architecture

- [ ] Aucun fichier ne dépasse 300 lignes
- [ ] Aucun fichier n'a acquis une deuxième responsabilité
- [ ] Aucune dépendance ajoutée sans approbation explicite

## Revue de code

Lancer `/code-review` en début de revue avec un **agent frais** (pas de contexte de la session courante) pour garantir une lecture objective du diff. Traiter chaque finding avant merge.

# Pull Request Rules

Règles obligatoires pour toute PR sur ce projet. Aucun merge sans validation complète.

## 🔄 Flux obligatoire

1. Créer une branche depuis `main`
2. Coder + commiter (utiliser des commits atomiques)
3. Ouvrir la PR sur le dépôt
4. Lancer `/code-review` via un **agent isolé, sans contexte de session**
5. Corriger 100% des findings bloquants remontés par l'agent
6. Merger uniquement si toute la checklist ci-dessous est validée

## 📋 Checklist de validation

### ⚙️ Conception & Principes (KISS, DRY, YAGNI)
- [ ] **DRY** — Aucune logique dupliquée. Toute duplication (≥ 3 lignes identiques) est extraite en fonction ou constante partagée.
- [ ] **YAGNI** — Aucun code spéculatif, export inutilisé, abstraction prématurée ou structure "au cas où".
- [ ] **KISS** — La solution la plus simple possible. Pas de généricité injustifiée, maximum 3 niveaux d'imbrication (if/loops) par fonction.

### 🛠️ Qualité & Validation Technique
- [ ] `npm run test` passe à 100 %.
- [ ] `npx tsc --noEmit` ne retourne aucune erreur.
- [ ] **Aucun Dead Code** — Aucun import inutilisé, variable fantôme ou fonction orpheline.
- [ ] **Documentation** — Chaque nouveau fichier possède son en-tête standardisé (Responsabilité, Appelant, Impact de suppression).

### 🎨 UI / Textes & Internationalisation
- [ ] **Humanizer** — Tous les textes visibles par l'utilisateur ont été validés par le skill `/humanizer`.
- [ ] **Règles linguistiques** — Les libellés, messages d'erreur et placeholders sont exclusivement en français, avec une typographie et ponctuation correctes.

### 📐 Architecture & Limites
- [ ] **Taille** — Aucun fichier ne dépasse les 300 lignes de code.
- [ ] **Responsabilité (SRP)** — Aucun fichier n'a acquis une seconde responsabilité ou une raison supplémentaire de changer.
- [ ] **Dépendances** — Aucun package externe (`npm install`) n'a été ajouté sans approbation explicite de l'équipe.

## 🤖 Consignes pour la Revue de Code (`/code-review`)

L'agent effectuant le `/code-review` doit impérativement démarrer sur une **session vierge** (sans historique de la phase de build).
Son rôle est de valider point par point cette checklist sur le `git diff` fourni et de lister les manquements sous forme de tâches bloquantes.

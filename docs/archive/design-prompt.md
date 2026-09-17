# ASCN Meeting Results Manager — Design Prompt

> **Objectif** : Créer des mockups haute-fidélité pour une application desktop de gestion des résultats de meeting de natation, destinée à l'AS Cherbourg Natation.

---

## Contexte du projet

L'AS Cherbourg Natation (ASCN) organise le **Meeting de la Mer**, un meeting national maîtres. Le club souhaite remplacer sa base Microsoft Access par une **application desktop locale moderne**. L'application importe des fichiers CSV de cotations FFN (Fédération Française de Natation) et calcule les classements par équipes.

**Utilisateur cible** : un bénévole du club, souvent stressé le jour du meeting, qui doit importer un fichier, lancer un calcul, et afficher/imprimer les résultats rapidement. L'interface doit être **claire, efficace et rassurante** — pas de doute sur ce qui se passe.

**Environnement d'utilisation** : PC portable au bord du bassin, potentiellement en plein soleil (forte luminosité ambiante), avec une imprimante à proximité. Les résultats imprimés sont affichés sur les murs de la piscine.

---

## Design System & Branding

### Palette de couleurs

| Rôle | Hex | Utilisation |
|------|-----|-------------|
| **Primary Blue** (Institutional) | `#0A3663` | Navbar, headers structurels, texte principal dense |
| **Secondary Blue** (Pool Glow) | `#00A4E4` | États actifs, tabs sélectionnés, liens, boutons secondaires |
| **Accent** (Energy) | `#FF6B35` | CTA principaux, badges de rang (1er, 2e, 3e), alertes, statut urgent |
| **Neutral White** | `#FFFFFF` | Fond des cartes et zones de contenu |
| **Neutral Light** | `#F4F7F6` | Fond de page, zones structurelles |
| **Text Dark** | `#1A2332` | Texte principal |
| **Text Secondary** | `#5B6B7D` | Texte secondaire, labels |
| **Success** | `#22C55E` | Validation, import réussi |
| **Warning** | `#F59E0B` | Résultats provisoires |

### Typographie

- **Display & Headings** : **Montserrat** — Semi-Bold (600) et Bold (700). Athlétique, géométrique, forte présence.
- **Body & UI** : **Inter** — Regular (400) et Medium (500). Excellente lisibilité à petite taille, conçue pour les interfaces.
- **Data & Monospace** : **JetBrains Mono** — pour les points, les rangs et les données numériques dans les tableaux.

### Composants

- **Border-radius** : `8px` pour les cartes et boutons, `6px` pour les inputs, `4px` pour les badges
- **Ombres** : subtiles, modernes — `0 1px 3px rgba(10,54,99,0.08), 0 1px 2px rgba(10,54,99,0.06)`
- **Espacement** : grille de 4px (4, 8, 12, 16, 24, 32, 48, 64)
- **États** : hover visible, focus ring bleu secondaire, disabled à 50% d'opacité
- **Transitions** : 150ms ease pour les changements d'état

---

## Écrans à maquetter

### Écran 1 — Accueil / Liste des meetings

**Rôle** : Point d'entrée de l'application. Affiche la liste des meetings précédemment créés et permet d'en créer un nouveau.

**Éléments clés** :
- Barre de navigation en haut avec le logo ASCN (texte "AS Cherbourg Natation" + icône vague stylisée), le nom de l'app "Meeting Results"
- Zone centrale avec une liste de cartes de meetings (nom, date, lieu, nombre de clubs, statut "Provisoire" ou "Définitif")
- Bouton CTA proéminent "+ Nouveau Meeting" en accent `#FF6B35`
- État vide : illustration légère avec message d'accueil invitant à créer le premier meeting
- Chaque carte de meeting a un menu contextuel (⋮) pour renommer, supprimer, exporter

**Données de démo** :
- "Meeting de la Mer 2026" — 16 nov. 2026 — Cherbourg-en-Cotentin — 38 clubs — Provisoire
- "Meeting de la Mer 2025" — 18 nov. 2025 — Cherbourg-en-Cotentin — 35 clubs — Définitif


### Écran 2 — Import CSV

**Rôle** : Charger le fichier de cotations FFN et prévisualiser les données avant calcul.

**Éléments clés** :
- Grande zone de glisser-déposer (drop zone) au centre, avec icône de fichier et texte "Déposez votre fichier CSV extraNat ici" + bouton "Parcourir"
- Après import : preview du tableau brut (10-15 premières lignes) avec les colonnes détectées
- Barre de résumé : nombre de nageurs, nombre de clubs, catégories détectées (Dames, Messieurs, Mixte), encodage détecté
- Indicateur de confiance du mapping : badges verts ✓ pour chaque colonne correctement mappée
- Bouton "Confirmer l'import" en bas
- Si erreur d'encodage : alerte orange avec suggestion de correction

**Données de démo** : les vraies données du CSV (Classement Dames, 90 nageuses ; Classement Messieurs, 121 nageurs ; Classement Mixte, 211 nageurs ; 38 clubs)


### Écran 3 — Classement par équipes (écran principal)

**Rôle** : Le cœur de l'application. Affiche le classement des clubs avec drill-down sur les nageurs.

**Éléments clés** :
- **Barre d'outils** en haut :
  - Sélecteur de catégorie (tabs ou dropdown) : "Mixte" | "Dames" | "Messieurs"
  - Sélecteur "Top N nageurs" (spinner ou dropdown : 3, 5, 7, 10)
  - Boutons d'action à droite : "Imprimer", "Export PDF", "Export Excel"
  - Badge de statut "Provisoire" (orange) ou "Définitif" (vert)
- **Tableau principal** :
  - Colonnes : Rang | Club | Points Total | Nageurs retenus
  - Rang 1-3 avec badge accent doré/argent/bronze ou mise en valeur colorée
  - Ligne expansible : cliquer sur un club déploie le détail des 5 nageurs retenus (nom, prénom, année, points individuels)
  - Alternance de fond pour lisibilité
  - Barre de recherche pour filtrer par nom de club
- **Sidebar ou footer** : résumé statistique — nombre de clubs, total de nageurs, plage de points

**Données de démo** : les 38 clubs réels avec les vrais points. Club 1 : CN VIRY-CHÂTILLON (5 841 pts), Club 2 : BOULOGNE BILLANCOURT NATATION (5 364 pts), etc. Montrer le club ASCN (AS CHERBOURG NATATION) avec une mise en valeur subtile (bordure ou fond).


### Écran 4 — Aperçu impression / PDF

**Rôle** : Preview de la mise en page A4 telle qu'elle sera imprimée et affichée dans la piscine.

**Éléments clés** :
- Rendu A4 centré dans la fenêtre, avec ombre de page (effet papier)
- **En-tête de page** : titre "Meeting de la Mer 2026" + "Classement par équipes — Mixte" + date
- **Tableau** : gros caractères (lisible à 2-3 mètres), colonnes Rang / Club / Points / Top 5 nageurs
- Alternance de fond sur les lignes
- **Pied de page** : horodatage "Calculé le 16/11/2026 à 14:32" + mention "PROVISOIRE" en watermark si applicable
- Contrôles hors page : sélecteur de catégorie, boutons "Imprimer" et "Télécharger PDF"
- Possibilité d'inclure le logo du meeting dans l'en-tête

**Spécifications typographiques pour impression** :
- Titre : Montserrat Bold 24pt
- Rang : Montserrat Bold 18pt
- Nom de club : Inter Semi-Bold 16pt
- Points : JetBrains Mono Medium 16pt
- Nageurs : Inter Regular 11pt
- Minimum de corps : 14pt pour tout texte visible à distance


### Écran 5 — Paramètres du meeting

**Rôle** : Configuration du meeting en cours et des règles de calcul.

**Éléments clés** :
- Formulaire en deux colonnes :
  - **Colonne gauche — Informations meeting** : Nom du meeting (text), Date (date picker), Lieu (text), Statut (toggle Provisoire/Définitif)
  - **Colonne droite — Règles de calcul** : Nombre de top N nageurs par club (spinner, défaut 5), Catégories actives (checkboxes : Mixte, Dames, Messieurs), Seuil minimum de nageurs par club (optionnel)
- Bouton "Enregistrer" en bas
- Lien "Réinitialiser les valeurs par défaut"

---

## Navigation

- **Sidebar à gauche** ou **tab bar en haut** (selon ce qui est plus clair)
- Sections : Accueil / Import / Classement / Impression / Paramètres
- Icônes + labels texte (pas d'icônes seules)
- L'élément actif est marqué en Secondary Blue `#00A4E4`
- La sidebar inclut le nom du meeting actif si on est dans un meeting

---

## Principes de design

1. **Clarté sous stress** : le jour du meeting, l'opérateur est pressé. Chaque écran a une action principale évidente. Pas d'ambiguïté.
2. **Feedback immédiat** : chaque action produit un retour visuel (toast, transition, changement d'état). L'utilisateur ne doute jamais de ce qui s'est passé.
3. **Données au centre** : les tableaux et chiffres sont les stars. Le chrome UI est discret.
4. **Impression first-class** : l'aperçu d'impression n'est pas un afterthought. C'est un écran à part entière, aussi soigné que le reste.
5. **Identité aquatique** : les bleus rappellent la piscine, l'accent corail apporte l'énergie de la compétition. Le tout reste professionnel et institutionnel.

---

## Contraintes techniques

- Application desktop (Electron) — les mockups doivent montrer un **chrome de fenêtre** (barre de titre avec boutons fermer/minimiser/maximiser)
- Résolution cible : 1280×800 minimum, 1440×900 nominal
- Le thème est **light mode uniquement** pour le MVP (haute luminosité au bord du bassin)
- Les tableaux doivent supporter 38+ lignes sans pagination (scroll vertical)
- Les noms de clubs peuvent être longs (ex: "BOULOGNE BILLANCOURT NATATION") — prévoir l'espace

---

## Livrables attendus

1. **5 écrans haute-fidélité** (Accueil, Import, Classement, Impression, Paramètres)
2. **1 planche de composants** (boutons, inputs, badges, cartes, dropdowns, tabs, toasts)
3. Les mockups utilisent les **vraies données** du Meeting de la Mer (38 clubs, points réels)
4. Format desktop avec chrome de fenêtre Electron

# Suppression d'un meeting — design

## Objectif

Permettre de supprimer un meeting depuis l'Accueil (utile pendant les tests ou en cas d'erreur), avec une double confirmation.

## Existant

Le backend est déjà en place : `deleteMeeting` dans `src/lib/db.ts`, canal IPC `meeting:delete`, pont `window.electronAPI.deleteMeeting`. Les résultats nageurs et classements sont supprimés en cascade (`ON DELETE CASCADE`). Il manque uniquement le hook et l'interface.

## Design

### Point d'entrée
Un bouton corbeille sur chaque ligne de `MeetingCard`. La ligne devient un conteneur de deux boutons frères (ouvrir, supprimer) : un bouton imbriqué dans un `<button>` est invalide en HTML et le clic sur la corbeille ne doit pas ouvrir le meeting. Cible tactile ≥ 44 px.

### Double confirmation (`DeleteMeetingDialog`)
Modale en deux étapes, `role="alertdialog"` :
1. **Avertissement** : « Supprimer « nom » ? », nombre de résultats, « Cette action est irréversible ». Boutons Annuler / Continuer.
2. **Saisie du nom** : le bouton « Supprimer définitivement » (rouge) n'est actif que si le nom saisi correspond exactement au nom du meeting.

Pourquoi saisir le nom plutôt qu'un second « Êtes-vous sûr ? » : un bénévole sous stress enchaîne deux clics sans lire ; taper le nom force l'attention. Échap et Annuler ferment la modale à chaque étape sans rien supprimer.

### Hook
`useMeeting` expose `deleteMeeting(id)` : appel IPC, retrait du meeting de l'état, `currentMeetingId` remis à `null` si c'était le meeting ouvert. En cas d'erreur, `error` est renseigné et l'exception est relancée (même schéma que `createMeeting` / `updateMeeting`).

### Fichiers
- `src/components/meeting/DeleteMeetingDialog.tsx` (nouveau) : la modale.
- `src/lib/ui-labels.ts` : helper pur `isDeleteConfirmed(typed, meetingName)` (trim, sensible à la casse).
- `src/components/meeting/MeetingCard.tsx`, `MeetingList.tsx`, `HomePage.tsx` : bouton corbeille et câblage.
- `src/hooks/use-meeting.ts` : `deleteMeeting`.
- `docs/screens.md` : mention de la suppression sur l'Accueil.

### Tests
- `isDeleteConfirmed` : nom exact, espaces autour, casse différente, chaîne vide.
- Hook : le meeting disparaît de la liste ; le meeting courant est réinitialisé s'il est supprimé, conservé sinon ; l'erreur IPC est propagée.
- La cascade est déjà couverte par `test/db.test.ts`.

## Hors périmètre
Corbeille / annulation après suppression, suppression multiple, suppression depuis Paramètres. Le backup automatique existant couvre les erreurs graves.

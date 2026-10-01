/**
 * Responsabilité : calcul pur de l'élément à focaliser au prochain Tab dans une modale (piège à focus).
 * Appelé par : use-modal-keyboard.ts.
 * Suppression casserait : le confinement du clavier dans les modales (Tab atteindrait la page derrière).
 */

/**
 * Index of the element that should get focus after Tab (or Shift+Tab) inside a
 * modal, or null when the browser's native move stays inside it. Only the
 * edges need intervening: from the last element Tab wraps to the first, and
 * from the first (or from outside the modal, index -1) Shift+Tab wraps to the last.
 */
export function wrapFocusIndex(currentIndex: number, count: number, shift: boolean): number | null {
  if (count === 0) return null;
  if (shift) return currentIndex <= 0 ? count - 1 : null;
  return currentIndex === count - 1 || currentIndex === -1 ? 0 : null;
}

/**
 * Responsabilité : logique pure du focus des modales — élément à focaliser au prochain Tab (piège à focus) et restitution du focus au déclencheur.
 * Appelé par : use-modal-keyboard.ts.
 * Suppression casserait : le confinement du clavier dans les modales (Tab atteindrait la page derrière) et le retour du focus à la fermeture.
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

/** The slice of an HTMLElement needed to give focus back, so the rule is testable without a DOM. */
export interface FocusTarget {
  readonly isConnected: boolean;
  focus(): void;
}

/**
 * Gives focus back to the element that had it when the modal opened, once the
 * modal has really left the page. React 18's StrictMode (dev) runs effect
 * cleanups once while the modal is still shown: restoring then would pull focus
 * behind the open modal, so a modal still in the page keeps it. The opener may
 * be gone too (e.g. its meeting was just deleted): focusing a detached node
 * does nothing useful, so it is skipped and the browser falls back to the page.
 */
export function restoreFocus(opener: FocusTarget | null, modal: Pick<FocusTarget, 'isConnected'> | null): void {
  if (modal?.isConnected) return;
  if (opener?.isConnected) opener.focus();
}

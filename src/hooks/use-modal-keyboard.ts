/**
 * Responsabilité : comportement clavier d'une modale — Échap, piège à focus (Tab), restitution du focus à la fermeture.
 * Appelé par : DeleteMeetingDialog.tsx, ImportGuardDialog.tsx.
 * Suppression casserait : la navigation clavier des modales (Tab sortirait de la modale, le focus serait perdu à la fermeture).
 */
import { useEffect, useRef, type RefObject } from 'react';
import { wrapFocusIndex } from '@/lib/focus-trap';

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), textarea:not([disabled])';

export function useModalKeyboard(
  containerRef: RefObject<HTMLElement>,
  onEscape: () => void,
  escapeEnabled: boolean,
): void {
  // Kept in a ref so callers can pass an inline arrow without re-subscribing the
  // listener on every render (each keystroke in a modal input re-renders it).
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && escapeEnabled) {
        onEscapeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !containerRef.current) return;
      const focusable = Array.from(containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      const target = wrapFocusIndex(
        focusable.indexOf(document.activeElement as HTMLElement),
        focusable.length,
        event.shiftKey,
      );
      if (target !== null) {
        event.preventDefault();
        focusable[target]?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [containerRef, escapeEnabled]);

  // Give focus back to the button that opened the modal. It may be gone by then
  // (e.g. its meeting was just deleted), hence the isConnected check.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, []);
}

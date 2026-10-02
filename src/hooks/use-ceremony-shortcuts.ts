/**
 * Responsabilité : raccourcis clavier du déroulé de cérémonie (→ / espace : suivante, ← : précédente).
 * Appelé par : use-ceremony.ts.
 * Suppression casserait : la navigation au clavier pendant la cérémonie.
 */
import { useEffect } from 'react';
import { shortcutMove, type CeremonyMove, type ShortcutKey } from '@/lib/ceremony-navigation';

function readKey(event: KeyboardEvent, dialogOpen: boolean): ShortcutKey {
  const target = event.target instanceof Element ? event.target : null;
  return {
    key: event.key,
    repeat: event.repeat,
    withModifier: event.altKey || event.ctrlKey || event.metaKey,
    inField: target?.closest('input, textarea, select') != null,
    dialogOpen,
  };
}

/**
 * Listens while `active`. A key we own is always prevented, held or not:
 * otherwise space would scroll the page or click the focused button (Chromium
 * clicks a button on the keyup that follows an unprevented space keydown, so
 * keyup is prevented too).
 */
export function useCeremonyShortcuts(active: boolean, dialogOpen: boolean, onMove: (move: CeremonyMove) => void): void {
  useEffect(() => {
    if (!active) return undefined;
    function onKeyDown(event: KeyboardEvent): void {
      const key = readKey(event, dialogOpen);
      if (shortcutMove({ ...key, repeat: false }) === null) return;
      event.preventDefault();
      const move = shortcutMove(key);
      if (move !== null) onMove(move);
    }
    function onKeyUp(event: KeyboardEvent): void {
      if (event.key === ' ' && shortcutMove(readKey(event, dialogOpen)) !== null) event.preventDefault();
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [active, dialogOpen, onMove]);
}

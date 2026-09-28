/**
 * Responsabilité : vérifie que les paires texte/fond et bordure/fond des tokens
 * « Tableau de bassin » (globals.css) atteignent les seuils de contraste WCAG AA.
 * Appelé par : Vitest.
 * Suppression casserait : la détection d'une régression de contraste dans les tokens de couleur.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// The tokens are the source of truth for every colour in the renderer, so
// their contrast is checked here once instead of screen by screen.
const css = readFileSync('src/styles/globals.css', 'utf8');

function token(name: string): string {
  const match = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6});`).exec(css);
  if (!match || !match[1]) throw new Error(`--color-${name} is missing or not a 6-digit hex value`);
  return match[1];
}

function luminance(hex: string): number {
  const rgb = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const [r, g, b] = rgb;
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(a: string, b: string): number {
  const sorted = [luminance(token(a)), luminance(token(b))].sort((x, y) => y - x);
  const [high, low] = sorted;
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05);
}

// [text colour, background it is used on]
const TEXT_PAIRS: Array<[string, string]> = [
  ['ink', 'surface-raised'],
  ['ink', 'surface'],
  ['ink-soft', 'surface-raised'],
  ['ink-soft', 'surface-sunken'],
  ['ink-muted', 'surface-raised'],
  ['ink-muted', 'surface'],
  ['ink-muted', 'surface-header'],
  ['on-marine', 'marine'],
  ['on-marine-muted', 'marine'],
  ['on-marine-muted', 'marine-raised'],
  ['on-marine-subtle', 'marine'],
  ['on-marine-faint', 'marine'],
  ['marine', 'surface-raised'],
  ['marine', 'marine-soft'],
  ['bassin-strong', 'surface-raised'],
  ['bassin-strong', 'bassin-soft'],
  ['corail-strong', 'corail-soft'],
  ['corail-strong', 'corail-wash'],
  ['ink', 'medal-gold'],
  ['ink', 'medal-silver'],
  ['ink', 'medal-bronze'],
  ['ink', 'corail-wash'],
  ['success', 'success-light'],
  ['warning', 'warning-light'],
  ['error', 'surface-raised'],
  ['on-marine', 'error'],
  // Own-club row hover state (TeamRow.tsx / TeamRankingTable.tsx): the "Écart" and
  // "Nageurs" cells show ink-muted text on these backgrounds.
  ['ink-muted', 'corail-wash'],
  ['error', 'error-light'],
  ['ink-muted', 'bassin-soft'],
  ['ink-muted', 'corail-soft'],
];

// Non-text UI: control borders, icons, the focus ring (WCAG 1.4.11).
const UI_PAIRS: Array<[string, string]> = [
  ['line-strong', 'surface-raised'],
  ['bassin-strong', 'surface-raised'],
  ['marine', 'success-bright'],
];

describe('design tokens — WCAG AA contrast', () => {
  it.each(TEXT_PAIRS)('%s text on %s reaches 4.5:1', (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)('%s on %s reaches 3:1', (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3);
  });
});

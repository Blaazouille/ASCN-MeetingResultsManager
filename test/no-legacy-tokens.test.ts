import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// Phase 11 replaced the primary/secondary/accent/neutral palettes and the mono
// font with the « Tableau de bassin » tokens. This fails if one comes back.
const LEGACY = /\b(?:bg|text|border|ring|divide|from|to|via|fill|stroke|outline|accent|placeholder|shadow)-(?:primary|secondary|accent|neutral)-\d{1,3}\b|\bfont-mono\b/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx|ts|css)$/.test(name) ? [full] : [];
  });
}

describe('legacy design tokens', () => {
  it('are no longer used in the renderer', () => {
    const offenders = sourceFiles('src').filter((file) => LEGACY.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});

/**
 * Responsabilité : garantit que chaque fichier de src/lib, src/hooks et electron
 * est mentionné dans l'arborescence de docs/architecture.md.
 * Appelé par : Vitest.
 * Suppression casserait : le garde-fou contre la dérive entre le code et la documentation.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');
const architecture = readFileSync(path.join(root, 'docs/architecture.md'), 'utf-8');

describe('docs/architecture.md', () => {
  for (const dir of ['src/lib', 'src/hooks', 'electron']) {
    it(`mentionne chaque fichier de ${dir}`, () => {
      const missing = readdirSync(path.join(root, dir)).filter((file) => !architecture.includes(file));
      expect(missing, `à ajouter dans docs/architecture.md : ${missing.join(', ')}`).toEqual([]);
    });
  }
});

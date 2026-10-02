/**
 * Responsabilité : produire le CSV d'exemple anonymisé (resources/meeting-exemple.csv) à partir du vrai export extraNat (test/fixtures/sample.csv).
 * Appelé par : `npm run anonymize-sample` (à relancer seulement si sample.csv change), test/demo-sample.test.ts.
 * Suppression casserait : la possibilité de régénérer le fichier du meeting d'entraînement ; le fichier déjà produit continuerait de fonctionner.
 *
 * Self-contained on purpose (no import from src/): it runs with
 * `node --experimental-strip-types`, which needs explicit .ts import paths
 * that the rest of the codebase doesn't use.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Kept as is: the demo must exercise the "Notre club" highlighting.
const KEPT_CLUB = 'AS CHERBOURG NATATION';

const FEMALE_FIRSTNAMES = [
  'Agathe', 'Albane', 'Alice', 'Amandine', 'Ambre', 'Anouk', 'Apolline', 'Armelle', 'Bérénice', 'Brigitte',
  'Capucine', 'Cécile', 'Célia', 'Chloé', 'Clara', 'Colette', 'Danielle', 'Diane', 'Élise', 'Emma',
  'Estelle', 'Eugénie', 'Flora', 'Gabrielle', 'Hortense', 'Inès', 'Isabelle', 'Jade', 'Jeanne', 'Joséphine',
  'Juliette', 'Lina', 'Louise', 'Lucie', 'Madeleine', 'Manon', 'Margaux', 'Martine', 'Mathilde', 'Noémie',
  'Odile', 'Pénélope', 'Rose', 'Salomé', 'Solène', 'Suzanne', 'Thérèse', 'Victoire', 'Yvette', 'Zoé',
];

const MALE_FIRSTNAMES = [
  'Adrien', 'Albert', 'Amaury', 'Armand', 'Augustin', 'Basile', 'Bastien', 'Benjamin', 'Bertrand', 'Charles',
  'Cyril', 'Damien', 'Denis', 'Édouard', 'Émile', 'Étienne', 'Félix', 'Fernand', 'Gaspard', 'Gauthier',
  'Gérard', 'Henri', 'Hervé', 'Jacques', 'Joseph', 'Jules', 'Léon', 'Loïc', 'Louis', 'Marcel',
  'Martin', 'Mathis', 'Noël', 'Octave', 'Pascal', 'Paul', 'Raphaël', 'Raymond', 'René', 'Roger',
  'Samuel', 'Simon', 'Tristan', 'Valentin', 'Victor', 'Vincent', 'William', 'Yann', 'Zacharie', 'Gustave',
];

const LASTNAMES = [
  'ADAM', 'ARNAUD', 'AUBERT', 'AUBRY', 'BAILLY', 'BARBIER', 'BARON', 'BARRE', 'BERGER', 'BERTIN',
  'BESSON', 'BLANC', 'BLANCHARD', 'BOUCHER', 'BOULANGER', 'BOURGEOIS', 'BOUVIER', 'BOYER', 'BRETON', 'BRUN',
  'BRUNET', 'CARON', 'CARPENTIER', 'CARRE', 'CHAUVIN', 'CHEVALIER', 'CLEMENT', 'COLIN', 'COLLET', 'CORDIER',
  'COUSIN', 'DELAUNAY', 'DESCHAMPS', 'DUFOUR', 'DUMAS', 'DUMONT', 'DUPUIS', 'DUPUY', 'DURAND', 'DUVAL',
  'FABRE', 'FAURE', 'FLEURY', 'FONTAINE', 'FOURNIER', 'GAILLARD', 'GARNIER', 'GAUTIER', 'GERMAIN', 'GILBERT',
  'GILLET', 'GIRARD', 'GIRAUD', 'GUERIN', 'GUICHARD', 'GUILLOT', 'GUYOT', 'HAMON', 'HUBERT', 'HUET',
  'HUMBERT', 'JACOB', 'JACQUET', 'JOLY', 'LACROIX', 'LAMBERT', 'LAMY', 'LANGLOIS', 'LAPORTE', 'LEBLANC',
  'LEBRUN', 'LECLERC', 'LECOMTE', 'LEGER', 'LEGRAND', 'LEJEUNE', 'LEMAIRE', 'LEMOINE', 'LEROUX', 'LEROY',
  'MAILLARD', 'MALLET', 'MARCHAL', 'MASSON', 'MENARD', 'MERCIER', 'MEUNIER', 'MICHAUD', 'MILLET', 'MONNIER',
  'MOREAU', 'MOREL', 'MORIN', 'MOULIN', 'PASQUIER', 'PELLETIER', 'PERRET', 'PERRIN', 'PERROT', 'PICARD',
  'PICHON', 'POIRIER', 'POULAIN', 'PREVOST', 'RENARD', 'RENAUD', 'REYNAUD', 'RIVIERE', 'ROBIN', 'ROCHE',
  'ROLLAND', 'ROUSSEAU', 'ROUSSEL', 'ROUX', 'ROYER', 'TESSIER', 'VASSEUR', 'VIDAL', 'WEBER', 'BOUCHET',
];

// Invented towns: no risk of matching a real club's name.
const CLUB_TOWNS = [
  'Exemple-sur-Mer', 'Val-Fictif', 'Port-Imaginaire', "Bourg-l'Exemple", 'Saint-Plouf', 'Clairvague', 'Roche-Écume',
  'Mareval', 'Pont-Galet', 'Anse-Bleue', 'Belle-Brasse', 'Cap-Crawl', 'Fontaine-Papillon', 'Grève-Douce',
  'Haute-Vague', 'Île-Fictive', 'Lac-Tranquille', 'Mont-Plongeon', 'Pointe-Corail', 'Rivière-Calme', 'Bassin-Neuf',
  'Saint-Remous', 'Port-Marée', 'Grand-Large', 'Côte-Écume', 'Plage-Fictive', 'Ville-Exemple', 'Bois-Dauphin',
  'Ruisseau-Clair', 'Les Bains-Fictifs', 'Dune-Blanche', 'Baie-des-Phoques', 'Val-Remous', 'Pré-Bassin',
  'Saint-Glouglou', 'Écluse-Neuve', 'Rade-Fictive', 'Golfe-Imaginaire', 'Marais-Salant-Fictif', 'Phare-sur-Vague',
];
const CLUB_PREFIXES = ['CN', 'EN', 'SN', 'AS', 'US', 'CS', 'ES'];

// The FFN export column order; the output keeps it exactly so the real parser is exercised.
const COLUMNS = ['name', 'place', 'lastname', 'firstname', 'birthyear', 'nation', 'club', 'points', 'comment'] as const;
type Column = (typeof COLUMNS)[number];
type Line = Record<Column, string>;

/** FNV-1a: a tiny, stable string hash, so the mapping never depends on file order or on Math.random. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Gives each key a distinct candidate: starts at hash(key) and probes forward
 * past candidates already taken. Keys are processed in sorted order so the
 * result depends only on the set of keys, not on line order.
 */
function assignDistinct(keys: string[], candidates: string[]): Map<string, string> {
  const unique = [...new Set(keys)].sort();
  if (unique.length > candidates.length) {
    throw new Error(`Pas assez de valeurs fictives (${candidates.length}) pour ${unique.length} entrées`);
  }
  const taken = new Set<number>();
  const assigned = new Map<string, string>();
  for (const key of unique) {
    let index = hash(key) % candidates.length;
    while (taken.has(index)) {
      index = (index + 1) % candidates.length;
    }
    taken.add(index);
    assigned.set(key, candidates[index]!);
  }
  return assigned;
}

function decodeLatin1(bytes: Uint8Array): string {
  return new TextDecoder('iso-8859-1').decode(bytes);
}

function encodeLatin1(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 0xff) {
      throw new Error(`Caractère hors Latin-1 : « ${text[i]} »`);
    }
    bytes[i] = code;
  }
  return bytes;
}

function parseLines(text: string): { header: string; lines: Line[] } {
  const [header = '', ...rest] = text.split('\n');
  const lines = rest
    .filter((raw) => raw.length > 0)
    .map((raw) => {
      const cells = raw.split(';');
      return Object.fromEntries(COLUMNS.map((column, i) => [column, cells[i] ?? ''])) as Line;
    });
  return { header, lines };
}

// Same identity as the app (csv-parser.ts): a swimmer is one person across
// Dames/Messieurs and Mixte, so they must get the same fake name in both.
function swimmerKey(line: Line): string {
  return `${line.lastname}|${line.firstname}|${line.birthyear}|${line.club}`;
}

/**
 * Replaces names, first names and clubs (except AS Cherbourg Natation) with
 * fictional ones. Birth years, points, places and categories are kept: they
 * identify nobody on their own and carry the interesting cases (ties, oldest
 * swimmer). Any fictional value that happens to exist in the real file is
 * dropped from the candidates, so no real name can leak through a coincidence.
 */
export function anonymizeSampleCsv(input: Uint8Array): Uint8Array {
  const { header, lines } = parseLines(decodeLatin1(input));
  const realLastnames = new Set(lines.map((l) => l.lastname));
  const realFirstnames = new Set(lines.map((l) => l.firstname));

  // Gender comes from the Dames/Messieurs rows; Mixte rows reuse it through the swimmer key.
  const genderByKey = new Map<string, 'F' | 'M'>();
  for (const line of lines) {
    if (line.name.includes('Dames')) genderByKey.set(swimmerKey(line), 'F');
    if (line.name.includes('Messieurs')) genderByKey.set(swimmerKey(line), 'M');
  }
  const keys = [...new Set(lines.map(swimmerKey))];
  const missing = keys.filter((key) => !genderByKey.has(key));
  if (missing.length > 0) {
    throw new Error(`Genre inconnu pour ${missing.length} nageur(s) absents de Dames/Messieurs`);
  }

  // One fake (lastname, firstname) pair per swimmer, drawn from every
  // combination: names may repeat across swimmers, full identities never do.
  const lastnames = LASTNAMES.filter((n) => !realLastnames.has(n));
  const identitiesFor = (gender: 'F' | 'M'): Map<string, string> => {
    const firstnames = (gender === 'F' ? FEMALE_FIRSTNAMES : MALE_FIRSTNAMES).filter((n) => !realFirstnames.has(n));
    const pairs = lastnames.flatMap((lastname) => firstnames.map((firstname) => `${lastname};${firstname}`));
    return assignDistinct(
      keys.filter((key) => genderByKey.get(key) === gender),
      pairs
    );
  };
  const identityByKey = new Map([...identitiesFor('F'), ...identitiesFor('M')]);

  const clubNames = CLUB_TOWNS.map((town, i) => `${CLUB_PREFIXES[i % CLUB_PREFIXES.length]} ${town.toUpperCase()}`);
  const clubByReal = assignDistinct(
    lines.map((l) => l.club).filter((club) => club !== KEPT_CLUB),
    clubNames
  );

  const output = lines.map((line) => {
    const [lastname = '', firstname = ''] = identityByKey.get(swimmerKey(line))!.split(';');
    const anonymized: Line = {
      ...line,
      lastname,
      firstname,
      club: line.club === KEPT_CLUB ? KEPT_CLUB : clubByReal.get(line.club)!,
    };
    return COLUMNS.map((column) => anonymized[column]).join(';');
  });
  return encodeLatin1(`${[header, ...output].join('\n')}\n`);
}

// CLI entry point: `npm run anonymize-sample`. Skipped when imported by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const source = path.join(root, 'test', 'fixtures', 'sample.csv');
  const target = path.join(root, 'resources', 'meeting-exemple.csv');
  writeFileSync(target, anonymizeSampleCsv(new Uint8Array(readFileSync(source))));
  console.log(`Fichier anonymisé écrit : ${path.relative(root, target)}`);
}

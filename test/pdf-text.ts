/**
 * Responsabilité : extrait le texte imprimé d'un PDF produit par @react-pdf, pour que les tests vérifient ce qui figure sur la feuille.
 * Appelé par : test/demo-export.test.ts, test/ceremony-pdf-export.test.ts.
 * Suppression casserait : ces tests, qui ne pourraient plus lire le contenu des exports PDF.
 */
import { inflateSync } from 'node:zlib';

/**
 * Text drawn on the PDF pages. @react-pdf writes each line as a TJ array of
 * hex strings in the standard WinAnsi encoding, inside Flate-compressed
 * content streams: inflate them and join the hex runs of every TJ.
 */
export async function pdfText(blob: Blob): Promise<string> {
  const bytes = Buffer.from(await blob.arrayBuffer());
  const raw = bytes.toString('latin1');
  const lines: string[] = [];
  for (const match of raw.matchAll(/(?<!end)stream\r?\n/g)) {
    const start = match.index + match[0].length;
    const end = raw.indexOf('endstream', start);
    let content: string;
    try {
      content = inflateSync(bytes.subarray(start, end)).toString('latin1');
    } catch {
      continue; // Fonts and images: not text.
    }
    for (const tj of content.matchAll(/\[([^\]]*)\]\s*TJ/g)) {
      const hex = [...tj[1]!.matchAll(/<([0-9a-fA-F]*)>/g)].map((h) => h[1]).join('');
      // WinAnsi is Latin-1 except 0x80-0x9F; the em dash (0x97) is the only one these exports use.
      lines.push(Buffer.from(hex, 'hex').toString('latin1').replace(/\x97/g, '—'));
    }
  }
  return lines.join('\n');
}

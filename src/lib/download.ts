/**
 * Responsabilité : déclenche le téléchargement navigateur d'un blob (URL objet transitoire).
 * Appelé par : pdf-export.tsx, excel-export.ts.
 * Suppression casserait : les exports PDF/Excel (rien ne déclencherait le téléchargement).
 * Note : dépend de `document`/`URL.createObjectURL`, non exercé par la suite de tests Node.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Triggers a browser download of the given blob via a transient object URL.
 * Relies on `document`/`URL.createObjectURL`, so this only runs in a real
 * browser (or Electron renderer) — not exercised by the Node test suite.
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

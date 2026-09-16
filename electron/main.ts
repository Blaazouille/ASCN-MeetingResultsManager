import { app, BrowserWindow, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerIpcHandlers } from './ipc-handlers';
import { createDatabase } from '../src/lib/db';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');

// Prevent a second launch from opening a second window onto the same SQLite
// file (WAL mode tolerates multiple connections, but two windows editing the
// same meeting concurrently would be confusing and isn't a supported use case).
if (!app.requestSingleInstanceLock()) {
  // app.quit() is asynchronous and doesn't stop the rest of this script from
  // running, so without process.exit() a second instance could still open
  // its own DB connection and window before the queued quit takes effect.
  app.quit();
  process.exit(0);
}

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 800,
    title: 'ASCN Meeting Results',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    mainWindow = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  try {
    const dbPath = path.join(app.getPath('userData'), 'ascn-meeting-results.sqlite3');
    const db = createDatabase(dbPath);
    registerIpcHandlers(db);
    createWindow();
  } catch (err) {
    // A volunteer at poolside under stress must never see "nothing happened" —
    // if the DB can't be opened (corrupt file, locked, native module failure),
    // say so clearly and exit instead of leaving a dead process with no window.
    const message = err instanceof Error ? err.message : String(err);
    dialog.showErrorBox(
      "Impossible de démarrer l'application",
      `La base de données locale n'a pas pu être ouverte. Fermez toute autre instance de l'application et réessayez.\n\nDétail technique : ${message}`
    );
    app.quit();
  }
});

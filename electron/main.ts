import { app, BrowserWindow, Menu, shell } from 'electron';
import path from 'path';
import { loadEnvFromAppRoot } from '../config/loadEnv.ts';
import { startServer, stopServer } from '../server/startServer.ts';

let mainWindow: BrowserWindow | null = null;

function isLocalAppUrl(url: string, port: number): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') &&
      parsed.port === String(port)
    );
  } catch {
    return false;
  }
}

function attachExternalLinkHandler(window: BrowserWindow, port: number): void {
  const { webContents } = window;

  webContents.setWindowOpenHandler(({ url }) => {
    if (!isLocalAppUrl(url, port)) {
      void shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  webContents.on('will-navigate', (event, url) => {
    if (!isLocalAppUrl(url, port)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });
}

function resolveAppRoot(): string {
  if (app.isPackaged) {
    return path.dirname(process.execPath);
  }
  return process.cwd();
}

function resolveDistDir(): string {
  if (app.isPackaged) {
    return path.join(app.getAppPath(), 'dist');
  }
  return path.join(process.cwd(), 'dist');
}

async function createWindow(): Promise<void> {
  const appRoot = resolveAppRoot();
  process.env.ELECTRON_APP_ROOT = appRoot;
  process.env.WHITE_BOARD_DATA_DIR = path.join(appRoot, 'data');
  process.env.ELECTRON_DIST_DIR = resolveDistDir();

  loadEnvFromAppRoot(appRoot);

  const port = await startServer();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'My-local-whiteboard v1.0',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setMenu(null);
  mainWindow.setMenuBarVisibility(false);
  attachExternalLinkHandler(mainWindow, port);

  await mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  void createWindow();
});

app.on('window-all-closed', () => {
  void stopServer().finally(() => {
    app.quit();
  });
});

app.on('activate', () => {
  if (mainWindow === null) {
    void createWindow();
  }
});

import { app, BrowserWindow, Menu, shell } from 'electron';
import path from 'path';
import { APP_CONFIG } from './app-config.ts';
import { loadEnvFromAppRoot } from '../config/loadEnv.ts';
import { startServer, stopServer } from '../server/startServer.ts';

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;

function resolveElectronDir(): string {
  return path.dirname(__filename);
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

function resolveIconPath(): string {
  return path.join(resolveElectronDir(), 'icon.png');
}

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

function setupSplashExternalLinks(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });
}

function createSplashWindow(): void {
  if (splashWindow) return;

  const iconPath = resolveIconPath();

  splashWindow = new BrowserWindow({
    width: 400,
    height: 129,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    center: true,
    show: false,
    backgroundColor: '#0a1a33',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.setMenu(null);
  void splashWindow.loadFile(path.join(resolveElectronDir(), 'splash.html'), {
    query: {
      mode: 'loading',
      title: APP_CONFIG.title,
      author: APP_CONFIG.authorName,
      blog: APP_CONFIG.blogUrl,
    },
  });

  setupSplashExternalLinks(splashWindow);

  splashWindow.once('ready-to-show', () => {
    splashWindow?.show();
  });
}

function closeSplashWindow(): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
  splashWindow = null;
}

async function createWindow(): Promise<void> {
  const appRoot = resolveAppRoot();
  process.env.ELECTRON_APP_ROOT = appRoot;
  process.env.WHITE_BOARD_DATA_DIR = path.join(appRoot, 'data');
  process.env.ELECTRON_DIST_DIR = resolveDistDir();

  loadEnvFromAppRoot(appRoot);

  const port = await startServer();
  const iconPath = resolveIconPath();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: APP_CONFIG.title,
    autoHideMenuBar: true,
    show: false,
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setMenu(null);
  mainWindow.setMenuBarVisibility(false);
  attachExternalLinkHandler(mainWindow, port);

  mainWindow.once('ready-to-show', () => {
    closeSplashWindow();
    mainWindow?.show();
  });

  await mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createSplashWindow();
  void createWindow().catch((err) => {
    closeSplashWindow();
    console.error('[WhiteBoard4Me] startup failed:', err);
    app.quit();
  });
});

app.on('before-quit', () => {
  closeSplashWindow();
});

app.on('window-all-closed', () => {
  void stopServer().finally(() => {
    app.quit();
  });
});

app.on('activate', () => {
  if (mainWindow === null) {
    createSplashWindow();
    void createWindow().catch((err) => {
      closeSplashWindow();
      console.error('[WhiteBoard4Me] startup failed:', err);
      app.quit();
    });
  }
});

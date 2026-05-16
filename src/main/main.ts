/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  protocol,
  session,
  OnBeforeSendHeadersListenerDetails,
  BeforeSendResponse,
  OnHeadersReceivedListenerDetails,
  HeadersReceivedResponse,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { APP_NAME, APP_VERSION } from '../constants';

// ===== CONSTANTS =====
const VIDEO_URLS = {
  ANIMELIB_CDN: [
    'https://video1.cdnlibs.org/*',
    'https://video2.cdnlibs.org/*',
    'https://video1.cdnlibs.org/.%D0%B0s/*',
  ],
  ANIMELIB_API: ['https://api.cdnlibs.org/*'],
  KODIK: [
    'https://cloud.kodik-storage.com/*',
    'https://kodik-storage.com/*',
    'https://kodik.info/*',
  ],
};

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';

const COMMON_HEADERS = {
  Accept: '*/*',
  'Accept-Language': 'ru,en;q=0.9',
  'User-Agent': USER_AGENT,
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
} as const;

const WINDOW_CONFIG = {
  DEFAULT_WIDTH: 1600,
  DEFAULT_HEIGHT: 900,
  FULLSCREEN_RESTORE_DELAY: 100,
} as const;

const STORE_KEYS = {
  WINDOW_MAXIMIZED: 'windowMaximized',
} as const;

// ===== STORE MANAGEMENT =====
let store: any = null;

const initStore = async () => {
  if (!store) {
    const Store = (await import('electron-store')).default;
    store = new Store();
  }
  return store;
};

// ===== APP UPDATER =====
class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

// ===== GLOBAL STATE =====
let mainWindow: BrowserWindow | null = null;
let currentInterceptor: (() => void) | null = null;

// ===== UTILITY FUNCTIONS =====

/**
 * Создает заголовки для AnimeLib CDN запросов
 */
const createAnimelibHeaders = (
  details: OnBeforeSendHeadersListenerDetails,
  siteUrl: string,
  authToken: string,
): Record<string, string> => {
  const baseUrl = new URL(siteUrl).origin;
  return {
    ...details.requestHeaders,
    ...COMMON_HEADERS,
    Referer: `${baseUrl}/`,
    Origin: baseUrl,
    Authorization: `Bearer ${authToken}`,
    'Site-Id': '5',
    'Client-Time-Zone': 'Europe/Samara',
    'Sec-Ch-Ua':
      '"Not)A;Brand";v="8", "Chromium";v="138", "YaBrowser";v="25.8", "Yowser";v="2.5"',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
    Priority: 'i',
    'Accept-Encoding': 'identity;q=1, *;q=0',
  };
};

/**
 * Создает заголовки для Kodik запросов
 */
const createKodikHeaders = (
  details: OnBeforeSendHeadersListenerDetails,
): Record<string, string> => ({
  ...details.requestHeaders,
  ...COMMON_HEADERS,
  Referer: 'https://kodik.info/',
  Origin: 'https://kodik.info',
  'Sec-Ch-Ua': '"Chromium";v="138", "Not:A-Brand";v="24"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'cross-site',
});

/**
 * Проверяет, является ли URL запросом к AnimeLib CDN
 */
const isAnimelibUrl = (url: string): boolean =>
  url.includes('.mp4') && url.includes('cdnlibs.org');

/**
 * Проверяет, является ли URL запросом к AnimeLib API
 */
const isAnimelibApiUrl = (url: string): boolean =>
  url.includes('api.cdnlibs.org');

/**
 * Проверяет, является ли URL запросом к Kodik
 */
const isKodikUrl = (url: string): boolean =>
  url.includes('kodik-storage.com') || url.includes('kodik.info');

/**
 * Добавляет CORS заголовки к ответу
 */
const addCorsHeaders = (responseHeaders: Record<string, string[]>): void => {
  responseHeaders['Access-Control-Allow-Origin'] = ['*'];
  responseHeaders['Access-Control-Allow-Methods'] = ['GET, POST, OPTIONS'];
  responseHeaders['Access-Control-Allow-Headers'] = ['*'];
  responseHeaders['Access-Control-Allow-Credentials'] = ['true'];
};

/**
 * Очищает текущий перехватчик запросов
 */
const clearCurrentInterceptor = (): void => {
  if (currentInterceptor) {
    currentInterceptor();
    currentInterceptor = null;
  }
};

// ===== APP INITIALIZATION =====
console.log(`========================================`);
console.log(`${APP_NAME} v${APP_VERSION}`);
console.log(`========================================`);

// ===== IPC HANDLERS - WINDOW MANAGEMENT =====

ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

ipcMain.on('window-fullscreen', async (event, isFullscreen: boolean) => {
  console.log(`[Main IPC] Toggle window fullscreen: ${isFullscreen}`);
  if (mainWindow) {
    mainWindow.setFullScreen(isFullscreen);
    const storeInstance = await initStore();
    storeInstance.set(STORE_KEYS.WINDOW_MAXIMIZED, isFullscreen);
  }
});

ipcMain.handle('get-maximize-state', async () => {
  const storeInstance = await initStore();
  return storeInstance.get(STORE_KEYS.WINDOW_MAXIMIZED, false);
});

// ===== IPC HANDLERS - MISC =====

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

// ===== IPC HANDLERS - IMAGE FETCHING =====

ipcMain.handle('fetch-image', async (event, { url, referer }) => {
  try {
    const https = await import('https');
    const http = await import('http');
    const { URL } = await import('url');

    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    return new Promise((resolve) => {
      const options = {
        headers: {
          Referer: referer || '',
          'User-Agent': USER_AGENT,
        },
      };

      const request = client.get(url, options, (response) => {
        const chunks: Buffer[] = [];

        response.on('data', (chunk) => chunks.push(chunk));

        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const base64 = buffer.toString('base64');
          const contentType = response.headers['content-type'] || 'image/jpeg';

          resolve({
            success: true,
            data: base64,
            contentType,
          });
        });
      });

      request.on('error', (error) => {
        console.error('[fetch-image] Error:', error);
        resolve({
          success: false,
          error: error.message,
        });
      });

      request.end();
    });
  } catch (error: any) {
    console.error('[fetch-image] Catch:', error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// ===== IPC HANDLERS - PLAYER =====

ipcMain.on('player-button-clicked', (event, url) => {
  console.log('[AnimeLIB] Player button clicked:', url);
  mainWindow?.webContents.send('open-player-page', url);
});

ipcMain.on('webview-log', (event, message) => {
  console.log('[WEBVIEW LOG]:', message);
});

// ===== IPC HANDLERS - KODIK =====

ipcMain.handle('get-kodik-links', async (event, kodikSrc: string) => {
  try {
    console.log('[AnimeLIB] Getting Kodik links for:', kodikSrc);
    const { VideoLinks } = await import('kodikwrapper');
    const links = await VideoLinks.getLinks({ link: kodikSrc });
    console.log('[AnimeLIB] Kodik links received successfully');
    return { success: true, data: links };
  } catch (error: any) {
    console.error('[AnimeLIB] Error getting Kodik links:', error.message);
    return { success: false, error: error.message };
  }
});

// ===== IPC HANDLERS - VIDEO HEADERS =====

/**
 * Создает обработчик для перехвата заголовков видео запросов
 */
const createVideoHeadersInterceptor = (siteUrl: string, authToken: string) => {
  return (
    details: OnBeforeSendHeadersListenerDetails,
    callback: (response: BeforeSendResponse) => void,
  ) => {
    console.log('[AnimeLIB] Intercepting:', details.url);

    const { url } = details;

    if (isAnimelibUrl(url)) {
      const baseUrl = new URL(siteUrl).origin;
      console.log('[AnimeLIB] AnimeLib video - Base URL:', baseUrl);
      const headers = createAnimelibHeaders(details, siteUrl, authToken);
      callback({ requestHeaders: headers });
      return;
    }

    if (isAnimelibApiUrl(url)) {
      const baseUrl = new URL(siteUrl).origin;
      console.log('[AnimeLIB] AnimeLib API - Base URL:', baseUrl);
      callback({
        requestHeaders: {
          ...details.requestHeaders,
          ...COMMON_HEADERS,
          Referer: `${baseUrl}/`,
          Origin: baseUrl,
        },
      });
      return;
    }

    if (isKodikUrl(url)) {
      console.log('[AnimeLIB] Kodik video detected');
      const headers = createKodikHeaders(details);
      callback({ requestHeaders: headers });
      return;
    }

    callback({});
  };
};

/**
 * Создает обработчик для добавления CORS заголовков
 */
const createCorsHeadersInterceptor = () => {
  return (
    details: OnHeadersReceivedListenerDetails,
    callback: (response: HeadersReceivedResponse) => void,
  ) => {
    const { responseHeaders } = details;

    if (responseHeaders) {
      addCorsHeaders(responseHeaders);
      console.log('[AnimeLIB] CORS headers added');
    }

    callback({ responseHeaders });
  };
};

ipcMain.handle('setup-video-headers', async (event, { siteUrl, authToken }) => {
  console.log('[AnimeLIB] Setting up video headers for:', siteUrl);

  clearCurrentInterceptor();

  const headerInterceptor = createVideoHeadersInterceptor(siteUrl, authToken);
  const corsInterceptor = createCorsHeadersInterceptor();

  // Регистрируем перехватчики
  session.fromPartition('persist:webview').webRequest.onBeforeSendHeaders(
    {
      urls: [
        ...VIDEO_URLS.ANIMELIB_CDN,
        ...VIDEO_URLS.ANIMELIB_API,
        ...VIDEO_URLS.KODIK,
      ],
    },
    headerInterceptor,
  );

  session
    .fromPartition('persist:webview')
    .webRequest.onHeadersReceived(
      { urls: [...VIDEO_URLS.ANIMELIB_API, ...VIDEO_URLS.KODIK] },
      corsInterceptor,
    );

  // Сохраняем функцию для очистки
  currentInterceptor = () => {
    session
      .fromPartition('persist:webview')
      .webRequest.onBeforeSendHeaders(null);
    session.fromPartition('persist:webview').webRequest.onHeadersReceived(null);
  };

  console.log('[AnimeLIB] Interceptor registered');
  return { success: true };
});

ipcMain.handle('clear-video-headers', async () => {
  console.log('[AnimeLIB] Clearing video headers');
  clearCurrentInterceptor();
  // eslint-disable-next-line no-use-before-define
  registerApiInterceptor();
  return { success: true };
});

// ===== ENVIRONMENT SETUP =====

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

/**
 * Устанавливает расширения для разработки
 */
const installExtensions = async (): Promise<void> => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

/**
 * Получает путь к ресурсам приложения
 */
const getResourcesPath = (): string => {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');
};

/**
 * Создает конфигурацию BrowserWindow
 */
const createWindowConfig = (iconPath: string) => ({
  show: false,
  width: WINDOW_CONFIG.DEFAULT_WIDTH,
  height: WINDOW_CONFIG.DEFAULT_HEIGHT,
  title: `${APP_NAME} v${APP_VERSION}`,
  icon: iconPath,
  titleBarStyle: 'hidden' as const,
  frame: false,
  simpleFullscreen: true,
  fullscreenable: true,
  resizable: true,
  transparent: false,
  hasShadow: false,
  webPreferences: {
    preload: app.isPackaged
      ? path.join(__dirname, 'preload.js')
      : path.join(__dirname, '../../.erb/dll/preload.js'),
    nodeIntegration: false,
    contextIsolation: true,
    webSecurity: false,
    webviewTag: true,
    allowRunningInsecureContent: true,
    enableWebSQL: false,
    spellcheck: false,
    // КРИТИЧНО для производительности
    backgroundThrottling: false,
    offscreen: false,
    // WebView оптимизации
    partition: 'persist:webview',
    autoplayPolicy: 'no-user-gesture-required',
  },
});

/**
 * Настраивает обработчики событий окна
 */
const setupWindowEvents = (window: BrowserWindow): void => {
  window.on('ready-to-show', async () => {
    if (process.env.START_MINIMIZED) {
      window.minimize();
    } else {
      window.show();
    }

    // Восстанавливаем maximize состояние окна
    const storeInstance = await initStore();
    const savedMaximizeState = storeInstance.get(
      STORE_KEYS.WINDOW_MAXIMIZED,
      false,
    ) as boolean;

    if (savedMaximizeState) {
      console.log('[Main] Restoring maximize state');
      setTimeout(() => {
        window.maximize();
      }, WINDOW_CONFIG.FULLSCREEN_RESTORE_DELAY);
    }
  });

  window.on('closed', () => {
    mainWindow = null;
  });

  window.on('maximize', async () => {
    const storeInstance = await initStore();
    storeInstance.set(STORE_KEYS.WINDOW_MAXIMIZED, true);
    console.log('[Main] Window maximized - state saved');
  });

  window.on('unmaximize', async () => {
    const storeInstance = await initStore();
    storeInstance.set(STORE_KEYS.WINDOW_MAXIMIZED, false);
    console.log('[Main] Window unmaximized - state saved');
  });

  window.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });
};

/**
 * Создает главное окно приложения
 */
const createWindow = async (): Promise<void> => {
  if (isDebug) {
    await installExtensions();
  }

  const resourcesPath = getResourcesPath();
  const getAssetPath = (...paths: string[]): string =>
    path.join(resourcesPath, ...paths);

  const iconPath = getAssetPath('icon.png');
  const windowConfig = createWindowConfig(iconPath);

  // @ts-ignore
  mainWindow = new BrowserWindow(windowConfig);
  mainWindow.loadURL(resolveHtmlPath('index.html'));

  setupWindowEvents(mainWindow);

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // eslint-disable-next-line
  new AppUpdater();
};

// ===== PERFORMANCE OPTIMIZATIONS =====

const applyRadicalFix = (): void => {
  const switches = [
    ['disable-gpu-vsync'],
    ['disable-frame-rate-limit'],
    ['disable-features', 'CalculateNativeWinOcclusion'],
    ['ignore-gpu-blocklist'],
    ['enable-accelerated-video-decode'],
    ['enable-features', 'D3D11VideoDecoder'],
    ['enable-zero-copy'],
    ['disable-backgrounding-occluded-windows'],
    ['disable-renderer-backgrounding'],
    ['disable-blink-features', 'AutomationControlled'],
    ['disable-dev-shm-usage'],
    ['no-sandbox'],
    ['js-flags', '--max-old-space-size=4096'],
  ] as const;

  switches.forEach(([key, value]) => {
    if (value) {
      app.commandLine.appendSwitch(key, value);
    } else {
      app.commandLine.appendSwitch(key);
    }
  });

  console.log(
    '[Performance] STRATEGY 1: WebView optimizations + NVIDIA RTX VSR APPLIED',
  );
};

const applyPerformanceOptimizations = (): void => {
  applyRadicalFix();
};

applyPerformanceOptimizations();

// ===== APP EVENT LISTENERS =====

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * Регистрирует кастомный протокол для плеера
 */
const registerCustomProtocol = (): void => {
  protocol.registerHttpProtocol('anime-lib-player', (request, callback) => {
    console.log('[AnimeLIB] Custom protocol intercepted:', request.url);

    const playerUrl = decodeURIComponent(
      request.url.replace('anime-lib-player://', ''),
    );
    console.log('[AnimeLIB] Player URL:', playerUrl);

    mainWindow?.webContents.send('open-player-page', playerUrl);

    // eslint-disable-next-line promise/no-callback-in-promise
    callback({ statusCode: 200, data: '' });
  });
};

// ===== APP INITIALIZATION =====

/**
 * Регистрирует базовый перехватчик для API-запросов (Referer/Origin)
 * Нужен сразу при старте, т.к. API-запросы идут до открытия плеера
 */
const registerApiInterceptor = (): void => {
  const defaultSiteUrl = 'https://animelib.org';

  session
    .fromPartition('persist:webview')
    .webRequest.onBeforeSendHeaders(
      { urls: [...VIDEO_URLS.ANIMELIB_API] },
      (details, callback) => {
        if (isAnimelibApiUrl(details.url)) {
          callback({
            requestHeaders: {
              ...details.requestHeaders,
              ...COMMON_HEADERS,
              Referer: `${defaultSiteUrl}/`,
              Origin: defaultSiteUrl,
            },
          });
        } else {
          callback({});
        }
      },
    );

  session
    .fromPartition('persist:webview')
    .webRequest.onHeadersReceived(
      { urls: [...VIDEO_URLS.ANIMELIB_API] },
      (details, callback) => {
        const { responseHeaders } = details;
        if (responseHeaders) {
          addCorsHeaders(responseHeaders);
        }
        callback({ responseHeaders });
      },
    );

  console.log('[AnimeLIB] Base API interceptor registered');
};

app
  .whenReady()
  .then(() => {
    registerCustomProtocol();
    registerApiInterceptor();
    createWindow();
  })
  .catch(console.log);

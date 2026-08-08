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
  OnCompletedListenerDetails,
  Rectangle,
} from 'electron';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { registerUpdateHandlers } from './updater';
import {
  registerOfflineHandlers,
  registerOfflineProtocol,
  registerOfflineSchemes,
} from './offline';
import { offlineLibrary } from './offline/OfflineLibrary';
import {
  WindowStore,
  getSavedMaximized,
  getSavedWindowBounds,
  restoreWindowState,
  trackWindowState,
} from './windowState';
import {
  APP_NAME,
  APP_VERSION,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  OFFLINE_SCHEME,
  PLAYER_PROTOCOL_PREFIX,
} from '../constants';

const VIDEO_URLS = {
  ANIMELIB_CDN: [
    'https://video1.cdnlibs.org/*',
    'https://video2.cdnlibs.org/*',
    'https://video1.cdnlibs.org/.%D0%B0s/*',
  ],
  ANIMELIB_API: ['https://api.cdnlibs.org/*', 'https://hapi.hentaicdn.org/*'],
  KODIK: [
    'https://cloud.kodik-storage.com/*',
    'https://kodik-storage.com/*',
    'https://kodik.info/*',
  ],
};

const BOOKMARKS_API_URLS = [
  'https://api.cdnlibs.org/api/bookmarks*',
  'https://hapi.hentaicdn.org/api/bookmarks*',
];

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
} as const;

let store: any = null;

const initStore = async () => {
  if (!store) {
    const Store = (await import('electron-store')).default;
    store = new Store();
  }
  return store;
};

let mainWindow: BrowserWindow | null = null;
let currentInterceptor: (() => void) | null = null;

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
  url.includes('api.cdnlibs.org') || url.includes('hapi.hentaicdn.org');

/**
 * Проверяет, является ли URL запросом к Kodik
 */
const KODIK_HOSTS = [
  'kodik.info',
  'kodik-storage.com',
  'solodcdn.com',
  'cloud.kodik.biz',
];

const isKodikUrl = (url: string): boolean =>
  KODIK_HOSTS.some((host) => url.includes(host));

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

console.log(`========================================`);
console.log(`${APP_NAME} v${APP_VERSION}`);
console.log(`========================================`);

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

ipcMain.on('window-fullscreen', (event, isFullscreen: boolean) => {
  console.log(`[Main IPC] Toggle window fullscreen: ${isFullscreen}`);
  mainWindow?.setFullScreen(isFullscreen);
});

ipcMain.handle('get-maximize-state', async () => {
  const storeInstance = await initStore();
  return getSavedMaximized(storeInstance);
});

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

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

/**
 * Скачивает текстовый файл с поддержкой редиректов
 */
const downloadText = async (
  url: string,
  redirects: number = 3,
): Promise<string | null> => {
  const https = await import('https');
  const http = await import('http');
  const { URL: NodeUrl } = await import('url');

  const parsedUrl = new NodeUrl(url);
  const client = parsedUrl.protocol === 'https:' ? https : http;

  return new Promise((resolve) => {
    const request = client.get(
      url,
      {
        headers: {
          ...COMMON_HEADERS,
          Referer: 'https://animelib.org/',
          Origin: 'https://animelib.org',
        },
      },
      (response) => {
        const { statusCode, headers } = response;

        if (
          statusCode &&
          statusCode >= 300 &&
          statusCode < 400 &&
          headers.location &&
          redirects > 0
        ) {
          response.resume();
          resolve(
            downloadText(
              new NodeUrl(headers.location, url).href,
              redirects - 1,
            ),
          );
          return;
        }

        if (!statusCode || statusCode >= 400) {
          response.resume();
          resolve(null);
          return;
        }

        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () =>
          resolve(Buffer.concat(chunks).toString('utf8')),
        );
      },
    );

    request.on('error', (error) => {
      console.error('[fetch-subtitles] Error:', error.message);
      resolve(null);
    });

    request.end();
  });
};

ipcMain.handle('fetch-subtitles', async (event, urls: string[]) => {
  console.log('[AnimeLIB] Fetching subtitles, candidates:', urls.length);

  const offlineUrl = urls.find((url) => url.startsWith(`${OFFLINE_SCHEME}://`));

  if (offlineUrl) {
    try {
      const fs = await import('fs');
      const fileName = decodeURIComponent(
        new URL(offlineUrl).pathname.replace(/^\//, ''),
      );
      const data = fs.readFileSync(
        offlineLibrary.resolveFile(fileName),
        'utf8',
      );
      console.log('[AnimeLIB] Subtitles loaded from offline library');
      return { success: true, data };
    } catch (error: any) {
      console.error('[AnimeLIB] Offline subtitles error:', error.message);
      return { success: false, error: 'Offline subtitles not available' };
    }
  }

  // eslint-disable-next-line no-restricted-syntax
  for (const url of urls) {
    // eslint-disable-next-line no-await-in-loop
    const data = await downloadText(url);
    if (data) {
      console.log('[AnimeLIB] Subtitles loaded from:', url);
      return { success: true, data };
    }
  }

  return { success: false, error: 'Subtitles not available' };
});

ipcMain.on('player-button-clicked', (event, url) => {
  console.log('[AnimeLIB] Player button clicked:', url);
  mainWindow?.webContents.send('open-player-page', url);
});

ipcMain.on('webview-log', (event, message) => {
  console.log('[WEBVIEW LOG]:', message);
});

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
const createWindowConfig = (iconPath: string, bounds: Rectangle | null) => ({
  show: false,
  width: bounds?.width ?? WINDOW_CONFIG.DEFAULT_WIDTH,
  height: bounds?.height ?? WINDOW_CONFIG.DEFAULT_HEIGHT,
  minWidth: MIN_WINDOW_WIDTH,
  minHeight: MIN_WINDOW_HEIGHT,
  ...(bounds ? { x: bounds.x, y: bounds.y } : {}),
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
    backgroundThrottling: false,
    offscreen: false,
    partition: 'persist:webview',
    autoplayPolicy: 'no-user-gesture-required',
  },
});

/**
 * Настраивает обработчики событий окна
 */
// eslint-disable-next-line @typescript-eslint/no-shadow
const setupWindowEvents = (window: BrowserWindow, store: WindowStore): void => {
  window.on('ready-to-show', () => {
    if (process.env.START_MINIMIZED) {
      window.minimize();
    } else {
      window.show();
    }

    restoreWindowState(window, store);
  });

  window.on('closed', () => {
    mainWindow = null;
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
  const storeInstance = await initStore();
  const savedBounds = getSavedWindowBounds(storeInstance);
  const windowConfig = createWindowConfig(iconPath, savedBounds);

  // @ts-ignore
  mainWindow = new BrowserWindow(windowConfig);
  mainWindow.loadURL(resolveHtmlPath('index.html'));

  setupWindowEvents(mainWindow, storeInstance);
  trackWindowState(mainWindow, storeInstance);

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();
};

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
registerOfflineSchemes();

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
 * Регистрирует кастомный протокол для плеера (резервный канал)
 */
const registerCustomProtocol = (): void => {
  protocol.registerHttpProtocol('anime-lib-player', (request, callback) => {
    console.log('[AnimeLIB] Custom protocol intercepted:', request.url);

    const playerUrl = decodeURIComponent(
      request.url.replace(PLAYER_PROTOCOL_PREFIX, ''),
    );
    console.log('[AnimeLIB] Player URL:', playerUrl);

    mainWindow?.webContents.send('open-player-page', playerUrl);

    // eslint-disable-next-line promise/no-callback-in-promise
    callback({ statusCode: 200, data: '' });
  });
};

/**
 * Отменяет служебный переход в плеер, чтобы он не попадал в историю webview
 */
const registerPlayerNavigationGuard = (): void => {
  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() !== 'webview') {
      return;
    }

    contents.on('will-navigate', (navigationEvent, url) => {
      if (!url.startsWith(PLAYER_PROTOCOL_PREFIX)) {
        return;
      }

      navigationEvent.preventDefault();

      const playerUrl = decodeURIComponent(
        url.replace(PLAYER_PROTOCOL_PREFIX, ''),
      );
      console.log('[AnimeLIB] Player navigation intercepted:', playerUrl);

      mainWindow?.webContents.send('open-player-page', playerUrl);
    });
  });
};

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

/**
 * Сообщает renderer об изменении закладок на сайте или в плеере
 */
const registerBookmarksWatcher = (): void => {
  const notifyBookmarksChanged = (
    details: OnCompletedListenerDetails,
  ): void => {
    if (details.method === 'GET' || details.method === 'OPTIONS') {
      return;
    }

    console.log('[AnimeLIB] Bookmarks changed:', details.method, details.url);
    mainWindow?.webContents.send('bookmarks-changed');
  };

  [session.defaultSession, session.fromPartition('persist:webview')].forEach(
    (targetSession) => {
      targetSession.webRequest.onCompleted(
        { urls: BOOKMARKS_API_URLS },
        notifyBookmarksChanged,
      );
    },
  );

  console.log('[AnimeLIB] Bookmarks watcher registered');
};

app
  .whenReady()
  .then(() => {
    registerPlayerNavigationGuard();
    registerCustomProtocol();
    registerApiInterceptor();
    registerBookmarksWatcher();
    registerUpdateHandlers(() => mainWindow);
    registerOfflineProtocol(() => mainWindow);
    registerOfflineHandlers(() => mainWindow);
    createWindow();
  })
  .catch(console.log);

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
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { APP_NAME, APP_VERSION } from '../constants';

// Динамический импорт electron-store (ES модуль)
let store: any = null;
const initStore = async () => {
  if (!store) {
    const Store = (await import('electron-store')).default;
    store = new Store();
  }
  return store;
};

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

// Логируем информацию о приложении при запуске
console.log(`========================================`);
console.log(`${APP_NAME} v${APP_VERSION}`);
console.log(`========================================`);

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

// Обработчики для управления окном
ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
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
  if (mainWindow) {
    mainWindow.close();
  }
});

// Обработчик для переключения полноэкранного режима ОКНА (кнопка Maximize)
ipcMain.on('window-fullscreen', async (event, isFullscreen: boolean) => {
  console.log(`[Main IPC] Toggle window fullscreen: ${isFullscreen}`);
  if (mainWindow) {
    mainWindow.setFullScreen(isFullscreen);
    // Сохраняем состояние
    const storeInstance = await initStore();
    storeInstance.set('windowMaximized', isFullscreen);
  }
});

// Обработчик для получения текущего состояния maximize
ipcMain.handle('get-maximize-state', async () => {
  const storeInstance = await initStore();
  return storeInstance.get('windowMaximized', false);
});

// Handler for fetching images with custom referer
ipcMain.handle('fetch-image', async (event, { url, referer }) => {
  const https = await import('https');
  const http = await import('http');
  const { URL } = await import('url');

  const parsedUrl = new URL(url);
  const client = parsedUrl.protocol === 'https:' ? https : http;

  return new Promise((resolve) => {
    const options = {
      headers: {
        Referer: referer || '',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    };

    const request = client.get(url, options, (response) => {
      const chunks: Buffer[] = [];

      response.on('data', (chunk) => {
        chunks.push(chunk);
      });

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
  }).catch((error: any) => {
    console.error('[fetch-image] Catch:', error);
    return {
      success: false,
      error: error.message,
    };
  });
});

// Обработчик для кнопок плеера
ipcMain.on('player-button-clicked', (event, url) => {
  console.log('[AnimeLIB] ===== PLAYER BUTTON CLICKED =====');
  console.log('[AnimeLIB] URL:', url);
  console.log('[AnimeLIB] Event:', event);
  console.log('[AnimeLIB] =================================');

  // Отправляем событие обратно в renderer для открытия страницы плеера
  if (mainWindow) {
    mainWindow.webContents.send('open-player-page', url);
  }
});

// Обработчик для логов из webview
ipcMain.on('webview-log', (event, message) => {
  console.log('[WEBVIEW LOG]:', message);
});

// Переменная для хранения текущего перехватчика
let currentInterceptor: (() => void) | null = null;

// Обработчик для настройки заголовков для видео запросов
ipcMain.handle('setup-video-headers', async (event, { siteUrl, authToken }) => {
  console.log('[AnimeLIB] Setting up video headers for:', siteUrl);

  // Очищаем предыдущий перехватчик
  if (currentInterceptor) {
    currentInterceptor();
    currentInterceptor = null;
  }

  // Простой и надежный перехватчик
  const interceptor = (details: any, callback: any) => {
    console.log('[AnimeLIB] Intercepting:', details.url);

    const { url } = details;

    // Проверяем AnimeLib видео файлы
    if (url.includes('.mp4') && url.includes('cdnlibs.org')) {
      // Получаем базовый URL
      const baseUrl = new URL(siteUrl).origin;
      console.log('[AnimeLIB] AnimeLib video - Using base URL:', baseUrl);

      // Устанавливаем заголовки для AnimeLib
      const headers = {
        ...details.requestHeaders,
        Referer: `${baseUrl}/`,
        Origin: baseUrl,
        Authorization: `Bearer ${authToken}`,
        'Site-Id': '5',
        'Client-Time-Zone': 'Europe/Samara',
        Accept: '*/*',
        'Accept-Language': 'ru,en;q=0.9',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 YaBrowser/25.8.0.0 Safari/537.36',
        'Sec-Ch-Ua':
          '"Not)A;Brand";v="8", "Chromium";v="138", "YaBrowser";v="25.8", "Yowser";v="2.5"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'video',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        Priority: 'i',
        'Accept-Encoding': 'identity;q=1, *;q=0',
      };

      console.log('[AnimeLIB] Setting Referer to:', headers.Referer);
      callback({ requestHeaders: headers });
      return;
    }

    // Проверяем Kodik файлы (.mp4 или .m3u8)
    if (url.includes('kodik-storage.com') || url.includes('kodik.info')) {
      console.log('[AnimeLIB] Kodik video detected');

      // Для Kodik используем referer от kodik.info
      const kodikHeaders = {
        ...details.requestHeaders,
        Referer: 'https://kodik.info/',
        Origin: 'https://kodik.info',
        Accept: '*/*',
        'Accept-Language': 'ru,en;q=0.9',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'Sec-Ch-Ua': '"Chromium";v="138", "Not:A-Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
      };

      console.log('[AnimeLIB] Setting Kodik Referer to:', kodikHeaders.Referer);
      callback({ requestHeaders: kodikHeaders });
      return;
    }

    // Для всех остальных запросов оставляем как есть
    callback({});
  };

  // Регистрируем перехватчик
  currentInterceptor = () => {
    session.defaultSession.webRequest.onBeforeSendHeaders(null);
    session.defaultSession.webRequest.onHeadersReceived(null);
  };

  session.defaultSession.webRequest.onBeforeSendHeaders(
    {
      urls: [
        'https://video1.cdnlibs.org/*',
        'https://video2.cdnlibs.org/*',
        'https://video1.cdnlibs.org/.%D0%B0s/*',
        'https://cloud.kodik-storage.com/*',
        'https://kodik-storage.com/*',
        'https://kodik.info/*',
      ],
    },
    interceptor,
  );

  // Add CORS headers to responses
  session.defaultSession.webRequest.onHeadersReceived(
    {
      urls: [
        'https://cloud.kodik-storage.com/*',
        'https://kodik-storage.com/*',
        'https://kodik.info/*',
      ],
    },
    (details, callback) => {
      const { responseHeaders } = details;

      // Add CORS headers
      if (responseHeaders) {
        responseHeaders['Access-Control-Allow-Origin'] = ['*'];
        responseHeaders['Access-Control-Allow-Methods'] = [
          'GET, POST, OPTIONS',
        ];
        responseHeaders['Access-Control-Allow-Headers'] = ['*'];
        responseHeaders['Access-Control-Allow-Credentials'] = ['true'];
      }

      console.log('[AnimeLIB] CORS headers added for Kodik response');
      callback({ responseHeaders });
    },
  );

  console.log('[AnimeLIB] Interceptor registered');
  return { success: true };
});

// Обработчик для очистки перехватчика
ipcMain.handle('clear-video-headers', async () => {
  console.log('[AnimeLIB] Clearing video headers');
  if (currentInterceptor) {
    currentInterceptor();
    currentInterceptor = null;
  }
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

const installExtensions = async () => {
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

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    title: `${APP_NAME} v${APP_VERSION}`,
    icon: getAssetPath('icon.png'),
    titleBarStyle: 'hidden',
    frame: false,
    // КРИТИЧНО: используем простой fullscreen для Windows (без DWM)
    simpleFullscreen: true, // Simple fullscreen обходит DWM композитор
    fullscreenable: true,
    transparent: false,
    hasShadow: false,
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
      nodeIntegration: false, // ВАЖНО: должно быть false для безопасности
      contextIsolation: true, // ВАЖНО: должно быть true для работы contextBridge
      webSecurity: false,
      webviewTag: true,
      allowRunningInsecureContent: true,
      // Оптимизации для производительности
      enableWebSQL: false,
      spellcheck: false,
      backgroundThrottling: false, // ВАЖНО: false для fullscreen без фризов
      offscreen: false,
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', async () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }

    // Восстанавливаем maximize состояние окна
    const storeInstance = await initStore();
    const savedMaximizeState = storeInstance.get(
      'windowMaximized',
      false,
    ) as boolean;
    console.log('[Main] Saved maximize state:', savedMaximizeState);
    if (savedMaximizeState) {
      console.log('[Main] Restoring maximized state');
      setTimeout(() => {
        if (mainWindow) {
          mainWindow.setFullScreen(true);
          console.log('[Main] Window maximized');
        }
      }, 100);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Отслеживаем изменения maximize режима окна
  mainWindow.on('enter-full-screen', async () => {
    const storeInstance = await initStore();
    storeInstance.set('windowMaximized', true);
    console.log('[Main] Window entered fullscreen - state saved');
  });

  mainWindow.on('leave-full-screen', async () => {
    const storeInstance = await initStore();
    storeInstance.set('windowMaximized', false);
    console.log('[Main] Window left fullscreen - state saved');
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

// РАДИКАЛЬНЫЙ фикс для fullscreen фризов
// Проблема: Windows DWM композитор конфликтует с fullscreen
app.commandLine.appendSwitch('disable-frame-rate-limit'); // Снимаем лимит FPS
app.commandLine.appendSwitch('disable-gpu-vsync'); // Отключаем vsync
app.commandLine.appendSwitch(
  'disable-features',
  'VizDisplayCompositor,CalculateNativeWinOcclusion',
); // Отключаем композитор
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('num-raster-threads', '4'); // Увеличиваем потоки рендера
app.commandLine.appendSwitch('enable-gpu-memory-buffer-video-frames');
// Критично для Windows fullscreen
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
// Дополнительные оптимизации
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('max-active-webgl-contexts', '4');

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    // Регистрируем кастомный протокол
    protocol.registerHttpProtocol('anime-lib-player', (request, callback) => {
      console.log('[AnimeLIB] Custom protocol intercepted:', request.url);

      // Извлекаем URL плеера из протокола
      const playerUrl = decodeURIComponent(
        request.url.replace('anime-lib-player://', ''),
      );
      console.log('[AnimeLIB] Player URL:', playerUrl);

      // Отправляем событие в renderer
      if (mainWindow) {
        mainWindow.webContents.send('open-player-page', playerUrl);
      }

      // Возвращаем пустой ответ
      // eslint-disable-next-line promise/no-callback-in-promise
      callback({ statusCode: 200, data: '' });
    });

    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);

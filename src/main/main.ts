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

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

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
    icon: getAssetPath('icon.png'),
    titleBarStyle: 'hidden',
    frame: false,
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      webviewTag: true,
      allowRunningInsecureContent: true,
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
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

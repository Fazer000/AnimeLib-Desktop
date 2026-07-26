# AnimeLIB Desktop

Desktop приложение для просмотра аниме с удобным интерфейсом и современными возможностями воспроизведения видео.

## 🖥️ Описание

AnimeLIB Desktop - это кросс-платформенное настольное приложение на базе Electron, представляющее собой веб-порт сайта animelib.org через WebView с интегрированным кастомным видеоплеером. Приложение предоставляет пользователям доступ к обширной библиотеке аниме с удобной навигацией, качественным воспроизведением видео и дополнительными функциями, специально адаптированными для настольных компьютеров.

## ✨ Основные возможности

- 🌐 **WebView интеграция** - полный доступ к сайту animelib.org через встроенный браузер
- 🎥 **Кастомный видеоплеер** - собственный плеер на базе Shaka Player с расширенными возможностями
- 🚀 **NVIDIA RTX Video Super Resolution** - автоматический AI-апскейлинг видео через драйвер NVIDIA (требует RTX 20xx+, драйвер 531.29+, включённый VSR в настройках NVIDIA)
- 🖼️ **Превью кадров** - YouTube-подобные превью при наведении на прогресс-бар
- 📺 **Поддержка форматов** - HLS (m3u8) и HTTP Progressive Download
- 🎬 **Управление эпизодами** - удобная навигация по сериям с автовоспроизведением
- ⏩ **Автопропуск** - автоматический пропуск опенингов и эндингов
- 💡 **Адаптивная подсветка** - адаптивная амбиентная подсветка по краям видео с возможностью отключения
- 🔖 **Закладки** - сохранение прогресса просмотра для каждого эпизода
- 💬 **Комментарии** - система комментариев к эпизодам с Markdown поддержкой
- ⚙️ **Настройки качества** - автоматический и ручной выбор качества видео
- 🎮 **Горячие клавиши** - полный набор клавиатурных сочетаний для управления
- 🌓 **Темная тема** - современный Material Design интерфейс
- 📱 **Кастомный Toolbar** - собственная панель управления окном с перетаскиванием

## 🛠 Технические характеристики

### Системные требования

#### Windows
- **ОС**: Windows 10/11 (64-bit)
- **RAM**: 4GB рекомендуется
- **Место на диске**: 150MB для установки

#### macOS
- **ОС**: macOS 10.13 (High Sierra) и выше
- **RAM**: 4GB рекомендуется
- **Место на диске**: 200MB для установки

#### Linux
- **ОС**: Ubuntu 18.04+, Fedora 32+, Debian 10+ или эквивалент
- **RAM**: 4GB рекомендуется
- **Место на диске**: 200MB для установки

#### Разрешение экрана
- **Минимум**: 930×480

### Используемые технологии

#### Фреймворк и язык
- **Фреймворк**: Electron 28.1.3
- **Язык**: TypeScript 5.3.3
- **UI библиотека**: React 19.0.0
- **Стилизация**: Material-UI (MUI) 6.3.1
- **Сборщик**: Webpack 5.96.1
- **Архитектура**: OOP с использованием Manager классов

#### Видеоплеер
- **Плеер**: Shaka Player 4.11.16
- **Форматы**: HLS, DASH, MP4, WebM
- **Поддержка DRM**: Widevine, PlayReady, FairPlay
- **Адаптивный битрейт**: Да

#### Дополнительные библиотеки
- **HTTP клиент**: Axios 1.7.9
- **Редактор текста**: TipTap (для комментариев)
- **Состояние**: React Hooks + Custom Managers
- **Хранилище**: electron-store для настроек

## 📦 Зависимости

### Основные зависимости
```json
"dependencies": {
  "@emotion/react": "^11.14.0",
  "@emotion/styled": "^11.14.0",
  "@mui/icons-material": "^6.3.1",
  "@mui/material": "^6.3.1",
  "@tiptap/extension-link": "^2.11.1",
  "@tiptap/extension-placeholder": "^2.11.1",
  "@tiptap/pm": "^2.11.1",
  "@tiptap/react": "^2.11.1",
  "@tiptap/starter-kit": "^2.11.1",
  "axios": "^1.7.9",
  "electron-debug": "^4.1.0",
  "electron-log": "^5.2.4",
  "electron-store": "^10.0.0",
  "electron-updater": "^6.3.9",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "shaka-player": "^4.11.16"
  "kodikwrapper": "latest",
}
```

### Зависимости разработки
```json
"devDependencies": {
  "@electron/notarize": "^2.5.0",
  "@electron/rebuild": "^3.7.2",
  "electron": "28.1.3",
  "electron-builder": "^25.1.8",
  "typescript": "^5.3.3",
  "webpack": "^5.96.1",
  "ts-node": "^10.9.2",
  "eslint": "^8.57.1",
  "prettier": "^3.4.2"
}
```

## 🚀 Установка и запуск

### Предварительные требования
- **Node.js**: 18.x или новее
- **npm**: 9.x или новее
- **Git**: для клонирования репозитория

### Установка для разработки

1. Клонируйте репозиторий:
```bash
git clone https://github.com/Fazer000/AnimeLib-Desktop.git
cd AnimeLib-Desktop
```

2. Установите зависимости:
```bash
npm install
```

3. Запустите приложение в режиме разработки:
```bash
npm start
```

### Сборка приложения

#### Для текущей платформы
```bash
npm run package
```

#### Для конкретной платформы
```bash
# Windows
npm run package:win

# macOS
npm run package:mac

# Linux
npm run package:linux
```

Собранные файлы будут находиться в папке `release/build/`.

## 📁 Структура проекта

```
AnimeLib-desktop/
├── .erb/                      # Electron React Boilerplate конфигурация
│   ├── configs/              # Webpack конфигурации
│   ├── scripts/              # Служебные скрипты
│   └── dll/                  # DLL файлы для dev режима
├── assets/                    # Иконки и ресурсы приложения
├── src/
│   ├── main/                 # Главный процесс Electron
│   │   ├── main.ts          # Точка входа главного процесса
│   │   ├── menu.ts          # Меню приложения
│   │   ├── preload.ts       # Preload скрипт для IPC
│   │   ├── windowState.ts   # Геометрия и состояние окна
│   │   └── util.ts          # Утилиты главного процесса
│   ├── renderer/             # Renderer процесс (React приложение)
│   │   ├── api/             # API сервисы
│   │   │   └── animeApi.ts  # API для работы с animelib.org
│   │   ├── components/      # React компоненты
│   │   │   ├── player/      # Компоненты видеоплеера
│   │   │   │   ├── VideoPlayer.tsx
│   │   │   │   ├── VideoControls.tsx
│   │   │   │   ├── ProgressBar.tsx
│   │   │   │   ├── ThumbnailPreview.tsx
│   │   │   │   ├── PlaybackControls.tsx
│   │   │   │   ├── VolumeControl.tsx
│   │   │   │   ├── SettingsMenu.tsx
│   │   │   │   ├── EpisodeSlider.tsx
│   │   │   │   ├── PlayerSidebar.tsx
│   │   │   │   ├── CommentsSection.tsx
│   │   │   │   └── ...
│   │   │   ├── toolbar/     # Компоненты тулбара
│   │   │   │   ├── NavigationButtons.tsx
│   │   │   │   ├── UrlBar.tsx
│   │   │   │   ├── WindowControls.tsx
│   │   │   │   └── AnimeInfoCard.tsx
│   │   │   └── Toolbar.tsx  # Главный компонент тулбара
│   │   ├── hooks/           # Custom React хуки
│   │   │   └── useImageWithReferer.ts
│   │   ├── pages/           # Страницы приложения
│   │   │   ├── UrlInputPage.tsx   # Страница ввода URL
│   │   │   ├── WebViewPage.tsx    # Страница с WebView
│   │   │   └── PlayerPage.tsx     # Страница видеоплеера
│   │   ├── scripts/         # Скрипты для WebView
│   │   │   ├── authExtractor.ts
│   │   │   ├── clickInterceptor.ts
│   │   │   └── index.ts
│   │   ├── services/        # Бизнес-логика (Managers)
│   │   │   ├── player/      # Менеджеры плеера
│   │   │   │   ├── VideoPlayerController.ts
│   │   │   │   ├── ShakaPlayerManager.ts
│   │   │   │   ├── VideoStateManager.ts
│   │   │   │   ├── UIStateManager.ts
│   │   │   │   ├── KeyboardManager.ts
│   │   │   │   ├── QualityManager.ts
│   │   │   │   ├── AutoplayManager.ts
│   │   │   │   ├── SegmentManager.ts
│   │   │   │   ├── ThumbnailManager.ts
│   │   │   │   ├── BookmarkManager.ts
│   │   │   │   ├── CommentsManager.ts
│   │   │   │   ├── PlayerSelectionManager.ts
│   │   │   │   └── SkipManager.ts
│   │   │   └── webview/     # Менеджеры WebView
│   │   │       ├── WebViewManager.ts
│   │   │       └── ScriptInjectionManager.ts
│   │   ├── utils/           # Утилиты
│   │   │   └── videoHelpers.ts
│   │   ├── App.tsx          # Главный компонент приложения
│   │   └── index.tsx        # Точка входа React приложения
│   ├── constants/           # Константы приложения
│   │   ├── app.ts           # APP_NAME, APP_VERSION и т.д.
│   │   ├── player.ts        # Скругление и отступы плеера
│   │   ├── layout.ts        # Метрики раскладки, минимум окна
│   │   └── index.ts
│   └── __tests__/           # Тесты
├── release/                  # Собранные файлы
│   ├── app/                 # Приложение для упаковки
│   └── build/               # Установщики и дистрибутивы
├── package.json             # Зависимости и скрипты
├── tsconfig.json            # Конфигурация TypeScript
├── .eslintrc.js             # Конфигурация ESLint
└── README.md                # Документация
```

## 🎮 Использование

### Первый запуск
1. **Запуск приложения** - откройте AnimeLib Desktop на вашем компьютере
2. **Ввод URL** - введите URL сайта animelib.org (по умолчанию: `https://v3.animelib.org/`)
3. **Авторизация** - войдите в свой аккаунт на сайте через WebView

### Просмотр аниме
1. **Поиск аниме** - используйте поиск на сайте для нахождения интересующих сериалов
2. **Выбор эпизода** - перейдите на страницу аниме и выберите серию
3. **Запуск плеера** - нажмите кнопку "Смотреть" для открытия кастомного плеера
4. **Выбор озвучки** - выберите команду озвучки и тип плеера в правом сайдбаре
5. **Настройка качества** - откройте меню настроек (⚙️) для выбора качества видео

### Горячие клавиши

#### Управление воспроизведением
- `Space` / `K` - Пауза/Воспроизведение
- `F` - Полноэкранный режим
- `M` - Вкл/выкл звук
- `↑` / `↓` - Громкость +10% / -10%
- `←` / `→` - Перемотка -10с / +10с
- `J` - Перемотка назад на 10 секунд
- `L` - Перемотка вперед на 10 секунд
- `Home` - К началу видео
- `End` - К концу видео
- `0-9` - Переход к N% видео (0% - 90%)

#### Управление скоростью
- `Shift + >` - Увеличить скорость
- `Shift + <` - Уменьшить скорость

#### Управление эпизодами
- `N` - Следующий эпизод
- `P` - Предыдущий эпизод

#### Интерфейс
- `C` - Вкл/выкл комментарии
- `?` - Показать справку по клавишам

## ⚙️ Конфигурация

### Настройки приложения
Настройки хранятся в:
- **Windows**: `%APPDATA%\animelib-desktop\config.json`
- **macOS**: `~/Library/Application Support/animelib-desktop/config.json`
- **Linux**: `~/.config/animelib-desktop/config.json`

### Сохраняемые данные
- URL сайта
- Состояние окна (размер, позиция, maximize, fullscreen)
- Прогресс просмотра эпизодов (закладки)
- Токены авторизации
- Настройки качества видео
- Включенные настройки (автопропуск, автовоспроизведение, адаптивная подсветка)

### Переменные окружения для разработки
```bash
# Режим разработки
NODE_ENV=development

# Порт для dev сервера
PORT=1212

# Путь к Electron
ELECTRON_PATH=node_modules/.bin/electron
```

## 🏗️ Архитектура

### Паттерны проектирования
- **OOP (Manager Pattern)** - вся бизнес-логика вынесена в Manager классы
- **Composition** - компоненты составляются из более мелких компонентов
- **Hooks Pattern** - использование React Hooks для состояния и эффектов
- **IPC Pattern** - связь между main и renderer процессами через IPC

### Менеджеры плеера
- **VideoPlayerController** - главный контроллер плеера
- **ShakaPlayerManager** - управление Shaka Player
- **VideoStateManager** - состояние воспроизведения
- **UIStateManager** - состояние интерфейса
- **KeyboardManager** - обработка горячих клавиш
- **QualityManager** - управление качеством видео
- **AutoplayManager** - автовоспроизведение следующего эпизода
- **SegmentManager** - пропуск опенингов/эндингов
- **ThumbnailManager** - генерация превью кадров
- **BookmarkManager** - управление закладками
- **CommentsManager** - управление комментариями
- **PlayerSelectionManager** - выбор озвучки и плеера
- **SkipManager** - UI для пропуска сегментов

## 🐛 Известные проблемы

- Некоторые видео могут не воспроизводиться из-за региональных ограничений или блокировок
- На некоторых Linux дистрибутивах может требоваться установка дополнительных кодеков

## 🔧 Разработка

### Запуск тестов
```bash
npm test
```

### Линтинг
```bash
# Проверка
npm run lint

# Автоисправление
npm run lint:fix
```

### Форматирование кода
```bash
npm run format
```

### Отладка

#### Main процесс
```bash
npm run start:main
```

#### Renderer процесс
Откройте DevTools в приложении: `Ctrl+Shift+I` (Windows/Linux) или `Cmd+Option+I` (macOS)

## 📞 Поддержка

Если у вас возникли вопросы или проблемы:
- 🐛 [Создайте Issue](https://github.com/Fazer000/AnimeLib-Desktop/issues) в репозитории

---

**Разработчик**: [Fazer000](https://github.com/Fazer000)  
**Сайт контента**: [animelib.org](https://animelib.org) (ООО "Мангалиб")  


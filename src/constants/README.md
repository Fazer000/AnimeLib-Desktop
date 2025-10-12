# Константы приложения

Этот модуль содержит все константы приложения в одном месте для удобного управления и использования.

## Использование

### Основные константы

```typescript
import { APP_NAME, APP_VERSION, APP_DESCRIPTION } from '@/constants';

console.log(`${APP_NAME} v${APP_VERSION}`);
// Output: AnimeLib Desktop v1.0.0
```

### Полная информация о приложении

```typescript
import { APP_INFO } from '@/constants';

console.log(APP_INFO);
// Output: {
//   name: 'AnimeLib Desktop',
//   nameShort: 'AnimeLib',
//   version: '1.0.0',
//   description: 'AnimeLib Desktop - Desktop anime player',
//   homepage: 'https://github.com/Fazer000/AnimeLib-Desktop#readme',
//   repository: 'https://github.com/Fazer000/AnimeLib-Desktop',
//   author: 'Fazer'
// }
```

## Доступные константы

### `APP_NAME`
- **Тип**: `string`
- **Значение**: `'AnimeLib Desktop'`
- **Описание**: Полное название приложения

### `APP_NAME_SHORT`
- **Тип**: `string`
- **Значение**: `'AnimeLib'`
- **Описание**: Короткое название приложения

### `APP_VERSION`
- **Тип**: `string`
- **Источник**: `package.json`
- **Описание**: Версия приложения (автоматически берется из package.json)

### `APP_DESCRIPTION`
- **Тип**: `string`
- **Источник**: `package.json`
- **Описание**: Описание приложения

### `APP_HOMEPAGE`
- **Тип**: `string`
- **Источник**: `package.json`
- **Описание**: URL домашней страницы

### `APP_REPOSITORY`
- **Тип**: `string`
- **Значение**: `'https://github.com/Fazer000/AnimeLib-Desktop'`
- **Описание**: URL репозитория

### `APP_AUTHOR`
- **Тип**: `string`
- **Значение**: `'Fazer'`
- **Описание**: Автор приложения

### `APP_INFO`
- **Тип**: `object` (readonly)
- **Описание**: Объект содержащий всю информацию о приложении

## Примеры использования

### В main процессе (Electron)

```typescript
// src/main/main.ts
import { APP_NAME, APP_VERSION } from '../constants';

console.log(`Starting ${APP_NAME} v${APP_VERSION}`);

const mainWindow = new BrowserWindow({
  title: `${APP_NAME} v${APP_VERSION}`,
  // ... other options
});
```

### В renderer процессе (React)

```typescript
// src/renderer/components/About.tsx
import { APP_INFO } from '@/constants';

function About() {
  return (
    <div>
      <h1>{APP_INFO.name}</h1>
      <p>Version: {APP_INFO.version}</p>
      <p>{APP_INFO.description}</p>
      <a href={APP_INFO.homepage}>Homepage</a>
    </div>
  );
}
```

### В меню приложения

```typescript
// src/main/menu.ts
import { APP_NAME } from '../constants';

const menuTemplate = [
  {
    label: `About ${APP_NAME}`,
    click: () => {
      // Show about dialog
    }
  }
];
```

## Обновление версии

### Автоматическая синхронизация

Версия автоматически синхронизируется между файлами при сборке:

1. **Измените версию в корневом `package.json`:**
   ```json
   {
     "version": "1.1.0"
   }
   ```

2. **Синхронизация происходит автоматически:**
   - При запуске `npm run build` - перед сборкой
   - При запуске `npm run package` - перед созданием установочника
   - Вручную: `npm run sync-version`

3. **Что синхронизируется:**
   - Версия копируется в `release/app/package.json` (для названия установочника)
   - Версия доступна через `APP_VERSION` во всех файлах
   - Все метаданные (name, description, license) также синхронизируются

### Ручная синхронизация

Если нужно синхронизировать версию вручную:

```bash
npm run sync-version
```

Это обновит `release/app/package.json` из корневого `package.json`.

## Преимущества

✅ **Единая точка правды** - версия и метаданные хранятся в одном месте
✅ **Автоматическое обновление** - версия берется напрямую из package.json
✅ **Type-safe** - TypeScript обеспечивает типобезопасность
✅ **Удобство** - легко импортировать и использовать в любом файле
✅ **Консистентность** - одинаковые данные во всем приложении


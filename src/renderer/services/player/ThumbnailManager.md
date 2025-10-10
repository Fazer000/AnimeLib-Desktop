# ThumbnailManager - Генерация превью через Range запросы

## Описание

`ThumbnailManager` - класс для генерации превью кадров видео **как в YouTube**. Загружает только нужные сегменты видео через Range запросы, без перегрузки сервера и лагов плеера.

## Архитектура

### Основные компоненты

1. **ThumbnailManager** (класс) - управление генерацией
   - **Временное видео** для каждого seek'а (не влияет на основное)
   - **Range запросы** - загружает только нужный сегмент
   - **Canvas** для захвата кадров
   - **LRU кэш** - 200 превью в памяти
   - **Приоритетная очередь** с throttling
   - **AbortController** - отмена неактуальных запросов

2. **ThumbnailPreview** (компонент) - отображение превью
   - Плавная анимация (120x68px)
   - Индикатор загрузки
   - Отображение времени
   - Fallback при ошибке

3. **ProgressBar** (интеграция) - показ превью при наведении
   - Debounce 150ms
   - Автоматическая очистка
   - Работает даже во время воспроизведения!

## Использование

### Инициализация

```typescript
import { ThumbnailManager } from '../../services/player';

const thumbnailManager = new ThumbnailManager();

// Загрузка видео источника
thumbnailManager.loadVideo('https://example.com/video.mp4');

// Получение превью (работает всегда, даже во время воспроизведения!)
try {
  const thumbnailUrl = await thumbnailManager.getThumbnail(timeInSeconds);
  // Показываем превью
} catch (error) {
  // Ошибка загрузки - показываем fallback
}

// Очистка при смене видео
thumbnailManager.clearCache();

// Уничтожение
thumbnailManager.destroy();
```

### Интеграция в ProgressBar

```tsx
<ProgressBar
  currentTime={currentTime}
  duration={duration}
  buffered={buffered}
  hoverTime={hoverTime}
  onSeek={handleSeek}
  onProgressMouseMove={handleProgressMouseMove}
  onProgressMouseLeave={handleProgressMouseLeave}
  timecode={timecode}
  thumbnailManager={thumbnailManager} // <-- Передаем менеджер
/>
```

## Оптимизации

### 1. 🔥 Range запросы (как в YouTube!)
- **Временное видео** для каждого seek'а
- Загружается **ТОЛЬКО нужный сегмент** видео
- **НЕ трогаем основное** воспроизведение
- **НЕТ 429 ошибок** - минимальная нагрузка на сервер
- **НЕТ лагов** плеера

### 2. Кэширование
- LRU стратегия (максимум 200 превью)
- Ключ кэша - округленное время в секундах
- Автоматическая очистка при переполнении
- ~2MB в памяти максимум

### 3. Приоритетная очередь
- Интерактивные запросы (наведение) - **приоритет 10**
- Автоматическая сортировка очереди
- Throttling 100ms между генерациями
- **AbortController** - отмена неактуальных запросов

### 4. Временные видео элементы
- Создаются **только на время seek'а**
- Автоматически удаляются после генерации
- Полная изоляция от основного плеера
- Поддержка отмены через AbortController

### 5. Производительность
- **Размер**: 120x68px (~12KB JPEG)
- **Качество**: 0.5 (баланс качество/размер)
- **Throttling**: 100ms
- **Debounce**: 150ms при наведении
- Offscreen canvas для скорости

## Параметры

### ThumbnailManager

| Параметр | Значение | Описание |
|----------|----------|----------|
| `thumbnailWidth` | 120 | Ширина превью (уменьшена для скорости) |
| `thumbnailHeight` | 68 | Высота превью (16:9) |
| `maxCacheSize` | 150 | Максимум превью в кэше |
| `throttleMs` | 80 | Интервал между генерациями |
| `jpegQuality` | 0.45 | Качество JPEG (низкое для скорости) |

### Preload

```typescript
await thumbnailManager.preloadThumbnails(
  duration,  // Длительность видео в секундах
  10,        // Интервал между превью (сек)
);
```

## Примеры

### Базовое использование

```typescript
// Создание
const manager = new ThumbnailManager();

// Загрузка видео
await manager.loadVideo('https://example.com/video.mp4');

// Получение превью
const url = await manager.getThumbnail(42); // 42 секунды

// Использование в <img>
<img src={url} alt="Preview" />
```

### С предзагрузкой

```typescript
const manager = new ThumbnailManager();
await manager.loadVideo(videoSrc);

// Предзагрузка в фоне
manager.preloadThumbnails(videoDuration, 10)
  .then(() => console.log('Preload complete'))
  .catch(err => console.error('Preload error:', err));
```

### Очистка при смене эпизода

```typescript
useEffect(() => {
  return () => {
    thumbnailManager.clearCache();
  };
}, [episodeId]);
```

## Обработка ошибок

```typescript
try {
  const url = await thumbnailManager.getThumbnail(time);
  setThumbnailUrl(url);
} catch (error) {
  console.error('Failed to load thumbnail:', error);
  setThumbnailUrl(null); // Fallback
}
```

## Совместимость

- ✅ HLS (Shaka Player)
- ✅ HTTP Progressive Download
- ✅ Любые видео с `crossOrigin="anonymous"`
- ⚠️ Требует CORS headers на видео

## Производительность

### Память
- **~12KB на превью** (120x68 JPEG 0.5)
- Максимум **~2.4MB в кэше** (200 превью)
- Автоматическая очистка при смене эпизода
- Временные видео удаляются сразу после генерации

### CPU
- Генерация: ~50-100ms на превью
- Throttling 100ms между запросами
- **Приоритетная очередь** - важные запросы первыми
- **AbortController** - отмена ненужных операций

### Сеть
- ✅ **Range запросы** - загружаем ТОЛЬКО нужный сегмент!
- ✅ **Минимальная нагрузка** на сервер
- ✅ **НЕТ 429 ошибок**
- ✅ **НЕ конкурирует** с основным воспроизведением
- ✅ Работает **даже во время воспроизведения**!


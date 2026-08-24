/**
 * Форматирование размеров, скорости и времени оффлайн-загрузок
 */

const MB = 1024 * 1024;
const GB = MB * 1024;

/**
 * Форматирует размер файла, пустая строка для нулевого размера
 */
export const formatSize = (bytes: number): string => {
  if (!bytes) {
    return '';
  }

  return bytes >= GB
    ? `${(bytes / GB).toFixed(1)} ГБ`
    : `${Math.round(bytes / MB)} МБ`;
};

/**
 * Форматирует загруженный объём относительно полного
 */
export const formatProgress = (loaded: number, total: number): string => {
  if (total <= 0) {
    return `${Math.round(loaded / MB)} МБ`;
  }

  const useGb = total >= GB;
  const unit = useGb ? GB : MB;
  const digits = useGb ? 1 : 0;

  return `${(loaded / unit).toFixed(digits)} / ${(total / unit).toFixed(digits)} ${useGb ? 'ГБ' : 'МБ'}`;
};

/**
 * Форматирует скорость загрузки
 */
export const formatSpeed = (bytesPerSecond: number): string =>
  bytesPerSecond > 0 ? `${(bytesPerSecond / MB).toFixed(1)} МБ/с` : '';

/**
 * Форматирует остаток времени
 */
export const formatEta = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '';
  }

  if (seconds < 60) {
    return `${Math.ceil(seconds)} с`;
  }

  if (seconds < 3600) {
    return `${Math.ceil(seconds / 60)} мин`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  return minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`;
};

/**
 * Суммирует размеры файлов
 */
export const sumSize = (values: number[]): number =>
  values.reduce((sum, value) => sum + (value || 0), 0);

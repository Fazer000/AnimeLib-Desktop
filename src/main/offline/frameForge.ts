/** Чтение метаданных Frame Forge для оффлайн-библиотеки. */
import fs from 'fs';
import path from 'path';
import readMp4Dimensions from './mp4Dimensions';

/** Возвращает относительные пути к служебным файлам серии. */
export function frameForgeMetadataPaths(fileName: string): string[] {
  const name = path.basename(fileName);
  return [
    path.join('.frameforge', name + '.frameforge.json'),
    path.join('.frameforge', name + '.frameforge-original'),
    name + '.frameforge.json',
    name + '.frameforge-original',
  ];
}

/** Проверяет метаданные и возвращает размеры улучшенного файла. */
export default function readFrameForgeMark(videoPath: string): {
  enhanced: true;
  fileSize: number;
  videoWidth?: number;
  videoHeight?: number;
} | null {
  try {
    const directory = path.dirname(videoPath);
    const [current, , legacy] = frameForgeMetadataPaths(videoPath);
    const currentPath = path.join(directory, current);
    const markerPath = fs.existsSync(currentPath)
      ? currentPath
      : path.join(directory, legacy);
    const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    if (
      marker.Version !== 1 ||
      marker.State !== 'Enhanced' ||
      marker.SourceFileName !== path.basename(videoPath) ||
      !/^[0-9a-f]{64}$/i.test(marker.EnhancedHash) ||
      !Number.isSafeInteger(marker.EnhancedLength) ||
      marker.EnhancedLength <= 0
    ) {
      return null;
    }
    const actualSize = fs.statSync(videoPath).size;
    if (actualSize !== marker.EnhancedLength) return null;
    const dimensions =
      Number.isInteger(marker.Width) &&
      marker.Width > 0 &&
      Number.isInteger(marker.Height) &&
      marker.Height > 0
        ? { width: marker.Width, height: marker.Height }
        : readMp4Dimensions(videoPath);
    return {
      enhanced: true,
      fileSize: actualSize,
      ...(dimensions
        ? { videoWidth: dimensions.width, videoHeight: dimensions.height }
        : {}),
    };
  } catch {
    return null;
  }
}

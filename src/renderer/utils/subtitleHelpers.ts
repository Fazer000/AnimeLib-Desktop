/**
 * Хелперы разбора субтитров и построения ссылок на них
 */

export type SubtitleFormat = 'ass' | 'srt' | 'vtt';

export interface SubtitleCue {
  from: number;
  to: number;
  text: string;
}

export interface SubtitleStyleSettings {
  fontScale: number;
  outline: 'none' | 'outline' | 'box';
  offsetY: number;
}

/**
 * Определяет формат субтитров по полям API
 */
export function detectSubtitleFormat(
  format?: string,
  filename?: string,
): SubtitleFormat {
  const value = (format || filename?.split('.').pop() || '').toLowerCase();

  if (value.includes('ass') || value.includes('ssa')) return 'ass';
  if (value.includes('vtt')) return 'vtt';
  return 'srt';
}

/**
 * Проверяет, что строка выглядит как UUID или хеш, а не как название
 */
function isOpaqueId(value: string): boolean {
  const base = value.replace(/\.[a-z0-9]+$/i, '');
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      base,
    ) || /^[0-9a-f]{16,}$/i.test(base)
  );
}

/**
 * Подбирает читаемое название дорожки субтитров
 */
export function buildSubtitleTrackLabel(
  item: { name?: string; filename?: string; format?: string },
  index: number,
): string {
  const candidate = [item.filename, item.name]
    .map((value) => (value || '').trim())
    .find((value) => value.length > 0 && !isOpaqueId(value));

  if (candidate) {
    return candidate.replace(/\.[a-z0-9]+$/i, '');
  }

  const format = (item.format || '').toUpperCase();
  return format ? `Дорожка ${index + 1} (${format})` : `Дорожка ${index + 1}`;
}

/**
 * Строит список URL-кандидатов для файла субтитров
 */
export function buildSubtitleUrlCandidates(src: string): string[] {
  if (src.startsWith('animelib-offline://')) return [src];
  if (/^https?:\/\//i.test(src)) return [src];
  if (src.startsWith('//')) return [`https:${src}`];

  const path = src.startsWith('/') ? src : `/${src}`;

  return [
    `https://video1.cdnlibs.org${path}`,
    `https://video2.cdnlibs.org${path}`,
    `https://api.cdnlibs.org${path}`,
  ];
}

/**
 * Переводит таймкод SRT/VTT в секунды
 */
function parseTimestamp(value: string): number {
  const match = value.trim().match(/(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/);
  if (!match) return 0;

  const [, hours, minutes, seconds, millis] = match;

  return (
    Number(hours || 0) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(millis.padEnd(3, '0')) / 1000
  );
}

/**
 * Убирает разметку из текста реплики
 */
function cleanCueText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/\{[^}]*\}/g, '')
    .trim();
}

/**
 * Разбирает SRT/VTT в список реплик
 */
export function parseTimedText(content: string): SubtitleCue[] {
  const normalized = content.replace(/\r/g, '').replace(/^WEBVTT[^\n]*\n/, '');
  const cues: SubtitleCue[] = [];

  normalized.split(/\n{2,}/).forEach((block) => {
    const lines = block.split('\n').filter((line) => line.trim().length > 0);
    const timeIndex = lines.findIndex((line) => line.includes('-->'));
    if (timeIndex === -1) return;

    const [from, to] = lines[timeIndex].split('-->');
    const text = cleanCueText(lines.slice(timeIndex + 1).join('\n'));
    if (!text) return;

    cues.push({ from: parseTimestamp(from), to: parseTimestamp(to), text });
  });

  return cues.sort((a, b) => a.from - b.from);
}

/**
 * Применяет пользовательские стили к секции стилей ASS/SSA
 */
export function applyAssStyleOverrides(
  content: string,
  settings: SubtitleStyleSettings,
): string {
  const lines = content.replace(/\r/g, '').split('\n');
  let fields: string[] = [];
  let inStyles = false;

  const patched = lines.map((line) => {
    if (line.startsWith('[')) {
      inStyles = /^\[V4\+? Styles\]/i.test(line);
      return line;
    }

    if (!inStyles) return line;

    if (/^Format\s*:/i.test(line)) {
      fields = line
        .slice(line.indexOf(':') + 1)
        .split(',')
        .map((field) => field.trim().toLowerCase());
      return line;
    }

    if (!/^Style\s*:/i.test(line) || fields.length === 0) return line;

    const values = line.slice(line.indexOf(':') + 1).split(',');

    const set = (name: string, transform: (value: string) => string) => {
      const index = fields.indexOf(name);
      if (index >= 0 && index < values.length) {
        values[index] = transform(values[index].trim());
      }
    };

    set('fontsize', (value) =>
      String(Math.round(Number(value) * settings.fontScale) || value),
    );
    set('marginv', (value) =>
      String(Math.round(Number(value) + settings.offsetY) || value),
    );
    set('borderstyle', () => (settings.outline === 'box' ? '3' : '1'));
    set('outline', (value) => (settings.outline === 'none' ? '0' : value));
    set('shadow', (value) => (settings.outline === 'none' ? '0' : value));

    return `Style: ${values.join(',')}`;
  });

  return patched.join('\n');
}

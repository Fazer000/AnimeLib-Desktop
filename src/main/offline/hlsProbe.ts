/* eslint-disable no-console */

/**
 * Разведка HLS-плейлистов перед реализацией загрузки
 */
import https from 'https';

const PROBE_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  Accept: '*/*',
  'Accept-Language': 'ru,en;q=0.9',
  Referer: 'https://kodik.info/',
  Origin: 'https://kodik.info',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'cross-site',
};

export interface HlsProbeResult {
  url: string;
  status: number;
  contentType: string;
  isMaster: boolean;
  encrypted: boolean;
  keyLine: string;
  variants: string[];
  segmentCount: number;
  totalDuration: number;
  firstSegment: string;
  segmentStatus: number;
  segmentType: string;
  segmentBytes: number;
  head: string[];
}

/**
 * Приводит ссылку к абсолютному виду
 */
const toAbsolute = (src: string, base?: string): string => {
  if (src.startsWith('//')) {
    return `https:${src}`;
  }

  return base ? new URL(src, base).href : src;
};

/**
 * Запрашивает ресурс с заголовками Kodik
 */
const request = (
  url: string,
  extraHeaders: Record<string, string> = {},
  redirects = 5,
): Promise<{
  status: number;
  contentType: string;
  body: Buffer;
  url: string;
}> =>
  new Promise((resolve, reject) => {
    const call = https.get(
      url,
      { headers: { ...PROBE_HEADERS, ...extraHeaders } },
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
            request(
              new URL(headers.location, url).href,
              extraHeaders,
              redirects - 1,
            ),
          );
          return;
        }

        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () =>
          resolve({
            status: statusCode || 0,
            contentType: String(headers['content-type'] || ''),
            body: Buffer.concat(chunks),
            url,
          }),
        );
      },
    );

    call.on('error', reject);
    call.end();
  });

/**
 * Собирает сведения о плейлисте и первом сегменте
 */
export const probeHls = async (source: string): Promise<HlsProbeResult> => {
  const url = toAbsolute(source);
  const playlist = await request(url);
  const text = playlist.body.toString('utf8');
  const lines = text.split('\n').map((line) => line.trim());

  const isMaster = lines.some((line) => line.startsWith('#EXT-X-STREAM-INF'));
  const keyLine = lines.find((line) => line.startsWith('#EXT-X-KEY')) || '';

  const variants = lines.filter(
    (line, index) =>
      line &&
      !line.startsWith('#') &&
      lines[index - 1]?.startsWith('#EXT-X-STREAM-INF'),
  );

  const segments = lines.filter(
    (line, index) =>
      line && !line.startsWith('#') && lines[index - 1]?.startsWith('#EXTINF'),
  );

  const totalDuration = lines
    .filter((line) => line.startsWith('#EXTINF'))
    .reduce((sum, line) => sum + (parseFloat(line.split(':')[1]) || 0), 0);

  const result: HlsProbeResult = {
    url: playlist.url,
    status: playlist.status,
    contentType: playlist.contentType,
    isMaster,
    encrypted: Boolean(keyLine) && !keyLine.includes('METHOD=NONE'),
    keyLine,
    variants: variants.slice(0, 5),
    segmentCount: segments.length,
    totalDuration: Math.round(totalDuration),
    firstSegment: '',
    segmentStatus: 0,
    segmentType: '',
    segmentBytes: 0,
    head: lines.slice(0, 25),
  };

  if (segments.length > 0) {
    const segmentUrl = toAbsolute(segments[0], playlist.url);
    result.firstSegment = segmentUrl;

    try {
      const segment = await request(segmentUrl, { Range: 'bytes=0-4095' });
      result.segmentStatus = segment.status;
      result.segmentType = segment.contentType;
      result.segmentBytes = segment.body.length;
    } catch (error: any) {
      result.segmentType = `error: ${error?.message}`;
    }
  }

  console.log('[HlsProbe] Result:', {
    ...result,
    head: `${result.head.length} lines`,
  });

  return result;
};

export default probeHls;

/**
 * Простой HTTP-клиент с редиректами для оффлайн-модуля
 */
import https from 'https';

export interface HttpResponse {
  status: number;
  contentType: string;
  body: Buffer;
  url: string;
}

export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';

/** Читает размер из ответа на запрос одного байта и закрывает поток. */
export const probeFileSize = (
  url: string,
  headers: Record<string, string>,
  redirects = 3,
  deadline = Date.now() + 3500,
): Promise<number> => {
  const remaining = deadline - Date.now();
  if (!url.startsWith('https://') || remaining <= 0) return Promise.resolve(0);

  return new Promise<number>((resolve) => {
    let timer: ReturnType<typeof setTimeout>;
    const request = https.get(
      url,
      {
        headers: {
          ...headers,
          Range: 'bytes=0-0',
          'Accept-Encoding': 'identity',
        },
      },
      (response) => {
        const { statusCode = 0, headers: received } = response;
        response.destroy();
        clearTimeout(timer);
        if (
          statusCode >= 300 &&
          statusCode < 400 &&
          received.location &&
          redirects > 0
        ) {
          try {
            const target = new URL(received.location, url);
            const nextHeaders = { ...headers };
            if (target.origin !== new URL(url).origin)
              delete nextHeaders.Authorization;
            resolve(
              probeFileSize(target.href, nextHeaders, redirects - 1, deadline),
            );
          } catch {
            resolve(0);
          }
          return;
        }
        const mediaType = received['content-type'] || '';
        const range = /^bytes 0-0\/(\d+)$/i.exec(
          received['content-range'] || '',
        );
        let size = 0;
        if (statusCode === 206) size = Number(range?.[1]);
        if (statusCode === 200) size = Number(received['content-length']);
        resolve(
          !/text\/|json|mpegurl/i.test(mediaType) &&
            Number.isSafeInteger(size) &&
            size > 0
            ? size
            : 0,
        );
      },
    );
    timer = setTimeout(() => {
      resolve(0);
      request.destroy();
    }, remaining);
    request.on('error', () => {
      clearTimeout(timer);
      resolve(0);
    });
  }).catch(() => 0);
};

/**
 * Заголовки для запросов к Kodik и его CDN
 */
export const KODIK_HEADERS: Record<string, string> = {
  'User-Agent': DEFAULT_USER_AGENT,
  Accept: '*/*',
  'Accept-Language': 'ru,en;q=0.9',
  Referer: 'https://kodik.info/',
  Origin: 'https://kodik.info',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'cross-site',
};

/**
 * Приводит ссылку к абсолютному виду
 */
export const toAbsoluteUrl = (src: string, base?: string): string => {
  if (src.startsWith('//')) {
    return `https:${src}`;
  }

  return base ? new URL(src, base).href : src;
};

/**
 * Запрашивает ресурс целиком, следуя редиректам
 */
export const httpGet = (
  url: string,
  headers: Record<string, string> = {},
  redirects = 5,
): Promise<HttpResponse> =>
  new Promise((resolve, reject) => {
    const call = https.get(url, { headers }, (response) => {
      const { statusCode, headers: responseHeaders } = response;

      if (
        statusCode &&
        statusCode >= 300 &&
        statusCode < 400 &&
        responseHeaders.location &&
        redirects > 0
      ) {
        response.resume();
        resolve(
          httpGet(
            new URL(responseHeaders.location, url).href,
            headers,
            redirects - 1,
          ),
        );
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('error', reject);
      response.on('end', () =>
        resolve({
          status: statusCode || 0,
          contentType: String(responseHeaders['content-type'] || ''),
          body: Buffer.concat(chunks),
          url,
        }),
      );
    });

    call.on('error', reject);
    call.end();
  });

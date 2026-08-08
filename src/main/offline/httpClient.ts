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

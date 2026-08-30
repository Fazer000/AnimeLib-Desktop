/**
 * Подмена CORS-заголовков для сессии окна приложения.
 */

/**
 * Ставит заголовок, снося прежние варианты имени в любом регистре.
 * Иначе рядом с заголовком сервера появится второй, и браузер отвергнет ответ.
 */
const setHeader = (
  headers: Record<string, string[]>,
  name: string,
  value: string,
): void => {
  const lower = name.toLowerCase();

  Object.keys(headers).forEach((key) => {
    if (key.toLowerCase() === lower) {
      // eslint-disable-next-line no-param-reassign
      delete headers[key];
    }
  });

  // eslint-disable-next-line no-param-reassign
  headers[name] = [value];
};

/** Убирает заголовок во всех вариантах регистра. */
const removeHeader = (
  headers: Record<string, string[]>,
  name: string,
): void => {
  const lower = name.toLowerCase();

  Object.keys(headers).forEach((key) => {
    if (key.toLowerCase() === lower) {
      // eslint-disable-next-line no-param-reassign
      delete headers[key];
    }
  });
};

/**
 * Заменяет CORS-заголовки ответа на разрешающие.
 * Учётные данные не выдаются: со звёздочкой в Origin они всё равно запрещены,
 * а запросы приложения авторизуются заголовком Bearer.
 */
export const addCorsHeaders = (
  responseHeaders: Record<string, string[]>,
): void => {
  setHeader(responseHeaders, 'Access-Control-Allow-Origin', '*');
  setHeader(
    responseHeaders,
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  );
  // Authorization под звёздочку не подпадает: Chromium требует его явно
  setHeader(
    responseHeaders,
    'Access-Control-Allow-Headers',
    '*, Authorization',
  );
  removeHeader(responseHeaders, 'Access-Control-Allow-Credentials');
};

export default addCorsHeaders;

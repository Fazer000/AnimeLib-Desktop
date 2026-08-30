import { addCorsHeaders } from '../main/corsHeaders';

const get = (headers: Record<string, string[]>, name: string) => {
  const key = Object.keys(headers).find(
    (candidate) => candidate.toLowerCase() === name.toLowerCase(),
  );
  return key ? headers[key] : undefined;
};

const countOf = (headers: Record<string, string[]>, name: string) =>
  Object.keys(headers).filter((key) => key.toLowerCase() === name.toLowerCase())
    .length;

describe('addCorsHeaders', () => {
  it('ставит разрешающий Origin, когда сервер ничего не прислал', () => {
    const headers: Record<string, string[]> = { 'content-type': ['video/mp4'] };

    addCorsHeaders(headers);

    expect(get(headers, 'access-control-allow-origin')).toEqual(['*']);
  });

  it('заменяет заголовок сервера, а не добавляет второй', () => {
    const headers: Record<string, string[]> = {
      'access-control-allow-origin': ['https://animelib.org'],
    };

    addCorsHeaders(headers);

    expect(countOf(headers, 'access-control-allow-origin')).toBe(1);
    expect(get(headers, 'access-control-allow-origin')).toEqual(['*']);
  });

  it('снимает заголовок сервера независимо от регистра имени', () => {
    const headers: Record<string, string[]> = {
      'Access-Control-Allow-Origin': ['https://animelib.org'],
      'ACCESS-CONTROL-ALLOW-METHODS': ['GET'],
    };

    addCorsHeaders(headers);

    expect(countOf(headers, 'access-control-allow-origin')).toBe(1);
    expect(countOf(headers, 'access-control-allow-methods')).toBe(1);
    expect(get(headers, 'access-control-allow-origin')).toEqual(['*']);
  });

  it('убирает разрешение на учётные данные: со звёздочкой оно недопустимо', () => {
    const headers: Record<string, string[]> = {
      'access-control-allow-credentials': ['true'],
    };

    addCorsHeaders(headers);

    expect(get(headers, 'access-control-allow-credentials')).toBeUndefined();
  });

  it('разрешает методы, которыми приложение правит закладки и комментарии', () => {
    const headers: Record<string, string[]> = {};

    addCorsHeaders(headers);

    const methods = get(headers, 'access-control-allow-methods')?.[0] ?? '';
    ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'].forEach((method) => {
      expect(methods).toContain(method);
    });
  });

  it('перечисляет Authorization явно: звёздочка его не покрывает', () => {
    const headers: Record<string, string[]> = {};

    addCorsHeaders(headers);

    expect(get(headers, 'access-control-allow-headers')?.[0]).toContain(
      'Authorization',
    );
  });

  it('не трогает остальные заголовки ответа', () => {
    const headers: Record<string, string[]> = {
      'content-type': ['application/json'],
      'content-length': ['128'],
    };

    addCorsHeaders(headers);

    expect(headers['content-type']).toEqual(['application/json']);
    expect(headers['content-length']).toEqual(['128']);
  });
});

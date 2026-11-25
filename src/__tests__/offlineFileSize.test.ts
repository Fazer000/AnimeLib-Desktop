import https from 'https';
import { EventEmitter } from 'events';
import { probeFileSize } from '../main/offline/httpClient';

afterEach(() => jest.restoreAllMocks());

it.each([
  [
    206,
    { 'content-range': 'bytes 0-0/327155712', 'content-length': '1' },
    327155712,
  ],
  [200, { 'content-length': '327155712' }, 327155712],
  [206, { 'content-range': 'bytes 0-0/*', 'content-length': '1' }, 0],
  [502, { 'content-length': '100' }, 0],
])(
  'проверяет размер без чтения тела ответа (HTTP %s)',
  async (statusCode, headers, expected) => {
    const response = { statusCode, headers, destroy: jest.fn() };
    const request = Object.assign(new EventEmitter(), { destroy: jest.fn() });
    const get = jest.spyOn(https, 'get').mockImplementation(((
      _url: unknown,
      _options: unknown,
      callback: (value: typeof response) => void,
    ) => {
      queueMicrotask(() => callback(response));
      return request;
    }) as unknown as typeof https.get);

    await expect(
      probeFileSize('https://example.com/video.mp4', {}),
    ).resolves.toBe(expected);
    expect(get.mock.calls[0][1]).toMatchObject({
      headers: { Range: 'bytes=0-0' },
    });
    expect(response.destroy).toHaveBeenCalledTimes(1);
  },
);

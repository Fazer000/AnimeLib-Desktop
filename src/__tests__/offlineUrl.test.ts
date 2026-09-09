import {
  buildOfflineUrl,
  isOfflineUrl,
  parseOfflineFileName,
} from '../constants';

describe('offlineUrl: распознавание локальных ссылок', () => {
  it('ссылка библиотеки распознаётся', () => {
    expect(isOfflineUrl(buildOfflineUrl('logo.img'))).toBe(true);
  });

  it('сетевые ссылки не считаются локальными', () => {
    expect(isOfflineUrl('https://animelib.org/logo.png')).toBe(false);
    expect(isOfflineUrl('')).toBe(false);
    expect(isOfflineUrl('blob:animelib-offline://x')).toBe(false);
  });

  it('имя файла восстанавливается из ссылки', () => {
    expect(parseOfflineFileName(buildOfflineUrl('logo.img'))).toBe('logo.img');
  });

  it('из сетевой ссылки имя не извлекается', () => {
    expect(parseOfflineFileName('https://animelib.org/logo.png')).toBe('');
  });
});

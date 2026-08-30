import {
  normalizeKodikUrl,
  resolveKodikSource,
  toKodikDirectUrl,
} from '../renderer/utils/kodikHelpers';

describe('normalizeKodikUrl', () => {
  it('дописывает схему к протоколо-относительной ссылке', () => {
    expect(normalizeKodikUrl('//cloud.kodik.info/a.mp4')).toBe(
      'https://cloud.kodik.info/a.mp4',
    );
  });

  it('готовую ссылку не трогает', () => {
    expect(normalizeKodikUrl('https://cloud.kodik.info/a.mp4')).toBe(
      'https://cloud.kodik.info/a.mp4',
    );
    expect(normalizeKodikUrl('http://cloud.kodik.info/a.mp4')).toBe(
      'http://cloud.kodik.info/a.mp4',
    );
  });
});

describe('toKodikDirectUrl', () => {
  it('обрезает всё начиная с маркера hls', () => {
    expect(
      toKodikDirectUrl('https://cloud.kodik.info/video/720.mp4:hls:manifest'),
    ).toBe('https://cloud.kodik.info/video/720.mp4');
  });

  it('без маркера прямой ссылки нет', () => {
    expect(toKodikDirectUrl('https://cloud.kodik.info/video/720.mp4')).toBe('');
  });

  it('маркер в самом начале не даёт пустой ссылки', () => {
    expect(toKodikDirectUrl(':hls:manifest')).toBe('');
  });
});

describe('resolveKodikSource', () => {
  it('из hls-ссылки делает прогрессивный источник с откатом', () => {
    const source = resolveKodikSource('//cloud.kodik.info/v/720.mp4:hls:m');

    expect(source).toEqual({
      src: 'https://cloud.kodik.info/v/720.mp4',
      fallbackSrc: 'https://cloud.kodik.info/v/720.mp4:hls:m',
      type: 'progressive',
    });
  });

  it('чистую hls-ссылку оставляет потоком без отката', () => {
    const source = resolveKodikSource('//cloud.kodik.info/v/master.m3u8');

    expect(source).toEqual({
      src: 'https://cloud.kodik.info/v/master.m3u8',
      fallbackSrc: '',
      type: 'hls',
    });
  });

  it('откат всегда указывает на нормализованную ссылку', () => {
    const source = resolveKodikSource('//host/v.mp4:hls:m');

    expect(source.fallbackSrc.startsWith('https://')).toBe(true);
  });
});

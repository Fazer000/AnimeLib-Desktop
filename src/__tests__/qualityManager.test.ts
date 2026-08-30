import type { Player, KodikVideoLinks } from '../renderer/api/animeApi';

const findEpisodes = jest.fn(() => [] as unknown[]);

jest.mock('../renderer/services/offline', () => ({
  offlineStore: {
    findEpisodes: (...args: unknown[]) => findEpisodes(...(args as [])),
  },
}));

// eslint-disable-next-line import/first
import { QualityManager } from '../renderer/services/player/QualityManager';

const animelibPlayer = (heights: number[]): Player =>
  ({
    id: 1,
    player: 'Animelib',
    video: {
      id: 1,
      quality: heights.map((quality) => ({
        href: `/video/${quality}.mp4`,
        quality,
        bitrate: 0,
      })),
    },
  }) as Player;

const kodikLinks = (
  data: Record<string, Array<{ src: string; type: string }>>,
): KodikVideoLinks => ({ success: true, data });

describe('QualityManager: сборка вариантов', () => {
  beforeEach(() => findEpisodes.mockReturnValue([]));

  it('сортирует качества по убыванию и выбирает лучшее', () => {
    const onSelectedQualityChange = jest.fn();
    const manager = new QualityManager({ onSelectedQualityChange });

    manager.createQualityOptions(animelibPlayer([480, 1080, 720]));

    expect(manager.getQualityOptions().map((o) => o.value)).toEqual([
      '1080p',
      '720p',
      '480p',
    ]);
    expect(onSelectedQualityChange).toHaveBeenCalledWith('1080p');
  });

  it('качество без ссылки пропускается', () => {
    const manager = new QualityManager();
    const player = animelibPlayer([720, 480]);
    player.video!.quality[1].href = '';

    manager.createQualityOptions(player);

    expect(manager.getQualityOptions()).toHaveLength(1);
  });

  it('у Animelib на каждый вариант есть два запасных адреса', () => {
    const manager = new QualityManager();

    manager.createQualityOptions(animelibPlayer([720]));
    const [option] = manager.getQualityOptions();

    expect(option.type).toBe('progressive');
    expect(option.src).not.toBe(option.fallbackSrc);
    expect(option.fallbackSrc2).toContain('video2.cdnlibs.org');
  });

  it('источники Kodik разбираются на прямой и запасной', () => {
    const manager = new QualityManager();
    const player = { id: 2, player: 'Kodik' } as Player;

    manager.createQualityOptions(
      player,
      kodikLinks({
        '720': [{ src: '//cdn.kodik/v/720.mp4:hls:m', type: 'video/mp4' }],
      }),
    );

    const [option] = manager.getQualityOptions();
    expect(option.value).toBe('720p');
    expect(option.type).toBe('progressive');
    expect(option.fallbackSrc).toContain(':hls:');
  });

  it('пустой список источников Kodik не создаёт вариантов', () => {
    const manager = new QualityManager();

    manager.createQualityOptions(
      { id: 2, player: 'Kodik' } as Player,
      {
        success: true,
        data: { '720': [] },
      } as KodikVideoLinks,
    );

    expect(manager.hasOptions()).toBe(false);
  });

  it('оффлайн-копии вытесняют сетевые варианты', () => {
    findEpisodes.mockReturnValue([
      { quality: '720p', fileName: 'a.mp4', playlistFileName: '' },
      { quality: '1080p', fileName: 'b.mp4', playlistFileName: '' },
    ]);
    const manager = new QualityManager();

    manager.createQualityOptions(animelibPlayer([480]), null, 55);

    const options = manager.getQualityOptions();
    expect(options.map((o) => o.value)).toEqual(['1080p', '720p']);
    expect(options[0].label).toContain('оффлайн');
  });

  it('оффлайн-копия в формате hls не получает прогрессивных запасных', () => {
    findEpisodes.mockReturnValue([
      { quality: '720p', fileName: 'a.ts', playlistFileName: 'a.m3u8' },
    ]);
    const manager = new QualityManager();

    manager.createQualityOptions(animelibPlayer([720]), null, 55);
    const [option] = manager.getQualityOptions();

    expect(option.type).toBe('hls');
    expect(option.fallbackSrc).toBeUndefined();
  });
});

describe('QualityManager: выбор качества', () => {
  beforeEach(() => findEpisodes.mockReturnValue([]));

  it('переключение на существующее качество принимается', () => {
    const onSelectedQualityChange = jest.fn();
    const manager = new QualityManager({ onSelectedQualityChange });
    manager.createQualityOptions(animelibPlayer([1080, 720]));
    onSelectedQualityChange.mockClear();

    expect(manager.setSelectedQuality('720p')).toBe(true);
    expect(manager.getSelectedQuality()).toBe('720p');
    expect(onSelectedQualityChange).toHaveBeenCalledWith('720p');
  });

  it('переключение на отсутствующее отклоняется без побочных эффектов', () => {
    const onSelectedQualityChange = jest.fn();
    const manager = new QualityManager({ onSelectedQualityChange });
    manager.createQualityOptions(animelibPlayer([1080]));
    onSelectedQualityChange.mockClear();

    expect(manager.setSelectedQuality('144p')).toBe(false);
    expect(manager.getSelectedQuality()).toBe('1080p');
    expect(onSelectedQualityChange).not.toHaveBeenCalled();
  });

  it('getSelectedQualityOption отдаёт выбранный вариант', () => {
    const manager = new QualityManager();
    manager.createQualityOptions(animelibPlayer([1080, 720]));

    expect(manager.getSelectedQualityOption()?.value).toBe('1080p');
  });

  it('reset очищает варианты и сообщает об этом', () => {
    const onQualityOptionsChange = jest.fn();
    const manager = new QualityManager({ onQualityOptionsChange });
    manager.createQualityOptions(animelibPlayer([1080]));

    manager.reset();

    expect(manager.hasOptions()).toBe(false);
    expect(manager.getSelectedQuality()).toBe('');
    expect(onQualityOptionsChange).toHaveBeenLastCalledWith([]);
  });

  it('список вариантов отдаётся копией', () => {
    const manager = new QualityManager();
    manager.createQualityOptions(animelibPlayer([1080]));

    manager.getQualityOptions().pop();

    expect(manager.getQualityOptions()).toHaveLength(1);
  });
});

describe('QualityManager.buildAnimelibUrls', () => {
  const manager = new QualityManager();

  it('относительный путь разворачивает в три зеркала', () => {
    const urls = manager.buildAnimelibUrls('/v/720.mp4');

    expect(urls.primaryUrl).toContain('video1.cdnlibs.org/.%D0%B0s');
    expect(urls.fallbackUrl).toBe('https://video1.cdnlibs.org/v/720.mp4');
    expect(urls.fallbackUrl2).toContain('video2.cdnlibs.org');
  });

  it('абсолютной ссылке добавляет обходной путь как основной', () => {
    const href = 'https://video1.cdnlibs.org/v/720.mp4';
    const urls = manager.buildAnimelibUrls(href);

    expect(urls.primaryUrl).toContain('.%D0%B0s');
    expect(urls.fallbackUrl).toBe(href);
    expect(urls.fallbackUrl2).toContain('video2.cdnlibs.org');
  });

  it('протоколо-относительной только дописывает схему', () => {
    const urls = manager.buildAnimelibUrls('//cdn.example.com/v.mp4');

    expect(urls.primaryUrl).toBe('https://cdn.example.com/v.mp4');
    expect(urls.fallbackUrl).toBe(urls.primaryUrl);
  });
});

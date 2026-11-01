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
    expect(option.fallbackSrc).toContain('video2.cdnlibs.org');
    expect(option.fallbackSrc2).toContain('video1.imglib.info');
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
      { playerId: 1, quality: '720p', fileName: 'a.mp4', playlistFileName: '' },
      {
        playerId: 1,
        quality: '1080p',
        fileName: 'b.mp4',
        playlistFileName: '',
      },
    ]);
    const manager = new QualityManager();

    manager.createQualityOptions(animelibPlayer([480]), null, 55);

    const options = manager.getQualityOptions();
    expect(options.map((o) => o.value)).toEqual(['1080p', '720p']);
    expect(options[0].label).toContain('оффлайн');
  });

  it('для скачанной копии «Авто» недоступно', () => {
    findEpisodes.mockReturnValue([
      { playerId: 1, quality: '720p', fileName: 'a.mp4', playlistFileName: '' },
    ]);
    const manager = new QualityManager();

    manager.createQualityOptions(animelibPlayer([720]), null, 55);

    expect(manager.getModeState()).toMatchObject({
      available: false,
      auto: false,
    });
  });

  it('для сетевых вариантов «Авто» доступно', () => {
    const manager = new QualityManager();

    manager.createQualityOptions(animelibPlayer([720]));

    expect(manager.getModeState().available).toBe(true);
  });

  it('оффлайн-копия в формате hls не получает прогрессивных запасных', () => {
    findEpisodes.mockReturnValue([
      {
        playerId: 1,
        quality: '720p',
        fileName: 'a.ts',
        playlistFileName: 'a.m3u8',
      },
    ]);
    const manager = new QualityManager();

    manager.createQualityOptions(animelibPlayer([720]), null, 55);
    const [option] = manager.getQualityOptions();

    expect(option.type).toBe('hls');
    expect(option.fallbackSrc).toBeUndefined();
  });

  it('копия Kodik, скачанная под прежним id плеера, всё равно играет', () => {
    findEpisodes.mockReturnValue([
      {
        playerId: 11,
        playerType: 'Kodik',
        teamId: 7,
        translationTypeId: 2,
        quality: '720p',
        fileName: 'k.mp4',
        playlistFileName: '',
      },
    ]);
    const manager = new QualityManager();
    const player = {
      id: 21,
      player: 'Kodik',
      team: { id: 7 },
      translation_type: { id: 2 },
    } as Player;

    manager.createQualityOptions(player, null, 55);

    expect(manager.getQualityOptions()[0].label).toContain('оффлайн');
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

  it('без video_domain первым идёт основной сервер', () => {
    const urls = manager.buildAnimelibUrls('/v/720.mp4');

    expect(urls.primaryUrl).toBe(
      'https://video1.cdnlibs.org/.%D0%B0s/v/720.mp4',
    );
    expect(urls.fallbackUrl).toBe('https://video2.cdnlibs.org/v/720.mp4');
    expect(urls.fallbackUrl2).toBe('https://video1.imglib.info/v/720.mp4');
  });

  it('сервер из video_domain становится основным', () => {
    const urls = manager.buildAnimelibUrls('/v/720.mp4', 'secondary_2');

    expect(urls.primaryUrl).toBe('https://video1.imglib.info/v/720.mp4');
    expect(urls.fallbackUrl).toContain('video1.cdnlibs.org/.%D0%B0s');
  });

  it('протоколо-относительной только дописывает схему', () => {
    const urls = manager.buildAnimelibUrls('//cdn.example.com/v.mp4');

    expect(urls.primaryUrl).toBe('https://cdn.example.com/v.mp4');
    expect(urls.fallbackUrl).toBe(urls.primaryUrl);
  });
});

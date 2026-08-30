import { PlayerSelectionManager } from '../renderer/services/player/PlayerSelectionManager';
import type { Player } from '../renderer/api/animeApi';

const player = (
  type: string,
  teamName: string,
  patch: Record<string, unknown> = {},
): Player =>
  ({
    id: Math.random(),
    player: type,
    team: { name: teamName },
    translation_type: { id: 1, label: 'Озвучка' },
    ...patch,
  }) as Player;

describe('PlayerSelectionManager: предпочтения', () => {
  beforeEach(() => localStorage.clear());

  it('без сохранённых предпочтений автовыбор по ним не работает', () => {
    const manager = new PlayerSelectionManager();

    expect(manager.hasPreferences()).toBe(false);
    expect(
      manager.autoSelectPlayer([player('Animelib', 'AniLibria')]),
    ).toBeNull();
  });

  it('сохранённая пара озвучка-плеер переживает пересоздание', () => {
    new PlayerSelectionManager().savePreference('AniLibria', 'Animelib');

    const manager = new PlayerSelectionManager();

    expect(manager.hasPreferences()).toBe(true);
    expect(manager.getPreferences()).toEqual({
      teamName: 'AniLibria',
      playerType: 'Animelib',
    });
  });

  it('битые предпочтения не роняют конструктор', () => {
    localStorage.setItem('playerPreferences', 'не json');

    expect(() => new PlayerSelectionManager()).not.toThrow();
    expect(new PlayerSelectionManager().hasPreferences()).toBe(false);
  });

  it('совпадение требует и озвучки, и типа плеера', () => {
    const manager = new PlayerSelectionManager();
    manager.savePreference('AniLibria', 'Animelib');

    expect(manager.autoSelectPlayer([player('Kodik', 'AniLibria')])).toBeNull();
    expect(manager.autoSelectPlayer([player('Animelib', 'Другая')])).toBeNull();
    expect(
      manager.autoSelectPlayer([player('Animelib', 'AniLibria')])?.team.name,
    ).toBe('AniLibria');
  });

  it('очистка предпочтений возвращает менеджер к пустому состоянию', () => {
    const manager = new PlayerSelectionManager();
    manager.savePreference('AniLibria', 'Animelib');

    manager.clearPreferences();

    expect(manager.hasPreferences()).toBe(false);
    expect(localStorage.getItem('playerPreferences')).toBeNull();
  });
});

describe('PlayerSelectionManager: выбор с откатом', () => {
  beforeEach(() => localStorage.clear());

  it('на пустом списке ничего не выбирает', () => {
    expect(
      new PlayerSelectionManager().autoSelectPlayerOrFallback([]),
    ).toBeNull();
  });

  it('предпочтения важнее порядка в списке', () => {
    const manager = new PlayerSelectionManager();
    manager.savePreference('Вторая', 'Kodik');

    const selected = manager.autoSelectPlayerOrFallback([
      player('Animelib', 'Первая'),
      player('Kodik', 'Вторая'),
    ]);

    expect(selected?.team.name).toBe('Вторая');
  });

  it('без совпадения предпочтений берёт Animelib', () => {
    const manager = new PlayerSelectionManager();
    manager.savePreference('Пропавшая', 'Kodik');

    const selected = manager.autoSelectPlayerOrFallback([
      player('Kodik', 'Первая'),
      player('Animelib', 'Вторая'),
    ]);

    expect(selected?.player).toBe('Animelib');
  });

  it('без Animelib берёт Kodik', () => {
    const selected = new PlayerSelectionManager().autoSelectPlayerOrFallback([
      player('Sibnet', 'Первая'),
      player('Kodik', 'Вторая'),
    ]);

    expect(selected?.player).toBe('Kodik');
  });

  it('без известных плееров берёт первый попавшийся', () => {
    const selected = new PlayerSelectionManager().autoSelectPlayerOrFallback([
      player('Sibnet', 'Первая'),
      player('VK', 'Вторая'),
    ]);

    expect(selected?.team.name).toBe('Первая');
  });
});

describe('PlayerSelectionManager: группировка и типы', () => {
  beforeEach(() => localStorage.clear());

  it('группирует плееры по типу', () => {
    const grouped = PlayerSelectionManager.groupPlayersByType([
      player('Animelib', 'A'),
      player('Kodik', 'B'),
      player('Animelib', 'C'),
    ]);

    expect(Object.keys(grouped).sort()).toEqual(['Animelib', 'Kodik']);
    expect(grouped.Animelib).toHaveLength(2);
  });

  it('Animelib всегда первый, остальные по алфавиту', () => {
    const types = PlayerSelectionManager.getSortedPlayerTypes({
      Sibnet: [],
      Kodik: [],
      Animelib: [],
    });

    expect(types).toEqual(['Animelib', 'Kodik', 'Sibnet']);
  });

  it('текущий тип сохраняется, пока он доступен', () => {
    const manager = new PlayerSelectionManager();

    expect(
      manager.autoSelectPlayerType({ Kodik: [], Animelib: [] }, 'Kodik'),
    ).toBe('Kodik');
  });

  it('исчезнувший тип заменяется предпочтением', () => {
    const manager = new PlayerSelectionManager();
    manager.savePreference('AniLibria', 'Kodik');

    expect(
      manager.autoSelectPlayerType({ Kodik: [], Animelib: [] }, 'Sibnet'),
    ).toBe('Kodik');
  });

  it('без предпочтений берётся первый по порядку тип', () => {
    const manager = new PlayerSelectionManager();

    expect(manager.autoSelectPlayerType({ Sibnet: [], Animelib: [] }, '')).toBe(
      'Animelib',
    );
  });

  it('на пустой группировке тип пустой', () => {
    expect(new PlayerSelectionManager().autoSelectPlayerType({}, '')).toBe('');
  });
});

describe('PlayerSelectionManager: качество и вид перевода', () => {
  it('берёт максимальное разрешение плеера', () => {
    const withQuality = player('Animelib', 'A', {
      video: {
        id: 1,
        quality: [
          { href: '', quality: 480, bitrate: 0 },
          { href: '', quality: 1080, bitrate: 0 },
          { href: '', quality: 720, bitrate: 0 },
        ],
      },
    });

    expect(PlayerSelectionManager.getMaxQuality(withQuality)).toBe(1080);
  });

  it('без данных о качестве возвращает ноль', () => {
    expect(PlayerSelectionManager.getMaxQuality(player('Kodik', 'A'))).toBe(0);
  });

  it('метка качества соответствует разрешению', () => {
    expect(PlayerSelectionManager.getQualityTag(2160)).toBe('4K');
    expect(PlayerSelectionManager.getQualityTag(1080)).toBe('FHD');
    expect(PlayerSelectionManager.getQualityTag(720)).toBe('HD');
    expect(PlayerSelectionManager.getQualityTag(480)).toBe('SD');
    expect(PlayerSelectionManager.getQualityTag(360)).toBe('');
    expect(PlayerSelectionManager.getQualityTag(0)).toBe('');
  });

  it('субтитровые озвучки распознаются по подписи', () => {
    const subs = (label: string) =>
      player('Animelib', 'A', { translation_type: { id: 2, label } });

    expect(PlayerSelectionManager.isSubtitlesOnly(subs('Субтитры'))).toBe(true);
    expect(PlayerSelectionManager.isSubtitlesOnly(subs('Sub'))).toBe(true);
    expect(PlayerSelectionManager.isSubtitlesOnly(subs('Озвучка'))).toBe(false);
  });
});

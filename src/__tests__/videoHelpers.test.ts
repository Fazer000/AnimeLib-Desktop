import {
  calculateBufferedPercent,
  calculateProgressPercent,
  formatTime,
  getQualityLevel,
  getQualityTagFromResolution,
  getQualityTagColor,
  loadFromStorage,
  saveToStorage,
} from '../renderer/utils/videoHelpers';

describe('formatTime', () => {
  it('форматирует секунды как M:SS', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(9)).toBe('0:09');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(600)).toBe('10:00');
  });

  it('часы не выделяет, минуты продолжают расти', () => {
    expect(formatTime(3661)).toBe('61:01');
  });

  it('отбрасывает дробную часть секунд', () => {
    expect(formatTime(59.9)).toBe('0:59');
  });

  it('на NaN, Infinity и отрицательных возвращает ноль', () => {
    expect(formatTime(NaN)).toBe('0:00');
    expect(formatTime(Infinity)).toBe('0:00');
    expect(formatTime(-5)).toBe('0:00');
  });
});

describe('getQualityLevel', () => {
  it('делит разрешения на три уровня', () => {
    expect(getQualityLevel('2160p')).toBe('4K');
    expect(getQualityLevel('1080p')).toBe('HD');
    expect(getQualityLevel('720p')).toBe('HD');
    expect(getQualityLevel('480p')).toBe('SD');
  });

  it('нераспознанное считает SD', () => {
    expect(getQualityLevel('auto')).toBe('SD');
  });
});

describe('getQualityTagFromResolution', () => {
  it('различает FHD и HD, в отличие от уровня', () => {
    expect(getQualityTagFromResolution('2160p')).toBe('4K');
    expect(getQualityTagFromResolution('1080p')).toBe('FHD');
    expect(getQualityTagFromResolution('720p')).toBe('HD');
    expect(getQualityTagFromResolution('360p')).toBe('SD');
  });

  it('на нечисловом значении возвращает пустую метку', () => {
    expect(getQualityTagFromResolution('auto')).toBe('');
    expect(getQualityTagFromResolution('')).toBe('');
  });
});

describe('getQualityTagColor', () => {
  it('у каждой метки свой цвет', () => {
    const tags = ['4K', 'FHD', 'HD', 'SD'];
    const colors = tags.map(getQualityTagColor);

    expect(new Set(colors).size).toBe(tags.length);
  });

  it('неизвестная метка получает цвет по умолчанию', () => {
    expect(getQualityTagColor('???')).toBe(getQualityTagColor('FHD'));
  });
});

describe('проценты прогресса и буфера', () => {
  it('считают долю от длительности', () => {
    expect(calculateProgressPercent(30, 120)).toBe(25);
    expect(calculateBufferedPercent(60, 120)).toBe(50);
  });

  it('нулевая длительность не даёт деления на ноль', () => {
    expect(calculateProgressPercent(30, 0)).toBe(0);
    expect(calculateBufferedPercent(30, 0)).toBe(0);
  });
});

describe('loadFromStorage / saveToStorage', () => {
  beforeEach(() => localStorage.clear());

  it('сохраняет и читает значение по кругу', () => {
    saveToStorage('probe', { enabled: true, level: 3 });

    expect(loadFromStorage('probe', null)).toEqual({ enabled: true, level: 3 });
  });

  it('на отсутствующем ключе отдаёт значение по умолчанию', () => {
    expect(loadFromStorage('missing', 42)).toBe(42);
  });

  it('битый JSON не роняет чтение', () => {
    localStorage.setItem('broken', '{не json');

    expect(loadFromStorage('broken', 'fallback')).toBe('fallback');
  });
});

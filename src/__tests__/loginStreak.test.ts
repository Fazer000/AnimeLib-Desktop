import {
  LOGIN_STREAK_DARK_PALETTES,
  LOGIN_STREAK_LIGHT_PALETTES,
} from '../renderer/theme/palette';
import {
  formatStreakTooltip,
  formatStreakValue,
  getActiveStreak,
  getStreakTier,
  getStreakValueSize,
  isGradientColors,
  resolveStreakColors,
  resolveStreakScheme,
} from '../renderer/utils/loginStreak';

const NOW = new Date(2026, 8, 23, 15, 0, 0);

describe('getActiveStreak', () => {
  it('серия с сегодняшним входом действует', () => {
    expect(
      getActiveStreak(
        { login_streak: 26, last_login_at: '2026-09-23 09:10:00' },
        NOW,
      ),
    ).toBe(26);
  });

  it('серия со вчерашним входом ещё действует', () => {
    expect(
      getActiveStreak(
        { login_streak: 5, last_login_at: '2026-09-22 00:05:00' },
        NOW,
      ),
    ).toBe(5);
  });

  it('вход позавчера прерывает серию', () => {
    expect(
      getActiveStreak(
        { login_streak: 5, last_login_at: '2026-09-21 23:59:00' },
        NOW,
      ),
    ).toBeNull();
  });

  it('серия короче четырёх дней не показывается', () => {
    expect(
      getActiveStreak(
        { login_streak: 3, last_login_at: '2026-09-23 09:10:00' },
        NOW,
      ),
    ).toBeNull();
  });

  it('без даты входа или с битой датой серии нет', () => {
    expect(getActiveStreak({ login_streak: 10 }, NOW)).toBeNull();
    expect(
      getActiveStreak({ login_streak: 10, last_login_at: 'вчера' }, NOW),
    ).toBeNull();
    expect(getActiveStreak(null, NOW)).toBeNull();
  });
});

describe('getStreakTier', () => {
  it('уровни меняются на границах в днях', () => {
    expect(getStreakTier(7)).toBe('week');
    expect(getStreakTier(8)).toBe('month');
    expect(getStreakTier(30)).toBe('month');
    expect(getStreakTier(31)).toBe('season');
    expect(getStreakTier(90)).toBe('season');
    expect(getStreakTier(91)).toBe('halfyear');
    expect(getStreakTier(180)).toBe('halfyear');
    expect(getStreakTier(181)).toBe('year');
    expect(getStreakTier(365)).toBe('year');
    expect(getStreakTier(366)).toBe('legend');
  });
});

describe('formatStreakValue и getStreakValueSize', () => {
  it('до тысячи число пишется целиком', () => {
    expect(formatStreakValue(999)).toBe('999');
  });

  it('с тысячи — сокращение в тысячах', () => {
    expect(formatStreakValue(1000)).toBe('1k');
    expect(formatStreakValue(2750)).toBe('2k');
  });

  it('длинное число ужимается', () => {
    expect(getStreakValueSize('26')).toBe('normal');
    expect(getStreakValueSize('1k')).toBe('normal');
    expect(getStreakValueSize('150')).toBe('compact');
    expect(getStreakValueSize('12k')).toBe('compact');
    expect(getStreakValueSize('1000')).toBe('ultra');
  });
});

describe('resolveStreakScheme', () => {
  it('закреплённая автором тема важнее темы приложения', () => {
    expect(resolveStreakScheme({ login_streak_theme: 'dark' }, 'light')).toBe(
      'dark',
    );
  });

  it('авто и пустые настройки следуют теме приложения', () => {
    expect(resolveStreakScheme({ login_streak_theme: 'auto' }, 'light')).toBe(
      'light',
    );
    expect(resolveStreakScheme(null, 'dark')).toBe('dark');
  });
});

describe('resolveStreakColors', () => {
  it('личный стиль автора берётся из палитры его темы', () => {
    expect(
      resolveStreakColors(
        {
          login_streak_dark_icon_style: 'dark-forest',
          login_streak_light_icon_style: 'light-mint',
        },
        'month',
        'dark',
      ),
    ).toEqual(LOGIN_STREAK_DARK_PALETTES['dark-forest'].month);
  });

  it('в светлой теме берётся светлый стиль', () => {
    expect(
      resolveStreakColors(
        { login_streak_light_icon_style: 'light-mint' },
        'week',
        'light',
      ),
    ).toEqual(LOGIN_STREAK_LIGHT_PALETTES['light-mint'].week);
  });

  it('без настроек и с неизвестным стилем — стандартный', () => {
    expect(resolveStreakColors(null, 'week', 'dark')).toEqual(
      LOGIN_STREAK_DARK_PALETTES['dark-ember'].week,
    );
    expect(
      resolveStreakColors(
        { login_streak_light_icon_style: 'light-future' },
        'year',
        'light',
      ),
    ).toEqual(LOGIN_STREAK_LIGHT_PALETTES['light-orange'].year);
  });

  it('премиальные стили закрашиваются градиентом', () => {
    const colors = resolveStreakColors(
      { login_streak_dark_icon_style: 'premium-neon' },
      'legend',
      'dark',
    );

    expect(isGradientColors(colors)).toBe(true);
    expect(
      isGradientColors(LOGIN_STREAK_DARK_PALETTES['dark-ember'].week),
    ).toBe(false);
  });

  it('у каждого стиля заданы все уровни', () => {
    const tiers = ['week', 'month', 'season', 'halfyear', 'year', 'legend'];

    [LOGIN_STREAK_DARK_PALETTES, LOGIN_STREAK_LIGHT_PALETTES].forEach(
      (palettes) => {
        Object.values(palettes).forEach((style) => {
          expect(Object.keys(style).sort()).toEqual([...tiers].sort());
        });
      },
    );
  });
});

describe('formatStreakTooltip', () => {
  it('склоняет дни', () => {
    expect(formatStreakTooltip(26)).toBe('Текущая серия: 26 дней');
    expect(formatStreakTooltip(21)).toBe('Текущая серия: 21 день');
    expect(formatStreakTooltip(4)).toBe('Текущая серия: 4 дня');
  });
});

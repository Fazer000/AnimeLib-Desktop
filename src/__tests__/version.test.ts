import { isNewerVersion, parseVersion } from '../shared/version';

describe('parseVersion', () => {
  it('срезает префикс v и разбирает по точкам', () => {
    expect(parseVersion('v1.6.7')).toEqual([1, 6, 7]);
    expect(parseVersion('1.6.7')).toEqual([1, 6, 7]);
  });

  it('нечисловые части считает нулём', () => {
    expect(parseVersion('1.6.7.ro5')).toEqual([1, 6, 7, 0]);
    expect(parseVersion('1.6.beta')).toEqual([1, 6, 0]);
  });
});

describe('isNewerVersion', () => {
  it('сравнивает по старшинству разрядов', () => {
    expect(isNewerVersion('1.7.0', '1.6.9')).toBe(true);
    expect(isNewerVersion('2.0.0', '1.99.99')).toBe(true);
    expect(isNewerVersion('1.6.9', '1.7.0')).toBe(false);
  });

  it('равные версии обновлением не считает', () => {
    expect(isNewerVersion('1.6.7', '1.6.7')).toBe(false);
    expect(isNewerVersion('v1.6.7', '1.6.7')).toBe(false);
  });

  it('версия с лишним разрядом новее короткой', () => {
    expect(isNewerVersion('1.6.7.1', '1.6.7')).toBe(true);
    expect(isNewerVersion('1.6.7', '1.6.7.1')).toBe(false);
  });

  it('не путает 10 и 2 при посимвольном сравнении', () => {
    expect(isNewerVersion('1.10.0', '1.2.0')).toBe(true);
    expect(isNewerVersion('1.2.0', '1.10.0')).toBe(false);
  });

  it('буквенный суффикс релиза не мешает сравнению', () => {
    expect(isNewerVersion('1.6.8.ro1', '1.6.7.ro5')).toBe(true);
    expect(isNewerVersion('1.6.7.ro5', '1.6.7.ro1')).toBe(false);
  });
});

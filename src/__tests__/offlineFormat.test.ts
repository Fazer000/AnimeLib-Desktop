import {
  formatEta,
  formatProgress,
  formatSize,
  formatSpeed,
  sumSize,
} from '../renderer/utils/offlineFormat';

const MB = 1024 * 1024;
const GB = MB * 1024;

describe('formatSize', () => {
  it('до гигабайта показывает целые мегабайты', () => {
    expect(formatSize(700 * MB)).toBe('700 МБ');
    expect(formatSize(1.5 * MB)).toBe('2 МБ');
  });

  it('от гигабайта переходит на ГБ с одним знаком', () => {
    expect(formatSize(GB)).toBe('1.0 ГБ');
    expect(formatSize(2.35 * GB)).toBe('2.4 ГБ');
  });

  it('нулевой размер не показывает вовсе', () => {
    expect(formatSize(0)).toBe('');
  });
});

describe('formatProgress', () => {
  it('показывает загруженное и полное в мегабайтах', () => {
    expect(formatProgress(300 * MB, 700 * MB)).toBe('300 / 700 МБ');
  });

  it('при большом объёме переходит на гигабайты с одним знаком', () => {
    expect(formatProgress(0.5 * GB, 2 * GB)).toBe('0.5 / 2.0 ГБ');
  });

  it('единица выбирается по полному размеру, а не по загруженному', () => {
    expect(formatProgress(10 * MB, 3 * GB)).toBe('0.0 / 3.0 ГБ');
  });

  it('без известного полного размера показывает только загруженное', () => {
    expect(formatProgress(150 * MB, 0)).toBe('150 МБ');
    expect(formatProgress(150 * MB, -1)).toBe('150 МБ');
  });
});

describe('formatSpeed', () => {
  it('показывает мегабайты в секунду', () => {
    expect(formatSpeed(5.5 * MB)).toBe('5.5 МБ/с');
  });

  it('нулевая и отрицательная скорость не показывается', () => {
    expect(formatSpeed(0)).toBe('');
    expect(formatSpeed(-1)).toBe('');
  });
});

describe('formatEta', () => {
  it('до минуты считает в секундах с округлением вверх', () => {
    expect(formatEta(1)).toBe('1 с');
    expect(formatEta(30.2)).toBe('31 с');
    expect(formatEta(59)).toBe('59 с');
  });

  it('до часа считает в минутах', () => {
    expect(formatEta(60)).toBe('1 мин');
    expect(formatEta(1800)).toBe('30 мин');
  });

  it('дальше показывает часы и минуты', () => {
    expect(formatEta(3600)).toBe('1 ч');
    expect(formatEta(3600 + 1800)).toBe('1 ч 30 мин');
    expect(formatEta(7200)).toBe('2 ч');
  });

  it('неизвестный остаток не показывается', () => {
    expect(formatEta(0)).toBe('');
    expect(formatEta(-5)).toBe('');
    expect(formatEta(NaN)).toBe('');
    expect(formatEta(Infinity)).toBe('');
  });
});

describe('sumSize', () => {
  it('складывает размеры', () => {
    expect(sumSize([1, 2, 3])).toBe(6);
  });

  it('пропуски в списке считает нулями', () => {
    expect(sumSize([1, NaN, 3])).toBe(4);
    expect(sumSize([])).toBe(0);
  });
});

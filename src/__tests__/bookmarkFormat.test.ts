import {
  formatContinueLabel,
  formatOfflineLabel,
} from '../renderer/utils/bookmarkFormat';

describe('formatContinueLabel', () => {
  it('подставляет номер эпизода', () => {
    expect(formatContinueLabel('7')).toBe('Продолжить · 7 эпизод');
  });

  it('без номера обходится общей подписью', () => {
    expect(formatContinueLabel('')).toBe('Продолжить просмотр');
    expect(formatContinueLabel('   ')).toBe('Продолжить просмотр');
  });

  it('обрезает пробелы вокруг номера', () => {
    expect(formatContinueLabel(' 12 ')).toBe('Продолжить · 12 эпизод');
  });
});

describe('formatOfflineLabel', () => {
  it('подставляет номер эпизода', () => {
    expect(formatOfflineLabel('3')).toBe('Скачано · 3 эпизод');
  });

  it('без номера обходится общей подписью', () => {
    expect(formatOfflineLabel('')).toBe('Скачано');
  });
});

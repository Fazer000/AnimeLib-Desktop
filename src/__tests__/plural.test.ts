import { pluralRu } from '../renderer/utils/plural';

const DAYS = ['день', 'дня', 'дней'] as const;

describe('pluralRu', () => {
  it('единица — первая форма', () => {
    expect(pluralRu(1, DAYS)).toBe('день');
    expect(pluralRu(21, DAYS)).toBe('день');
    expect(pluralRu(101, DAYS)).toBe('день');
  });

  it('от двух до четырёх — вторая форма', () => {
    expect(pluralRu(2, DAYS)).toBe('дня');
    expect(pluralRu(4, DAYS)).toBe('дня');
    expect(pluralRu(23, DAYS)).toBe('дня');
  });

  it('остальные — третья форма', () => {
    expect(pluralRu(5, DAYS)).toBe('дней');
    expect(pluralRu(20, DAYS)).toBe('дней');
    expect(pluralRu(0, DAYS)).toBe('дней');
  });

  it('от одиннадцати до девятнадцати — третья форма', () => {
    expect(pluralRu(11, DAYS)).toBe('дней');
    expect(pluralRu(14, DAYS)).toBe('дней');
    expect(pluralRu(111, DAYS)).toBe('дней');
  });
});

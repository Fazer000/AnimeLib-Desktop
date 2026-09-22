import { findEpisodeIndex } from '../renderer/utils/episodeLookup';

const NUMBERS = ['1', '2', '12', '12.5', '13', '05'];

describe('findEpisodeIndex', () => {
  it('находит серию по точному номеру', () => {
    expect(findEpisodeIndex(NUMBERS, '12.5')).toBe(3);
  });

  it('понимает запятую как десятичный разделитель', () => {
    expect(findEpisodeIndex(NUMBERS, '12,5')).toBe(3);
  });

  it('сравнивает номера как числа, если строка не совпала', () => {
    expect(findEpisodeIndex(NUMBERS, '5')).toBe(5);
  });

  it('игнорирует пробелы по краям', () => {
    expect(findEpisodeIndex(NUMBERS, '  13 ')).toBe(4);
  });

  it('несуществующий номер не находится', () => {
    expect(findEpisodeIndex(NUMBERS, '99')).toBe(-1);
  });

  it('пустой ввод ничего не находит', () => {
    expect(findEpisodeIndex(NUMBERS, '   ')).toBe(-1);
  });

  it('не число не находится', () => {
    expect(findEpisodeIndex(NUMBERS, 'abc')).toBe(-1);
    expect(findEpisodeIndex(NUMBERS, '1a')).toBe(-1);
  });

  it('пустой номер в списке не совпадает с нулём', () => {
    expect(findEpisodeIndex(['', '1'], '0')).toBe(-1);
  });

  it('при повторах берётся первая серия', () => {
    expect(findEpisodeIndex(['1', '2', '1'], '1')).toBe(0);
  });
});

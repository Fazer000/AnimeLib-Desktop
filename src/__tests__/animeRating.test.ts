import {
  getRatingAction,
  getRatingActionLabel,
  getRatingTone,
  getSubmittedScore,
  toggleRatingScore,
} from '../renderer/utils/animeRating';

describe('getRatingAction', () => {
  it('без прежней оценки — оценить', () => {
    expect(getRatingAction(0, 8)).toBe('store');
    expect(getRatingAction(0, 0)).toBe('store');
  });

  it('другая оценка — изменить', () => {
    expect(getRatingAction(8, 6)).toBe('update');
  });

  it('та же или снятая оценка — удалить', () => {
    expect(getRatingAction(8, 8)).toBe('delete');
    expect(getRatingAction(8, 0)).toBe('delete');
  });

  it('подписи кнопки как на сайте', () => {
    expect(getRatingActionLabel('store')).toBe('Оценить');
    expect(getRatingActionLabel('update')).toBe('Изменить');
    expect(getRatingActionLabel('delete')).toBe('Удалить оценку');
  });
});

describe('toggleRatingScore', () => {
  it('клик по другой звезде выбирает её', () => {
    expect(toggleRatingScore(3, 7)).toBe(7);
  });

  it('повторный клик снимает оценку', () => {
    expect(toggleRatingScore(7, 7)).toBe(0);
  });
});

describe('getRatingTone', () => {
  it('границы тонов', () => {
    expect(getRatingTone(0)).toBe('neutral');
    expect(getRatingTone(4)).toBe('negative');
    expect(getRatingTone(5)).toBe('neutral');
    expect(getRatingTone(6)).toBe('neutral');
    expect(getRatingTone(7)).toBe('positive');
    expect(getRatingTone(10)).toBe('positive');
  });
});

describe('getSubmittedScore', () => {
  it('удаление отправляется нулём', () => {
    expect(getSubmittedScore(8, 8)).toBe(0);
  });

  it('новая и изменённая оценка уходят как есть', () => {
    expect(getSubmittedScore(0, 9)).toBe(9);
    expect(getSubmittedScore(8, 6)).toBe(6);
  });
});

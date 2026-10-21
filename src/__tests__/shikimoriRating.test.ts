import {
  formatShikimoriScore,
  toShikimoriRating,
} from '../renderer/utils/shikimoriRating';

describe('toShikimoriRating', () => {
  it('оценка из строки и голоса — сумма распределения', () => {
    expect(
      toShikimoriRating({
        score: '5.87',
        rates_scores_stats: [
          { name: 10, value: 3 },
          { name: 6, value: 21 },
        ],
      }),
    ).toEqual({ score: 5.87, votes: 24 });
  });

  it('без оценки или без голосов — null', () => {
    expect(
      toShikimoriRating({ score: '0.0', rates_scores_stats: [] }),
    ).toBeNull();
    expect(
      toShikimoriRating({ score: '7.1', rates_scores_stats: [] }),
    ).toBeNull();
    expect(toShikimoriRating(null)).toBeNull();
    expect(toShikimoriRating({ score: 'нет' })).toBeNull();
  });
});

describe('formatShikimoriScore', () => {
  it('две цифры после точки, как на Shikimori', () => {
    expect(formatShikimoriScore(5.87)).toBe('5.87');
    expect(formatShikimoriScore(8)).toBe('8.00');
  });
});

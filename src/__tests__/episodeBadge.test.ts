import { getEpisodeBadge } from '../renderer/utils/episodeBadge';

describe('getEpisodeBadge', () => {
  it('филлер получает плашку F с подсказкой', () => {
    expect(getEpisodeBadge({ abbr: 'F', label: 'Филлер' })).toEqual({
      abbr: 'F',
      label: 'Филлер',
    });
  });

  it('рекап и спешл тоже получают плашку', () => {
    expect(getEpisodeBadge({ abbr: 'R', label: 'Рекап' })?.abbr).toBe('R');
    expect(getEpisodeBadge({ abbr: 'Sp', label: 'Спешл' })?.abbr).toBe('Sp');
  });

  it('полноценная серия остаётся без плашки', () => {
    expect(
      getEpisodeBadge({ abbr: null, label: 'Полноценный эпизод' }),
    ).toBeNull();
  });

  it('пустое сокращение не даёт плашки', () => {
    expect(getEpisodeBadge({ abbr: '  ', label: 'Филлер' })).toBeNull();
  });

  it('без статуса плашки нет', () => {
    expect(getEpisodeBadge(undefined)).toBeNull();
    expect(getEpisodeBadge(null)).toBeNull();
  });

  it('без подписи подсказкой служит сокращение', () => {
    expect(getEpisodeBadge({ abbr: 'F', label: '' })).toEqual({
      abbr: 'F',
      label: 'F',
    });
  });
});

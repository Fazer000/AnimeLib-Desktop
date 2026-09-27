import {
  getLetterboxClipPath,
  hasLetterbox,
} from '../renderer/utils/letterbox';

describe('hasLetterbox', () => {
  it('16:9 в 16:9 — полей нет', () => {
    expect(
      hasLetterbox({ x: 0, y: 0, width: 1920, height: 1080 }, 1920, 1080, 2),
    ).toBe(false);
  });

  it('4:3 в 16:9 — поля по бокам', () => {
    expect(
      hasLetterbox({ x: 240, y: 0, width: 1440, height: 1080 }, 1920, 1080, 2),
    ).toBe(true);
  });

  it('полоска тоньше порога полями не считается', () => {
    expect(
      hasLetterbox({ x: 1, y: 0, width: 1918, height: 1080 }, 1920, 1080, 2),
    ).toBe(false);
  });

  it('пустая область — полей нет', () => {
    expect(
      hasLetterbox({ x: 0, y: 0, width: 0, height: 0 }, 1920, 1080, 2),
    ).toBe(false);
  });
});

describe('getLetterboxClipPath', () => {
  it('вырезает область кадра из контейнера', () => {
    expect(
      getLetterboxClipPath(
        { x: 240, y: 0, width: 1440, height: 1080 },
        1920,
        1080,
      ),
    ).toBe(
      'polygon(evenodd, -1px -1px, calc(100% + 1px) -1px, calc(100% + 1px) calc(100% + 1px), -1px calc(100% + 1px), -1px -1px, 12.500% 0.000%, 87.500% 0.000%, 87.500% 100.000%, 12.500% 100.000%, 12.500% 0.000%)',
    );
  });

  it('с перекрытием поля заходят под край кадра', () => {
    expect(
      getLetterboxClipPath(
        { x: 250, y: 0, width: 1500, height: 1000 },
        2000,
        1000,
        10,
      ),
    ).toBe(
      'polygon(evenodd, -1px -1px, calc(100% + 1px) -1px, calc(100% + 1px) calc(100% + 1px), -1px calc(100% + 1px), -1px -1px, 13.000% 1.000%, 87.000% 1.000%, 87.000% 99.000%, 13.000% 99.000%, 13.000% 1.000%)',
    );
  });
});

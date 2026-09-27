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
  it('внешний контур и вырез под кадр — отдельные контуры', () => {
    expect(
      getLetterboxClipPath(
        { x: 240, y: 0, width: 1440, height: 1080 },
        1920,
        1080,
      ),
    ).toBe(
      "path(evenodd, 'M -1 -1 H 1921 V 1081 H -1 Z M 240 0 H 1680 V 1080 H 240 Z')",
    );
  });

  it('с перекрытием поля заходят под край кадра', () => {
    expect(
      getLetterboxClipPath(
        { x: 250.5, y: 0, width: 1500, height: 1000 },
        2000,
        1000,
        1,
      ),
    ).toBe(
      "path(evenodd, 'M -1 -1 H 2001 V 1001 H -1 Z M 251.5 1 H 1749.5 V 999 H 251.5 Z')",
    );
  });
});

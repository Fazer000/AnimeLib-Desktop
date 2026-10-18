import { placeFloatingButton } from '../renderer/utils/floatingButtonPlacement';

const base = { width: 1200, height: 800, size: 48, margin: 24, gap: 12 };

describe('placeFloatingButton', () => {
  it('без помех стоит в углу', () => {
    expect(placeFloatingButton({ ...base, obstacle: null })).toEqual({
      right: 24,
      bottom: 24,
    });
  });

  it('элемент в другом месте экрана не мешает', () => {
    const obstacle = { left: 20, top: 700, right: 200, bottom: 780 };

    expect(placeFloatingButton({ ...base, obstacle })).toEqual({
      right: 24,
      bottom: 24,
    });
  });

  it('над свёрнутым мини-чатом встаёт с зазором', () => {
    const dock = { left: 1056, top: 744, right: 1184, bottom: 784 };

    expect(placeFloatingButton({ ...base, obstacle: dock })).toEqual({
      right: 24,
      bottom: 68,
    });
  });

  it('элемент в пределах зазора тоже считается помехой', () => {
    const near = { left: 1100, top: 786, right: 1200, bottom: 800 };

    expect(placeFloatingButton({ ...base, obstacle: near }).bottom).toBe(26);
  });

  it('если над окном чата нет места — встаёт слева от него', () => {
    const chat = { left: 904, top: 40, right: 1184, bottom: 784 };

    expect(placeFloatingButton({ ...base, obstacle: chat })).toEqual({
      right: 308,
      bottom: 24,
    });
  });
});

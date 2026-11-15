import { act, fireEvent, render, screen } from '@testing-library/react';
import OverflowText from '../renderer/components/OverflowText';

const title = 'Длинное название тайтла';

describe('Подсказка обрезанного текста', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it.each([
    { width: 321, height: 40, clipped: true },
    { width: 300, height: 60, clipped: true },
    { width: 300, height: 40, clipped: false },
  ])(
    'учитывает размеры текста $width × $height',
    ({ width, height, clipped }) => {
      render(<OverflowText>{title}</OverflowText>);
      const label = screen.getByText(title);
      Object.defineProperties(label, {
        clientWidth: { value: 300 },
        clientHeight: { value: 40 },
        scrollWidth: { value: width },
        scrollHeight: { value: height },
      });

      fireEvent.mouseOver(label);
      act(() => jest.advanceTimersByTime(450));

      expect(screen.queryByRole('tooltip')?.textContent).toBe(
        clipped ? title : undefined,
      );
    },
  );
});

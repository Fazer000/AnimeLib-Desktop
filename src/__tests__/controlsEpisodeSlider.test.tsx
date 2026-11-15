import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import ControlsEpisodeSlider from '../renderer/components/player/ControlsEpisodeSlider';
import { createAppTheme } from '../renderer/theme/appTheme';

describe('Полноэкранная лента эпизодов', () => {
  it('центрирует активную серию при повторном показе без анимации', () => {
    const episodes = Array.from({ length: 60 }, (_, index) => ({
      id: index + 1,
      number: String(index + 1),
      name: '',
    }));
    const theme = createAppTheme('dark');
    const scrollTo = jest.fn(function scroll(
      this: HTMLElement,
      { left }: { left: number },
    ) {
      this.scrollLeft = left;
    });
    const clientWidth = jest
      .spyOn(Element.prototype, 'clientWidth', 'get')
      .mockReturnValue(1000);
    const scrollWidth = jest
      .spyOn(Element.prototype, 'scrollWidth', 'get')
      .mockReturnValue(6000);
    const offsetWidth = jest
      .spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
      .mockReturnValue(100);
    const offsetLeft = jest
      .spyOn(HTMLElement.prototype, 'offsetLeft', 'get')
      .mockImplementation(function offset(this: HTMLElement) {
        return (Number(this.textContent) - 1) * 100;
      });
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollTo',
    );
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });

    const slider = (currentEpisodeIndex: number, showEpisodes: boolean) => (
      <ThemeProvider theme={theme}>
        <ControlsEpisodeSlider
          episodes={episodes}
          currentEpisodeIndex={currentEpisodeIndex}
          showEpisodes={showEpisodes}
          onEpisodeSelect={jest.fn()}
        />
      </ThemeProvider>
    );

    try {
      const { container, rerender } = render(slider(25, true));
      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(scrollTo).toHaveBeenLastCalledWith({
        left: 2050,
        behavior: 'instant',
      });

      const scroller = container.querySelector('.episode-button')
        ?.parentElement as HTMLElement;
      scroller.scrollLeft = 1200;
      rerender(slider(25, false));
      expect(scroller.scrollLeft).toBe(1200);
      rerender(slider(25, true));

      expect(scrollTo).toHaveBeenCalledTimes(2);
      expect(scrollTo).toHaveBeenLastCalledWith({
        left: 2050,
        behavior: 'instant',
      });
      expect(scroller.scrollLeft).toBe(2050);

      rerender(slider(25, false));
      rerender(slider(25, true));
      expect(scrollTo).toHaveBeenCalledTimes(2);

      rerender(slider(26, true));
      expect(scrollTo).toHaveBeenLastCalledWith({
        left: 2150,
        behavior: 'smooth',
      });

      rerender(slider(27, false));
      expect(scrollTo).toHaveBeenLastCalledWith({
        left: 2250,
        behavior: 'instant',
      });
      expect(scrollTo).toHaveBeenCalledTimes(4);
    } finally {
      clientWidth.mockRestore();
      scrollWidth.mockRestore();
      offsetWidth.mockRestore();
      offsetLeft.mockRestore();
      if (descriptor) {
        Object.defineProperty(HTMLElement.prototype, 'scrollTo', descriptor);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo');
      }
    }
  });
});

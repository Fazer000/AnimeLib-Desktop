import React from 'react';
import { act, render, screen } from '@testing-library/react';
import useSiteSplash from '../renderer/hooks/useSiteSplash';
import { sitePageReady } from '../renderer/scripts/sitePageReady';

describe('site splash', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  function setup() {
    const webview = Object.assign(new EventTarget(), {
      executeJavaScript: jest.fn().mockResolvedValue(true),
    });
    const ref = { current: webview };
    function Probe() {
      const state = useSiteSplash(ref, 'https://animelib.org/');
      return (
        <div
          data-testid="state"
          data-visible={state.visible}
          data-slow={state.slow}
        >
          {state.site.letter}
        </div>
      );
    }
    const view = render(<Probe />);
    return { webview, ...view };
  }

  it('shows a slow hint and eventually releases a stuck page', () => {
    setup();
    act(() => jest.advanceTimersByTime(1800));
    expect(screen.getByTestId('state').getAttribute('data-slow')).toBe('true');
    act(() => jest.advanceTimersByTime(5201));
    expect(screen.getByTestId('state').getAttribute('data-visible')).toBe(
      'false',
    );
  });

  it('waits for stable readiness and the minimum entry duration', async () => {
    const { webview } = setup();
    await act(async () => {
      webview.dispatchEvent(new Event('did-finish-load'));
    });
    await act(async () => {
      jest.advanceTimersByTime(120);
    });
    expect(screen.getByTestId('state').getAttribute('data-visible')).toBe(
      'true',
    );
    act(() => jest.advanceTimersByTime(260));
    expect(screen.getByTestId('state').getAttribute('data-visible')).toBe(
      'false',
    );
  });

  it('ignores readiness from a previous navigation', async () => {
    const { webview } = setup();
    let resolvePending: (value: boolean) => void = () => {};
    webview.executeJavaScript.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          resolvePending = resolve;
        }),
    );
    act(() => webview.dispatchEvent(new Event('did-finish-load')));
    act(() =>
      webview.dispatchEvent(
        Object.assign(new Event('did-start-navigation'), {
          isMainFrame: true,
          url: 'https://mangalib.me/',
        }),
      ),
    );
    await act(async () => resolvePending(true));
    act(() => jest.advanceTimersByTime(500));
    expect(screen.getByTestId('state').textContent).toBe('M');
    expect(screen.getByTestId('state').getAttribute('data-visible')).toBe(
      'true',
    );
  });

  it('cleans up listeners and timers on unmount', () => {
    const { webview, unmount } = setup();
    unmount();
    webview.dispatchEvent(new Event('did-finish-load'));
    expect(webview.executeJavaScript).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('site page readiness', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });
  it('rejects an empty shell', () => {
    document.body.innerHTML = '<div id="app"></div>';
    expect(sitePageReady()).toBe(false);
  });
  it('accepts rendered content', () => {
    document.body.textContent = 'Содержимое страницы '.repeat(10);
    expect(sitePageReady()).toBe(true);
  });
});

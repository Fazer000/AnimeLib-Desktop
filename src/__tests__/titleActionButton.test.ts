/**
 * @jest-environment jsdom
 */
import {
  getTitleActionScript,
  titleActionButtonMain,
} from '../renderer/scripts/titleActionButton';
import { buildTitleAction } from '../renderer/utils/titleAction';
import { LIB_API_URL, LIB_SITES } from '../constants';

const LICENSED_BUTTON =
  '<button class="btn variant-default" type="button"><svg></svg>Лицензирован</button>';

const flush = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

const setLocation = (url: string) => {
  window.history.replaceState({}, '', url);
};

describe('titleActionButtonMain', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    delete (window as unknown as { libTitleActionScan?: unknown })
      .libTitleActionScan;
    document.body.innerHTML = LICENSED_BUTTON;
    localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const run = (chapters: unknown[]) => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: chapters }),
    })) as unknown as typeof fetch;

    titleActionButtonMain(
      { apiUrl: LIB_API_URL, sites: LIB_SITES },
      buildTitleAction,
    );
  };

  const runOnSite = (chapters: unknown[], kind: 'manga' | 'anime') => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: chapters }),
    })) as unknown as typeof fetch;

    titleActionButtonMain(
      {
        apiUrl: LIB_API_URL,
        sites: [
          {
            name: 'Test',
            letter: 'T',
            siteId: 1,
            kind,
            hosts: ['localhost'],
            home: null,
          },
        ],
      },
      buildTitleAction,
    );
  };

  it('лицензированная манга с главами — «Начать читать» в читалку', async () => {
    setLocation('/ru/manga/206--one-piece');
    runOnSite([{ id: 1, volume: '1', number: '0.5' }], 'manga');
    await flush();
    await flush();

    const button = document.querySelector('button') as HTMLButtonElement;
    expect(button.textContent).toBe('Начать читать0 / 1');
    expect(button.classList.contains('variant-primary')).toBe(true);
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(global.fetch).toHaveBeenCalledWith(
      `${LIB_API_URL}/manga/206--one-piece/chapters`,
      expect.objectContaining({
        headers: expect.objectContaining({ 'Site-Id': '1' }),
      }),
    );
  });

  it('без глав — серая недоступная кнопка', async () => {
    setLocation('/ru/manga/691--rezero');
    runOnSite([], 'manga');
    await flush();
    await flush();

    const button = document.querySelector('button') as HTMLButtonElement;
    expect(button.textContent).toBe('Главы недоступны');
    expect(button.classList.contains('variant-default')).toBe(true);
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('не работает вне сайтов сети', async () => {
    setLocation('/ru/manga/1--a');
    run([{ id: 1, volume: '1', number: '1' }]);
    await flush();

    expect(document.querySelector('button')?.textContent).toBe('Лицензирован');
  });
});

describe('getTitleActionScript', () => {
  it('собирается в корректный JavaScript', () => {
    // eslint-disable-next-line no-new-func
    expect(() => new Function(getTitleActionScript())).not.toThrow();
  });
});

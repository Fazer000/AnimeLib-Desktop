import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import App from '../renderer/App';
import useOnlineStatus from '../renderer/hooks/useOnlineStatus';

jest.mock('../renderer/hooks/useOnlineStatus', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../renderer/services/connectivity', () => ({
  ...jest.requireActual('../renderer/services/connectivity'),
  checkConnectionFast: jest.fn().mockResolvedValue(true),
}));

jest.mock('../renderer/pages/WebViewPage', () => ({
  __esModule: true,
  default: ({
    onPlayerButtonClick,
    sidebar,
  }: {
    onPlayerButtonClick: (url: string, id: string) => void;
    sidebar: ReactNode;
  }) => (
    <>
      <button
        type="button"
        onClick={() =>
          onPlayerButtonClick(
            'https://v5.animelib.org/ru/anime/bleach-anime/watch',
            'bleach-anime',
          )
        }
      >
        Открыть со страницы тайтла
      </button>
      {sidebar}
    </>
  ),
}));

jest.mock('../renderer/components/sideRail/SideRail', () => ({
  __esModule: true,
  default: ({ downloads }: { downloads: ReactNode }) => downloads,
}));

jest.mock('../renderer/components/offline/OfflineButton', () => ({
  __esModule: true,
  default: ({
    onPlayOffline,
  }: {
    onPlayOffline: (id: string, episodeId: number) => void;
  }) => (
    <button type="button" onClick={() => onPlayOffline('bleach-anime', 123)}>
      Воспроизвести из загрузок
    </button>
  ),
}));

jest.mock('../renderer/pages/PlayerPage', () => ({
  __esModule: true,
  default: ({
    offlineMode,
    animeId,
    initialEpisodeId,
    onPlayOffline,
  }: {
    offlineMode?: boolean;
    animeId: string;
    initialEpisodeId?: number;
    onPlayOffline: (id: string, episodeId: number) => void;
  }) => (
    <>
      <p>
        {`${offlineMode ? 'Локальный' : 'Онлайн'}: ${animeId} ${initialEpisodeId ?? ''}`}
      </p>
      <button type="button" onClick={() => onPlayOffline('bleach-anime', 123)}>
        Воспроизвести из загрузок плеера
      </button>
    </>
  ),
}));

describe('Воспроизведение из загрузок', () => {
  beforeEach(() => {
    localStorage.setItem('animeLibUrl', 'https://v5.animelib.org');
  });

  afterEach(() => localStorage.clear());

  it.each([true, false])(
    'открывает выбранную скачанную серию из локального каталога (сайт доступен: %s)',
    (online) => {
      jest.mocked(useOnlineStatus).mockReturnValue(online);
      render(<App />);
      fireEvent.click(
        screen.getByRole('button', { name: 'Воспроизвести из загрузок' }),
      );

      expect(screen.getByText('Локальный: bleach-anime 123')).toBeVisible();
      expect(screen.queryByText(/^Онлайн:/)).not.toBeInTheDocument();
    },
  );

  it('открывает онлайн-плеер со страницы тайтла и переключается на локальный из его загрузок', () => {
    jest.mocked(useOnlineStatus).mockReturnValue(true);
    render(<App />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Открыть со страницы тайтла' }),
    );
    expect(screen.getByText('Онлайн: bleach-anime')).toBeVisible();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Воспроизвести из загрузок плеера',
      }),
    );
    expect(screen.getByText('Локальный: bleach-anime 123')).toBeVisible();
    expect(screen.queryByText(/^Онлайн:/)).not.toBeInTheDocument();
  });
});

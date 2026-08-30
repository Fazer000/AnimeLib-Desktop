import {
  AutoplayManager,
  LoadContext,
} from '../renderer/services/player/AutoplayManager';

class FakeVideo {
  paused = true;

  play = jest.fn(() => Promise.resolve());

  private listeners = new Map<string, Set<() => void>>();

  addEventListener(event: string, handler: () => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }

  removeEventListener(event: string, handler: () => void) {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: string) {
    this.listeners.get(event)?.forEach((handler) => handler());
  }

  countListeners(event: string) {
    return this.listeners.get(event)?.size ?? 0;
  }
}

const context = (patch: Partial<LoadContext> = {}): LoadContext => ({
  isVoiceChange: false,
  isEpisodeChange: false,
  hasBookmark: false,
  isFromHint: false,
  ...patch,
});

describe('AutoplayManager.determineAutoplay', () => {
  it('первая загрузка никогда не запускает воспроизведение', () => {
    const manager = new AutoplayManager({ enabled: true });

    expect(manager.determineAutoplay(context({ hasBookmark: true }))).toBe(
      false,
    );
  });

  it('после первой загрузки закладка запускает воспроизведение', () => {
    const manager = new AutoplayManager({ enabled: true });
    manager.determineAutoplay(context());

    expect(manager.determineAutoplay(context({ hasBookmark: true }))).toBe(
      true,
    );
  });

  it('переход по подсказке запускает воспроизведение', () => {
    const manager = new AutoplayManager({ enabled: true });
    manager.setFirstLoad(false);

    expect(manager.determineAutoplay(context({ isFromHint: true }))).toBe(true);
  });

  it('смена озвучки продолжает играть, только если было время', () => {
    const manager = new AutoplayManager({ enabled: true });
    manager.setFirstLoad(false);

    expect(
      manager.determineAutoplay(
        context({ isVoiceChange: true, currentTime: 42 }),
      ),
    ).toBe(true);
    expect(manager.determineAutoplay(context({ isVoiceChange: true }))).toBe(
      false,
    );
  });

  it('обычная смена серии сама не играет', () => {
    const manager = new AutoplayManager({ enabled: true });
    manager.setFirstLoad(false);

    expect(manager.determineAutoplay(context({ isEpisodeChange: true }))).toBe(
      false,
    );
  });
});

describe('AutoplayManager: запуск при загрузке', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('без запроса на автозапуск подписка не ставится', () => {
    const video = new FakeVideo();
    const manager = new AutoplayManager({ enabled: true });
    manager.attachVideo(video as unknown as HTMLVideoElement);

    manager.setupAutoplayOnLoad();

    expect(video.countListeners('canplay')).toBe(0);
  });

  it('по готовности видео запускает воспроизведение', () => {
    const video = new FakeVideo();
    const manager = new AutoplayManager({ enabled: true });
    manager.attachVideo(video as unknown as HTMLVideoElement);

    manager.setShouldAutoplayOnLoad(true);
    manager.setupAutoplayOnLoad();
    video.emit('canplay');
    jest.advanceTimersByTime(100);

    expect(video.play).toHaveBeenCalled();
  });

  it('уже играющее видео повторно не запускает', () => {
    const video = new FakeVideo();
    const manager = new AutoplayManager({ enabled: true });
    manager.attachVideo(video as unknown as HTMLVideoElement);

    manager.setShouldAutoplayOnLoad(true);
    manager.setupAutoplayOnLoad();
    video.emit('canplay');
    video.paused = false;
    jest.advanceTimersByTime(100);

    expect(video.play).not.toHaveBeenCalled();
  });

  it('повторная настройка не удваивает подписку', () => {
    const video = new FakeVideo();
    const manager = new AutoplayManager({ enabled: true });
    manager.attachVideo(video as unknown as HTMLVideoElement);

    manager.setShouldAutoplayOnLoad(true);
    manager.setupAutoplayOnLoad();
    manager.setupAutoplayOnLoad();

    expect(video.countListeners('canplay')).toBe(1);
  });

  it('отказ браузера в автозапуске не роняет приложение', async () => {
    const video = new FakeVideo();
    video.play.mockRejectedValueOnce(new Error('NotAllowedError'));
    const manager = new AutoplayManager({ enabled: true });
    manager.attachVideo(video as unknown as HTMLVideoElement);

    manager.setShouldAutoplayOnLoad(true);
    manager.setupAutoplayOnLoad();
    video.emit('canplay');

    expect(() => jest.advanceTimersByTime(100)).not.toThrow();
  });
});

describe('AutoplayManager: переход к следующей серии', () => {
  it('по окончании переключает на следующую серию', () => {
    const onEpisodeChange = jest.fn();
    const video = new FakeVideo();
    const manager = new AutoplayManager({ enabled: true, onEpisodeChange });
    manager.attachVideo(video as unknown as HTMLVideoElement);

    manager.setupAutoAdvance(2, 12);
    video.emit('ended');

    expect(onEpisodeChange).toHaveBeenCalledWith(3);
  });

  it('на последней серии никуда не переходит', () => {
    const onEpisodeChange = jest.fn();
    const video = new FakeVideo();
    const manager = new AutoplayManager({ enabled: true, onEpisodeChange });
    manager.attachVideo(video as unknown as HTMLVideoElement);

    manager.setupAutoAdvance(11, 12);
    video.emit('ended');

    expect(onEpisodeChange).not.toHaveBeenCalled();
  });

  it('с выключенным автопереходом подписки нет', () => {
    const video = new FakeVideo();
    const manager = new AutoplayManager({ enabled: false });
    manager.attachVideo(video as unknown as HTMLVideoElement);

    manager.setupAutoAdvance(0, 12);

    expect(video.countListeners('ended')).toBe(0);
  });

  it('повторная настройка не даёт двойного перехода', () => {
    const onEpisodeChange = jest.fn();
    const video = new FakeVideo();
    const manager = new AutoplayManager({ enabled: true, onEpisodeChange });
    manager.attachVideo(video as unknown as HTMLVideoElement);

    manager.setupAutoAdvance(0, 12);
    manager.setupAutoAdvance(0, 12);
    video.emit('ended');

    expect(onEpisodeChange).toHaveBeenCalledTimes(1);
  });

  it('destroy снимает подписки с элемента', () => {
    const video = new FakeVideo();
    const manager = new AutoplayManager({ enabled: true });
    manager.attachVideo(video as unknown as HTMLVideoElement);
    manager.setShouldAutoplayOnLoad(true);
    manager.setupAutoplayOnLoad();
    manager.setupAutoAdvance(0, 12);

    manager.destroy();

    expect(video.countListeners('canplay')).toBe(0);
    expect(video.countListeners('ended')).toBe(0);
  });
});

import { VideoStateManager } from '../renderer/services/player/VideoStateManager';

/** Минимальный дубль video: только то, чем пользуется менеджер. */
class FakeVideo {
  currentTime = 0;

  duration = 0;

  volume = 1;

  muted = false;

  playbackRate = 1;

  buffered = {
    length: 0,
    end: () => 0,
  };

  play = jest.fn(() => Promise.resolve());

  pause = jest.fn();

  private listeners = new Map<string, Set<(event: Event) => void>>();

  addEventListener(event: string, handler: (event: Event) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }

  removeEventListener(event: string, handler: (event: Event) => void) {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: string) {
    this.listeners.get(event)?.forEach((handler) => handler({} as Event));
  }

  countListeners() {
    let total = 0;
    this.listeners.forEach((set) => {
      total += set.size;
    });
    return total;
  }

  setBuffered(end: number) {
    this.buffered = { length: 1, end: () => end };
  }
}

const attach = (config = {}) => {
  const video = new FakeVideo();
  const manager = new VideoStateManager(config);
  manager.attach(video as unknown as HTMLVideoElement);
  return { video, manager };
};

describe('VideoStateManager: события элемента', () => {
  beforeEach(() => localStorage.clear());

  it('play и pause меняют состояние воспроизведения', () => {
    const onStateChange = jest.fn();
    const { video, manager } = attach({ onStateChange });

    video.emit('play');
    expect(manager.getState().isPlaying).toBe(true);
    expect(onStateChange).toHaveBeenLastCalledWith({ isPlaying: true });

    video.emit('pause');
    expect(manager.getState().isPlaying).toBe(false);
  });

  it('waiting и canplay переключают признак буферизации', () => {
    const { video, manager } = attach();

    video.emit('waiting');
    expect(manager.getState().isBuffering).toBe(true);

    video.emit('canplay');
    expect(manager.getState().isBuffering).toBe(false);
  });
});

describe('VideoStateManager: канал времени', () => {
  beforeEach(() => localStorage.clear());

  it('время и буфер идут отдельным колбэком, минуя onStateChange', () => {
    const onTimeUpdate = jest.fn();
    const onStateChange = jest.fn();
    const { video } = attach({ onTimeUpdate, onStateChange });

    video.currentTime = 12;
    video.duration = 100;
    video.setBuffered(40);
    video.emit('timeupdate');

    expect(onTimeUpdate).toHaveBeenCalledWith(12, 40);
    expect(onStateChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ currentTime: expect.anything() }),
    );
  });

  it('частые тики отбрасываются порогом', () => {
    const onTimeUpdate = jest.fn();
    const { video } = attach({ onTimeUpdate });

    video.currentTime = 1;
    video.emit('timeupdate');
    video.currentTime = 2;
    video.emit('timeupdate');

    expect(onTimeUpdate).toHaveBeenCalledTimes(1);
  });

  it('длительность уходит в состояние только при изменении', () => {
    jest.useFakeTimers();
    const onStateChange = jest.fn();
    const { video } = attach({ onStateChange });

    video.duration = 100;
    video.emit('timeupdate');
    expect(onStateChange).toHaveBeenCalledWith({ duration: 100 });

    onStateChange.mockClear();
    jest.advanceTimersByTime(200);
    video.currentTime = 5;
    video.emit('timeupdate');

    expect(onStateChange).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('буфер сохраняется, когда элемент его не сообщает', () => {
    jest.useFakeTimers();
    const onTimeUpdate = jest.fn();
    const { video } = attach({ onTimeUpdate });

    video.setBuffered(50);
    video.emit('timeupdate');

    jest.advanceTimersByTime(200);
    video.buffered = { length: 0, end: () => 0 };
    video.currentTime = 10;
    video.emit('timeupdate');

    expect(onTimeUpdate).toHaveBeenLastCalledWith(10, 50);
    jest.useRealTimers();
  });
});

describe('VideoStateManager: перемотка', () => {
  beforeEach(() => localStorage.clear());

  it('seekTo двигает элемент и сообщает новое время', () => {
    const onTimeUpdate = jest.fn();
    const { video, manager } = attach({ onTimeUpdate });

    video.duration = 100;
    video.emit('loadedmetadata');
    manager.seekTo(42);

    expect(video.currentTime).toBe(42);
    expect(onTimeUpdate).toHaveBeenLastCalledWith(42, 0);
  });

  it('перемотка за пределы длительности игнорируется', () => {
    const { video, manager } = attach();

    video.duration = 100;
    video.emit('loadedmetadata');
    manager.seekTo(150);
    manager.seekTo(-5);
    manager.seekTo(NaN);

    expect(video.currentTime).toBe(0);
  });

  it('skip ограничен началом и концом видео', () => {
    const { video, manager } = attach();

    video.duration = 100;
    video.emit('loadedmetadata');

    manager.skip(-30);
    expect(video.currentTime).toBe(0);

    manager.seekTo(90);
    manager.skip(30);
    expect(video.currentTime).toBe(100);
  });

  it('перемотка по проценту считает от длительности', () => {
    const { video, manager } = attach();

    video.duration = 200;
    video.emit('loadedmetadata');
    manager.seekToPercent(25);

    expect(video.currentTime).toBe(50);
  });
});

describe('VideoStateManager: громкость и скорость', () => {
  beforeEach(() => localStorage.clear());

  it('громкость ограничена диапазоном и сохраняется', () => {
    const { video, manager } = attach();

    manager.setVolume(1.5);
    expect(video.volume).toBe(1);

    manager.setVolume(0.3);
    expect(video.volume).toBeCloseTo(0.3);
    expect(
      JSON.parse(localStorage.getItem('videoVolume') as string),
    ).toBeCloseTo(0.3);
  });

  it('нулевая громкость включает беззвучный режим', () => {
    const { video, manager } = attach();

    manager.setVolume(0);

    expect(video.muted).toBe(true);
  });

  it('скорость ограничена диапазоном и сохраняется', () => {
    const { video, manager } = attach();

    manager.setPlaybackRate(5);
    expect(video.playbackRate).toBe(2);

    manager.setPlaybackRate(0.1);
    expect(video.playbackRate).toBe(0.25);
  });

  it('сохранённые настройки применяются к новому элементу', () => {
    localStorage.setItem('videoVolume', '0.4');
    localStorage.setItem('videoMuted', 'true');
    localStorage.setItem('videoPlaybackRate', '1.5');

    const { video } = attach();

    expect(video.volume).toBeCloseTo(0.4);
    expect(video.muted).toBe(true);
    expect(video.playbackRate).toBe(1.5);
  });
});

describe('VideoStateManager: подписки', () => {
  beforeEach(() => localStorage.clear());

  it('detach снимает все слушатели', () => {
    const { video, manager } = attach();

    expect(video.countListeners()).toBeGreaterThan(0);

    manager.detach();
    expect(video.countListeners()).toBe(0);
  });

  it('повторный attach не оставляет слушателей на прежнем элементе', () => {
    const first = new FakeVideo();
    const second = new FakeVideo();
    const manager = new VideoStateManager();

    manager.attach(first as unknown as HTMLVideoElement);
    manager.attach(second as unknown as HTMLVideoElement);

    expect(first.countListeners()).toBe(0);
    expect(second.countListeners()).toBeGreaterThan(0);
  });

  it('togglePlay зовёт нужный метод элемента', () => {
    const { video, manager } = attach();

    manager.togglePlay();
    expect(video.play).toHaveBeenCalled();

    video.emit('play');
    manager.togglePlay();
    expect(video.pause).toHaveBeenCalled();
  });
});

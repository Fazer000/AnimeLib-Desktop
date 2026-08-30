import { UIStateManager } from '../renderer/services/player/UIStateManager';

describe('UIStateManager', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('уведомляет только при реальном изменении состояния', () => {
    const onStateChange = jest.fn();
    const manager = new UIStateManager({ onStateChange });

    manager.showPlayerControls();
    expect(onStateChange).not.toHaveBeenCalled();

    manager.hidePlayerControls();
    expect(onStateChange).toHaveBeenCalledTimes(1);

    manager.hidePlayerControls();
    expect(onStateChange).toHaveBeenCalledTimes(1);
  });

  it('центральная иконка гаснет сама через секунду', () => {
    const manager = new UIStateManager();

    manager.showPlayPauseIcon();
    expect(manager.getState().showCenterIcon).toBe(true);

    jest.advanceTimersByTime(1000);
    expect(manager.getState().showCenterIcon).toBe(false);
  });

  it('скрывает контролы по таймеру во время воспроизведения', () => {
    const manager = new UIStateManager();

    manager.startAutoHide(true);
    jest.advanceTimersByTime(2000);

    expect(manager.getState().showControls).toBe(false);
  });

  it('на паузе контролы не скрывает', () => {
    const manager = new UIStateManager();

    manager.startAutoHide(false);
    jest.advanceTimersByTime(5000);

    expect(manager.getState().showControls).toBe(true);
  });

  it('не скрывает контролы при открытом меню', () => {
    const manager = new UIStateManager();

    manager.setMenuOpen(true);
    manager.startAutoHide(true);
    jest.advanceTimersByTime(5000);

    expect(manager.getState().showControls).toBe(true);
  });

  it('не скрывает контролы, пока курсор над прогресс-баром', () => {
    const manager = new UIStateManager();

    manager.setHoverTime(42);
    manager.startAutoHide(true);
    jest.advanceTimersByTime(5000);

    expect(manager.getState().showControls).toBe(true);
  });

  it('повторный запуск сдвигает таймер, а не добавляет второй', () => {
    const manager = new UIStateManager();

    manager.startAutoHide(true);
    jest.advanceTimersByTime(1500);
    manager.startAutoHide(true);
    jest.advanceTimersByTime(1500);

    expect(manager.getState().showControls).toBe(true);

    jest.advanceTimersByTime(500);
    expect(manager.getState().showControls).toBe(false);
  });

  it('stopAutoHide отменяет запланированное скрытие', () => {
    const manager = new UIStateManager();

    manager.startAutoHide(true);
    manager.stopAutoHide();
    jest.advanceTimersByTime(5000);

    expect(manager.getState().showControls).toBe(true);
  });

  it('переключение списка серий инвертирует видимость', () => {
    const manager = new UIStateManager();
    const before = manager.getState().showEpisodesList;

    manager.toggleEpisodesList();
    expect(manager.getState().showEpisodesList).toBe(!before);

    manager.toggleEpisodesList();
    expect(manager.getState().showEpisodesList).toBe(before);
  });

  it('destroy отменяет таймеры и отписывает', () => {
    const onStateChange = jest.fn();
    const manager = new UIStateManager({ onStateChange });

    manager.startAutoHide(true);
    manager.destroy();
    jest.advanceTimersByTime(5000);

    expect(manager.getState().showControls).toBe(true);
    expect(onStateChange).not.toHaveBeenCalled();
  });

  it('таймер клика очищается по требованию', () => {
    const manager = new UIStateManager();
    const callback = jest.fn();

    manager.setClickTimeout(
      setTimeout(callback, 300) as unknown as ReturnType<typeof setTimeout>,
    );
    expect(manager.getClickTimeout()).not.toBeNull();

    manager.clearClickTimeout();
    jest.advanceTimersByTime(1000);

    expect(callback).not.toHaveBeenCalled();
    expect(manager.getClickTimeout()).toBeNull();
  });
});

import {
  SegmentManager,
  TimeCodeSegment,
} from '../renderer/services/player/SegmentManager';

const OPENING: TimeCodeSegment = { type: 'opening', from: 60, to: 150 };
const ENDING: TimeCodeSegment = { type: 'ending', from: 1300, to: 1400 };

describe('SegmentManager', () => {
  beforeEach(() => localStorage.clear());

  it('сообщает о входе в сегмент и выходе из него', () => {
    const onSegmentChange = jest.fn();
    const manager = new SegmentManager({ onSegmentChange });
    manager.setSegments([OPENING]);

    manager.updateCurrentTime(30);
    expect(onSegmentChange).not.toHaveBeenCalled();

    manager.updateCurrentTime(90);
    expect(onSegmentChange).toHaveBeenLastCalledWith(OPENING);

    manager.updateCurrentTime(200);
    expect(onSegmentChange).toHaveBeenLastCalledWith(null);
  });

  it('границы сегмента входят в него', () => {
    const manager = new SegmentManager();
    manager.setSegments([OPENING]);

    manager.updateCurrentTime(60);
    expect(manager.getCurrentSegment()).toEqual(OPENING);

    manager.updateCurrentTime(150);
    expect(manager.getCurrentSegment()).toEqual(OPENING);

    manager.updateCurrentTime(150.5);
    expect(manager.getCurrentSegment()).toBeNull();
  });

  it('не пропускает сегмент, когда автопропуск выключен', () => {
    const onSkipSegment = jest.fn();
    const manager = new SegmentManager({ onSkipSegment });
    manager.setSegments([OPENING]);

    manager.updateCurrentTime(90);

    expect(onSkipSegment).not.toHaveBeenCalled();
  });

  it('пропускает опенинг на секунду за его конец', () => {
    const onSkipSegment = jest.fn();
    const manager = new SegmentManager({ onSkipSegment });
    manager.updateSettings({ skipOpenings: true });
    manager.setSegments([OPENING]);

    manager.updateCurrentTime(90);

    expect(onSkipSegment).toHaveBeenCalledWith(151);
  });

  it('каждый тип сегмента управляется своим флагом', () => {
    const onSkipSegment = jest.fn();
    const manager = new SegmentManager({ onSkipSegment });
    manager.updateSettings({ skipOpenings: true, skipEndings: false });
    manager.setSegments([OPENING, ENDING]);

    manager.updateCurrentTime(1350);

    expect(onSkipSegment).not.toHaveBeenCalled();
  });

  it('повторный вход в тот же сегмент не пропускает его снова', () => {
    const onSkipSegment = jest.fn();
    const manager = new SegmentManager({ onSkipSegment });
    manager.updateSettings({ skipOpenings: true });
    manager.setSegments([OPENING]);

    manager.updateCurrentTime(90);
    manager.updateCurrentTime(300);
    manager.updateCurrentTime(90);

    expect(onSkipSegment).toHaveBeenCalledTimes(1);
  });

  it('не перематывает за конец видео', () => {
    const onSkipSegment = jest.fn();
    const manager = new SegmentManager({ onSkipSegment });
    manager.updateSettings({ skipEndings: true });
    manager.setDuration(1400);
    manager.setSegments([ENDING]);

    manager.updateCurrentTime(1350);

    expect(onSkipSegment).toHaveBeenCalledWith(1399.5);
  });

  it('смена длительности разрешает пропуск заново', () => {
    const onSkipSegment = jest.fn();
    const manager = new SegmentManager({ onSkipSegment });
    manager.updateSettings({ skipOpenings: true });
    manager.setSegments([OPENING]);

    manager.updateCurrentTime(90);
    manager.setDuration(1500);
    manager.updateCurrentTime(300);
    manager.updateCurrentTime(90);

    expect(onSkipSegment).toHaveBeenCalledTimes(2);
  });

  it('настройки переживают пересоздание менеджера', () => {
    new SegmentManager().updateSettings({ skipCompilations: true });

    expect(new SegmentManager().getSettings()).toMatchObject({
      skipCompilations: true,
    });
  });

  it('битые настройки в хранилище не роняют конструктор', () => {
    localStorage.setItem('autoSkipSettings', 'не json');

    expect(new SegmentManager().getSettings()).toEqual({
      skipOpenings: false,
      skipEndings: false,
      skipCompilations: false,
      skipSplashScreens: false,
    });
  });
});

import { SkipManager } from '../renderer/services/player/SkipManager';

describe('SkipManager', () => {
  beforeEach(() => localStorage.clear());

  it('по умолчанию перематывает на 85 секунд', () => {
    const manager = new SkipManager();

    expect(manager.getSkipTime()).toBe(85);
    expect(manager.getMinutes()).toBe(1);
    expect(manager.getSeconds()).toBe(25);
  });

  it('минуты и секунды меняются независимо друг от друга', () => {
    const manager = new SkipManager();

    manager.setMinutes(2);
    expect(manager.getSkipTime()).toBe(145);
    expect(manager.getSeconds()).toBe(25);

    manager.setSeconds(5);
    expect(manager.getSkipTime()).toBe(125);
    expect(manager.getMinutes()).toBe(2);
  });

  it('сообщает об изменении через колбэк', () => {
    const onSkipTimeChange = jest.fn();
    const manager = new SkipManager({ onSkipTimeChange });

    manager.setSkipTime(30);

    expect(onSkipTimeChange).toHaveBeenCalledWith(30);
  });

  it('отвергает значения вне диапазона, сохраняя прежнее', () => {
    const onSkipTimeChange = jest.fn();
    const manager = new SkipManager({ onSkipTimeChange });

    manager.setSkipTime(-1);
    manager.setSkipTime(601);

    expect(manager.getSkipTime()).toBe(85);
    expect(onSkipTimeChange).not.toHaveBeenCalled();
  });

  it('границы диапазона допустимы', () => {
    const manager = new SkipManager();

    manager.setSkipTime(0);
    expect(manager.getSkipTime()).toBe(0);

    manager.setSkipTime(600);
    expect(manager.getSkipTime()).toBe(600);
  });

  it('значение переживает пересоздание менеджера', () => {
    new SkipManager().setSkipTime(45);

    expect(new SkipManager().getSkipTime()).toBe(45);
  });

  it('форматирует время в минуты и секунды', () => {
    const manager = new SkipManager();

    manager.setSkipTime(125);

    expect(manager.formatSkipTime()).toBe('2 мин 5 сек');
  });
});

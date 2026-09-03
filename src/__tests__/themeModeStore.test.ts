import { ThemeModeStore } from '../renderer/services/theme/ThemeModeStore';

const STORAGE_KEY = 'animeLibThemeMode';

describe('ThemeModeStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('без сохранённого значения остаётся тёмным', () => {
    expect(new ThemeModeStore().getMode()).toBe('dark');
  });

  it('поднимает сохранённый режим при создании', () => {
    localStorage.setItem(STORAGE_KEY, 'light');

    expect(new ThemeModeStore().getMode()).toBe('light');
  });

  it('испорченное сохранённое значение считает системным', () => {
    localStorage.setItem(STORAGE_KEY, 'sepia');

    expect(new ThemeModeStore().getMode()).toBe('system');
  });

  it('принимает словарь сайта и приводит auto к системному', () => {
    const store = new ThemeModeStore();

    store.setMode('auto');

    expect(store.getMode()).toBe('system');
  });

  it('сохраняет принятый режим', () => {
    const store = new ThemeModeStore();

    store.setMode('light');

    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
  });

  it('оповещает подписчиков о смене', () => {
    const store = new ThemeModeStore();
    const listener = jest.fn();
    store.subscribe(listener);

    store.setMode('light');

    expect(listener).toHaveBeenCalledWith('light', 'light');
  });

  it('повторный тот же режим подписчиков не тревожит', () => {
    const store = new ThemeModeStore();
    store.setMode('light');
    const listener = jest.fn();
    store.subscribe(listener);

    store.setMode('light');

    expect(listener).not.toHaveBeenCalled();
  });

  it('отписка прекращает оповещения', () => {
    const store = new ThemeModeStore();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.setMode('light');

    expect(listener).not.toHaveBeenCalled();
  });

  it('явный режим отдаётся схемой напрямую', () => {
    const store = new ThemeModeStore();

    store.setMode('light');
    expect(store.getScheme()).toBe('light');

    store.setMode('dark');
    expect(store.getScheme()).toBe('dark');
  });

  it('системный режим без matchMedia разрешается в тёмную схему', () => {
    const store = new ThemeModeStore();

    store.setMode('system');

    expect(store.getScheme()).toBe('dark');
  });
});

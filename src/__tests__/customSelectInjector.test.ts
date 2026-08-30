import {
  customSelectInjectorMain,
  getCustomSelectScript,
} from '../renderer/scripts/customSelectInjector';

const GLOBAL_KEY = '__animelibCustomSelect';

/** Выполняет сгенерированный исходник так же, как это делает webview.executeJavaScript. */
const runInjectedScript = (): boolean =>
  // eslint-disable-next-line no-eval
  eval(getCustomSelectScript()) as boolean;

const addSelect = (id: string, values: string[]): HTMLSelectElement => {
  const select = document.createElement('select');
  select.id = id;
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  document.body.appendChild(select);
  return select;
};

describe('customSelectInjector', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    delete (window as unknown as Record<string, unknown>)[GLOBAL_KEY];
  });

  it('генерирует самодостаточный IIFE без ссылок на внешний модуль', () => {
    const script = getCustomSelectScript();

    expect(script.startsWith('(function () {')).toBe(true);
    expect(script).toContain(customSelectInjectorMain.name);
    expect(script).not.toContain('createLogger');
    expect(script).not.toContain('require(');
  });

  it('заменяет существующие select и возвращает true', () => {
    addSelect('quality', ['720p', '1080p']);

    expect(runInjectedScript()).toBe(true);
    expect(document.getElementById('custom-select-styles')).not.toBeNull();
    expect(document.querySelectorAll('.custom-select-wrapper')).toHaveLength(1);
    expect(
      document
        .getElementById('quality')
        ?.classList.contains('original-select-hidden'),
    ).toBe(true);
  });

  it('повторный запуск переиспользует инстанс и подхватывает новые select', () => {
    addSelect('first', ['a']);
    runInjectedScript();

    const injector = (window as unknown as Record<string, unknown>)[GLOBAL_KEY];
    addSelect('second', ['b']);
    runInjectedScript();

    expect((window as unknown as Record<string, unknown>)[GLOBAL_KEY]).toBe(
      injector,
    );
    expect(document.querySelectorAll('.custom-select-wrapper')).toHaveLength(2);
  });

  it('клик по опции меняет значение оригинального select и шлёт change', () => {
    const select = addSelect('quality', ['720p', '1080p']);
    const onChange = jest.fn();
    select.addEventListener('change', onChange);

    runInjectedScript();

    const option = document.querySelectorAll<HTMLElement>(
      '.custom-select-option',
    )[1];
    option.click();

    expect(select.value).toBe('1080p');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(option.classList.contains('selected')).toBe(true);
  });

  it('destroy снимает стили, обёртки и возвращает нативный select', () => {
    addSelect('quality', ['720p']);
    runInjectedScript();

    const injector = (window as unknown as Record<string, unknown>)[
      GLOBAL_KEY
    ] as { destroy: () => void };
    injector.destroy();

    expect(document.querySelectorAll('.custom-select-wrapper')).toHaveLength(0);
    expect(document.getElementById('custom-select-styles')).toBeNull();
    expect(
      document
        .getElementById('quality')
        ?.classList.contains('original-select-hidden'),
    ).toBe(false);
  });
});

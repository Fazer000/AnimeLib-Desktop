/**
 * Единственный источник кода замены нативных select на кастомные.
 * Тело инжектора сериализуется через toString() и выполняется в контексте гостевой страницы.
 */

/**
 * Тело инжектора. Полностью самодостаточно: не ссылается на внешнюю область
 * видимости, потому что выполняется в другом контексте после сериализации.
 */
export function customSelectInjectorMain(): void {
  const DROPDOWN_HEIGHT = 200;
  const STYLE_ID = 'custom-select-styles';
  const GLOBAL_KEY = '__animelibCustomSelect';

  const STYLES = `
    .custom-select-wrapper {
      position: relative;
      display: inline-block;
      min-width: 120px;
      font-family: "Open Sans", sans-serif;
      overflow: visible !important;
    }
    .custom-select-wrapper .custom-select-trigger {
      overflow: visible !important;
    }
    .custom-select-trigger {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 14px;
      color: #bfbfbf;
      min-height: 36px;
      box-sizing: border-box;
    }
    .custom-select-trigger:hover,
    .custom-select-trigger:focus {
      outline: none;
      background: #1c1c1c;
    }
    .custom-select-trigger.disabled {
      background: #0a0a0a;
      color: rgba(191, 191, 191, 0.5);
      cursor: not-allowed;
    }
    .custom-select-value {
      flex: 1;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .custom-select-placeholder {
      color: rgba(191, 191, 191, 0.5);
    }
    .custom-select-arrow {
      margin-left: 8px;
      transition: transform 0.2s ease;
      font-size: 12px;
    }
    .custom-select-trigger.open .custom-select-arrow {
      transform: rotate(180deg);
    }
    .custom-select-dropdown {
      position: fixed;
      background: #252527;
      border-radius: 8px;
      z-index: 999999;
      max-height: 250px !important;
      overflow: hidden;
      margin-top: 2px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-8px);
      transition: all 0.2s ease;
    }
    .custom-select-dropdown.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
    .custom-select-options,
    .custom-select-dropdown .custom-select-options {
      padding: 4px 0;
      max-height: 250px !important;
      overflow-y: scroll !important;
      overflow-x: hidden !important;
    }
    .custom-select-option {
      padding: 8px 12px;
      cursor: pointer;
      transition: background-color 0.15s ease;
      font-size: 14px;
      color: #bfbfbf;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .custom-select-option:hover {
      background: #1c1c1c;
    }
    .custom-select-option.selected {
      background: rgba(124, 58, 237, 0.2);
      color: #7C3AED;
      font-weight: 500;
    }
    .custom-select-option.disabled {
      color: rgba(191, 191, 191, 0.5);
      cursor: not-allowed;
    }
    .custom-select-option.disabled:hover {
      background: transparent;
    }
    .original-select-hidden {
      position: absolute !important;
      left: -9999px !important;
      opacity: 0 !important;
      pointer-events: none !important;
      width: 1px !important;
      height: 1px !important;
    }
    .custom-select-options::-webkit-scrollbar {
      width: 6px;
    }
    .custom-select-options::-webkit-scrollbar-track {
      background: #1c1c1c;
      border-radius: 3px;
    }
    .custom-select-options::-webkit-scrollbar-thumb {
      background: #464649;
      border-radius: 3px;
    }
    .custom-select-options::-webkit-scrollbar-thumb:hover {
      background: #7C3AED;
    }
  `;

  interface CustomSelectEntry {
    wrapper: HTMLElement;
    trigger: HTMLElement;
    dropdown: HTMLElement;
    valueSpan: HTMLElement;
  }

  /** Заменяет нативные select на кастомные и следит за появлением новых. */
  class CustomSelectInjector {
    private entries = new Map<HTMLSelectElement, CustomSelectEntry>();

    private observer: MutationObserver | null = null;

    private onDocumentClick = (event: MouseEvent): void => {
      this.entries.forEach((entry) => {
        if (!entry.wrapper.contains(event.target as Node)) {
          CustomSelectInjector.close(entry);
        }
      });
    };

    private onViewportChange = (): void => {
      this.entries.forEach((entry) => {
        if (entry.dropdown.classList.contains('open')) {
          CustomSelectInjector.position(entry);
        }
      });
    };

    /** Инжектит стили, заменяет существующие select и подписывается на новые. */
    public init(): void {
      CustomSelectInjector.injectStyles();
      this.refresh();
      this.setupMutationObserver();
      document.addEventListener('click', this.onDocumentClick);
      window.addEventListener('resize', this.onViewportChange);
      window.addEventListener('scroll', this.onViewportChange, true);
    }

    /** Заменяет select-элементы, появившиеся после последнего прохода. */
    public refresh(): void {
      document
        .querySelectorAll<HTMLSelectElement>(
          'select:not(.original-select-hidden)',
        )
        .forEach((select) => this.replaceSelect(select));
    }

    /** Снимает подписки и возвращает страницу к нативным select. */
    public destroy(): void {
      this.observer?.disconnect();
      this.observer = null;
      document.removeEventListener('click', this.onDocumentClick);
      window.removeEventListener('resize', this.onViewportChange);
      window.removeEventListener('scroll', this.onViewportChange, true);

      this.entries.forEach((entry, select) => {
        entry.wrapper.remove();
        select.classList.remove('original-select-hidden');
      });
      this.entries.clear();

      document.getElementById(STYLE_ID)?.remove();
    }

    private static injectStyles(): void {
      document.getElementById(STYLE_ID)?.remove();

      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = STYLES;
      document.head.appendChild(style);
    }

    private replaceSelect(select: HTMLSelectElement): void {
      if (this.entries.has(select)) return;

      const entry = this.createCustomSelect(select);
      if (!entry) return;

      select.parentNode?.insertBefore(entry.wrapper, select);
      select.classList.add('original-select-hidden');
      this.entries.set(select, entry);
    }

    private createCustomSelect(
      select: HTMLSelectElement,
    ): CustomSelectEntry | null {
      try {
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        if (select.id) wrapper.id = `custom-${select.id}`;
        if (select.className) wrapper.className += ` ${select.className}`;

        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        trigger.tabIndex = select.tabIndex || 0;

        const valueSpan = document.createElement('span');
        valueSpan.className = 'custom-select-value';

        const arrowSpan = document.createElement('span');
        arrowSpan.className = 'custom-select-arrow';
        arrowSpan.textContent = '▼';

        trigger.appendChild(valueSpan);
        trigger.appendChild(arrowSpan);

        const dropdown = document.createElement('div');
        dropdown.className = 'custom-select-dropdown';

        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-select-options';
        dropdown.appendChild(optionsContainer);

        wrapper.appendChild(trigger);
        wrapper.appendChild(dropdown);

        const entry: CustomSelectEntry = {
          wrapper,
          trigger,
          dropdown,
          valueSpan,
        };

        Array.from(select.options).forEach((option) => {
          optionsContainer.appendChild(
            CustomSelectInjector.createCustomOption(option, select, entry),
          );
        });

        this.setupEventHandlers(select, entry);
        CustomSelectInjector.updateDisplayValue(select, valueSpan);

        return entry;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[CustomSelectInjector] create failed:', error);
        return null;
      }
    }

    private static createCustomOption(
      option: HTMLOptionElement,
      select: HTMLSelectElement,
      entry: CustomSelectEntry,
    ): HTMLElement {
      const element = document.createElement('div');
      element.className = 'custom-select-option';
      if (option.disabled) element.classList.add('disabled');
      if (option.selected) element.classList.add('selected');
      element.textContent = option.textContent || option.value;
      element.dataset.value = option.value;

      element.addEventListener('click', (event) => {
        event.stopPropagation();
        if (option.disabled) return;

        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));

        CustomSelectInjector.updateDisplayValue(select, entry.valueSpan);
        CustomSelectInjector.close(entry);

        entry.wrapper
          .querySelectorAll<HTMLElement>('.custom-select-option')
          .forEach((opt) => {
            opt.classList.toggle(
              'selected',
              opt.dataset.value === option.value,
            );
          });
      });

      return element;
    }

    private setupEventHandlers(
      select: HTMLSelectElement,
      entry: CustomSelectEntry,
    ): void {
      entry.trigger.addEventListener('click', (event) => {
        event.stopPropagation();
        if (select.disabled) return;

        const isOpen = entry.dropdown.classList.contains('open');
        this.entries.forEach((other) => {
          if (other !== entry) CustomSelectInjector.close(other);
        });

        if (isOpen) {
          CustomSelectInjector.close(entry);
        } else {
          CustomSelectInjector.open(entry);
        }
      });

      entry.trigger.addEventListener('keydown', (event) => {
        if (select.disabled) return;

        switch (event.key) {
          case 'Enter':
          case ' ':
            event.preventDefault();
            entry.trigger.click();
            break;
          case 'Escape':
            CustomSelectInjector.close(entry);
            break;
          case 'ArrowDown':
          case 'ArrowUp':
            event.preventDefault();
            if (!entry.dropdown.classList.contains('open')) {
              CustomSelectInjector.open(entry);
            }
            break;
          default:
            break;
        }
      });
    }

    private static open(entry: CustomSelectEntry): void {
      CustomSelectInjector.position(entry);
      entry.dropdown.classList.add('open');
      entry.trigger.classList.add('open');
    }

    private static close(entry: CustomSelectEntry): void {
      entry.dropdown.classList.remove('open');
      entry.trigger.classList.remove('open');
    }

    /** Позиционирует dropdown в координатах окна, переворачивая вверх при нехватке места. */
    private static position(entry: CustomSelectEntry): void {
      const rect = entry.trigger.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const { dropdown } = entry;

      dropdown.style.position = 'fixed';
      dropdown.style.left = `${rect.left}px`;
      dropdown.style.width = `${rect.width}px`;

      const flipUp =
        rect.bottom + DROPDOWN_HEIGHT > viewportHeight &&
        rect.top > DROPDOWN_HEIGHT;

      if (flipUp) {
        dropdown.style.top = `${rect.top - DROPDOWN_HEIGHT - 2}px`;
        dropdown.style.maxHeight = `${Math.min(
          DROPDOWN_HEIGHT,
          rect.top - 10,
        )}px`;
      } else {
        dropdown.style.top = `${rect.bottom + 2}px`;
        dropdown.style.maxHeight = `${Math.min(
          DROPDOWN_HEIGHT,
          viewportHeight - rect.bottom - 10,
        )}px`;
      }
    }

    private static updateDisplayValue(
      select: HTMLSelectElement,
      valueSpan: HTMLElement,
    ): void {
      const selected = select.options[select.selectedIndex];

      if (selected) {
        valueSpan.textContent = selected.textContent || selected.value;
        valueSpan.classList.remove('custom-select-placeholder');
      } else {
        valueSpan.textContent = 'Выберите опцию...';
        valueSpan.classList.add('custom-select-placeholder');
      }
    }

    private setupMutationObserver(): void {
      this.observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType !== Node.ELEMENT_NODE) return;

            const element = node as Element;
            if (
              element.tagName === 'SELECT' &&
              !element.classList.contains('original-select-hidden')
            ) {
              this.replaceSelect(element as HTMLSelectElement);
            }

            element
              .querySelectorAll?.<HTMLSelectElement>(
                'select:not(.original-select-hidden)',
              )
              .forEach((select) => this.replaceSelect(select));
          });
        });
      });

      this.observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  const scope = window as unknown as Record<string, unknown>;
  const existing = scope[GLOBAL_KEY] as CustomSelectInjector | undefined;

  if (existing) {
    existing.refresh();
    return;
  }

  const start = (): void => {
    const injector = new CustomSelectInjector();
    scope[GLOBAL_KEY] = injector;
    injector.init();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}

/**
 * Возвращает самовыполняющийся исходник инжектора для webview.executeJavaScript.
 * Результат выполнения — boolean: успешность инъекции.
 */
export function getCustomSelectScript(): string {
  return `(function () {
  try {
    (${customSelectInjectorMain.toString()})();
    return true;
  } catch (error) {
    console.error('[CustomSelectInjector] injection failed:', error);
    return false;
  }
})();`;
}

import { createLogger } from '../../shared/logger';

const log = createLogger('CustomSelectInjector');

/**
 * CustomSelectInjector - Инъекция для замены стандартных select на кастомные
 *
 * Заменяет все стандартные HTML select элементы на красивые кастомные
 * с Material Design стилизацией и улучшенным UX
 */

class CustomSelectInjector {
  // eslint-disable-next-line no-use-before-define
  private static instance: CustomSelectInjector | null = null;

  private injected = false;

  private observer: MutationObserver | null = null;

  private customSelects: Map<HTMLSelectElement, HTMLElement> = new Map();

  public static getInstance(): CustomSelectInjector {
    if (!CustomSelectInjector.instance) {
      CustomSelectInjector.instance = new CustomSelectInjector();
    }
    return CustomSelectInjector.instance;
  }

  /**
   * Инициализация инъекции
   */
  public init(): void {
    if (this.injected) {
      log.debug('Already injected');
      return;
    }

    log.debug('Initializing custom select injection...');

    this.injectStyles();

    this.replaceExistingSelects();

    this.setupMutationObserver();

    this.injected = true;
    log.debug('Custom select injection completed');
  }

  /**
   * Инжектим CSS стили для кастомных select
   */
  // eslint-disable-next-line class-methods-use-this
  private injectStyles(): void {
    const styleId = 'custom-select-styles';

    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Custom Select Styles */
      .custom-select-wrapper {
        position: relative;
        display: inline-block;
        min-width: 120px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .custom-select-trigger {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: #ffffff;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 14px;
        color: #374151;
        min-height: 36px;
        box-sizing: border-box;
      }

      .custom-select-trigger:hover {
        border-color: #9ca3af;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .custom-select-trigger:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .custom-select-trigger.disabled {
        background: #f9fafb;
        color: #9ca3af;
        cursor: not-allowed;
        border-color: #e5e7eb;
      }

      .custom-select-value {
        flex: 1;
        text-align: left;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .custom-select-placeholder {
        color: #9ca3af;
      }

      .custom-select-arrow {
        margin-left: 8px;
        transition: transform 0.2s ease;
        color: #6b7280;
        font-size: 12px;
      }

      .custom-select-trigger.open .custom-select-arrow {
        transform: rotate(180deg);
      }

      .custom-select-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: #ffffff;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        z-index: 1000;
        max-height: 200px;
        overflow-y: auto;
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

      .custom-select-search {
        padding: 8px 12px;
        border-bottom: 1px solid #e5e7eb;
      }

      .custom-select-search input {
        width: 100%;
        padding: 6px 8px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 13px;
        outline: none;
      }

      .custom-select-search input:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
      }

      .custom-select-options {
        padding: 4px 0;
      }

      .custom-select-option {
        padding: 8px 12px;
        cursor: pointer;
        transition: background-color 0.15s ease;
        font-size: 14px;
        color: #374151;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .custom-select-option:hover {
        background: #f3f4f6;
      }

      .custom-select-option.selected {
        background: #eff6ff;
        color: #1d4ed8;
        font-weight: 500;
      }

      .custom-select-option.disabled {
        color: #9ca3af;
        cursor: not-allowed;
      }

      .custom-select-option.disabled:hover {
        background: transparent;
      }

      .custom-select-checkbox {
        margin-right: 8px;
        width: 16px;
        height: 16px;
        border: 1px solid #d1d5db;
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        color: #ffffff;
        background: #ffffff;
      }

      .custom-select-checkbox.checked {
        background: #3b82f6;
        border-color: #3b82f6;
      }

      .custom-select-checkbox.checked::before {
        content: '✓';
      }

      /* Скрываем оригинальные select */
      .original-select-hidden {
        position: absolute !important;
        left: -9999px !important;
        opacity: 0 !important;
        pointer-events: none !important;
        width: 1px !important;
        height: 1px !important;
      }

      /* Скроллбар для dropdown */
      .custom-select-dropdown::-webkit-scrollbar {
        width: 6px;
      }

      .custom-select-dropdown::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 3px;
      }

      .custom-select-dropdown::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
      }

      .custom-select-dropdown::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }

      /* Анимации */
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .custom-select-dropdown.open {
        animation: fadeIn 0.2s ease;
      }

      /* Темная тема поддержка */
      @media (prefers-color-scheme: dark) {
        .custom-select-trigger {
          background: #1f2937;
          border-color: #374151;
          color: #f9fafb;
        }

        .custom-select-trigger:hover {
          border-color: #4b5563;
        }

        .custom-select-trigger.disabled {
          background: #111827;
          color: #6b7280;
          border-color: #374151;
        }

        .custom-select-dropdown {
          background: #1f2937;
          border-color: #374151;
        }

        .custom-select-option {
          color: #f9fafb;
        }

        .custom-select-option:hover {
          background: #374151;
        }

        .custom-select-option.selected {
          background: #1e3a8a;
          color: #93c5fd;
        }

        .custom-select-search input {
          background: #111827;
          border-color: #374151;
          color: #f9fafb;
        }

        .custom-select-search input:focus {
          border-color: #3b82f6;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Заменяем существующие select элементы
   */
  private replaceExistingSelects(): void {
    const selects = document.querySelectorAll(
      'select:not(.original-select-hidden)',
    );
    log.debug(`Found ${selects.length} select elements to replace`);

    selects.forEach((select) => {
      this.replaceSelect(select as HTMLSelectElement);
    });
  }

  /**
   * Заменяем конкретный select элемент
   */
  private replaceSelect(originalSelect: HTMLSelectElement): void {
    if (this.customSelects.has(originalSelect)) {
      return;
    }

    const wrapper = this.createCustomSelect(originalSelect);
    if (wrapper) {
      originalSelect.parentNode?.insertBefore(wrapper, originalSelect);

      originalSelect.classList.add('original-select-hidden');

      this.customSelects.set(originalSelect, wrapper);

      log.debug('Replaced select element');
    }
  }

  /**
   * Создаем кастомный select элемент
   */
  private createCustomSelect(
    originalSelect: HTMLSelectElement,
  ): HTMLElement | null {
    try {
      const wrapper = document.createElement('div');
      wrapper.className = 'custom-select-wrapper';

      if (originalSelect.id) wrapper.id = `custom-${originalSelect.id}`;
      if (originalSelect.className)
        wrapper.className += ` ${originalSelect.className}`;

      const trigger = document.createElement('div');
      trigger.className = 'custom-select-trigger';
      trigger.tabIndex = originalSelect.tabIndex || 0;

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

      const options = Array.from(originalSelect.options);
      options.forEach((option) => {
        const customOption = this.createCustomOption(
          option,
          originalSelect,
          wrapper,
        );
        optionsContainer.appendChild(customOption);
      });

      dropdown.appendChild(optionsContainer);
      wrapper.appendChild(trigger);
      wrapper.appendChild(dropdown);

      this.setupEventHandlers(trigger, dropdown, originalSelect, wrapper);

      this.updateDisplayValue(originalSelect, valueSpan);

      return wrapper;
    } catch (error) {
      log.error('Error creating custom select:', error);
      return null;
    }
  }

  /**
   * Создаем кастомную опцию
   */
  private createCustomOption(
    option: HTMLOptionElement,
    originalSelect: HTMLSelectElement,
    wrapper: HTMLElement,
  ): HTMLElement {
    const optionElement = document.createElement('div');
    optionElement.className = 'custom-select-option';

    if (option.disabled) {
      optionElement.classList.add('disabled');
    }

    if (option.selected) {
      optionElement.classList.add('selected');
    }

    optionElement.textContent = option.textContent || option.value;
    optionElement.dataset.value = option.value;

    optionElement.addEventListener('click', (e) => {
      e.stopPropagation();

      if (option.disabled) return;

      originalSelect.value = option.value;

      const changeEvent = new Event('change', { bubbles: true });
      originalSelect.dispatchEvent(changeEvent);

      this.updateDisplayValue(
        originalSelect,
        wrapper.querySelector('.custom-select-value') as HTMLElement,
      );

      const dropdown = wrapper.querySelector(
        '.custom-select-dropdown',
      ) as HTMLElement;
      const trigger = wrapper.querySelector(
        '.custom-select-trigger',
      ) as HTMLElement;

      dropdown.classList.remove('open');
      trigger.classList.remove('open');

      wrapper.querySelectorAll('.custom-select-option').forEach((opt) => {
        const optElement = opt as HTMLElement;
        optElement.classList.remove('selected');
        if (optElement.dataset.value === option.value) {
          optElement.classList.add('selected');
        }
      });
    });

    return optionElement;
  }

  /**
   * Настраиваем обработчики событий
   */
  // eslint-disable-next-line class-methods-use-this
  private setupEventHandlers(
    trigger: HTMLElement,
    dropdown: HTMLElement,
    originalSelect: HTMLSelectElement,
    wrapper: HTMLElement,
  ): void {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();

      if (originalSelect.disabled) return;

      const isOpen = dropdown.classList.contains('open');

      document
        .querySelectorAll('.custom-select-dropdown.open')
        .forEach((otherDropdown) => {
          if (otherDropdown !== dropdown) {
            otherDropdown.classList.remove('open');
            otherDropdown.parentElement
              ?.querySelector('.custom-select-trigger')
              ?.classList.remove('open');
          }
        });

      if (isOpen) {
        dropdown.classList.remove('open');
        trigger.classList.remove('open');
      } else {
        dropdown.classList.add('open');
        trigger.classList.add('open');
      }
    });

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target as Node)) {
        dropdown.classList.remove('open');
        trigger.classList.remove('open');
      }
    });

    trigger.addEventListener('keydown', (e) => {
      if (originalSelect.disabled) return;

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          trigger.click();
          break;
        case 'Escape':
          dropdown.classList.remove('open');
          trigger.classList.remove('open');
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!dropdown.classList.contains('open')) {
            dropdown.classList.add('open');
            trigger.classList.add('open');
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (!dropdown.classList.contains('open')) {
            dropdown.classList.add('open');
            trigger.classList.add('open');
          }
          break;
        default:
          break;
      }
    });
  }

  /**
   * Обновляем отображаемое значение
   */
  // eslint-disable-next-line class-methods-use-this
  private updateDisplayValue(
    originalSelect: HTMLSelectElement,
    valueSpan: HTMLElement,
  ): void {
    const selectedOption = originalSelect.options[originalSelect.selectedIndex];

    if (selectedOption) {
      valueSpan.textContent =
        selectedOption.textContent || selectedOption.value;
      valueSpan.classList.remove('custom-select-placeholder');
    } else {
      valueSpan.textContent = 'Выберите опцию...';
      valueSpan.classList.add('custom-select-placeholder');
    }
  }

  /**
   * Настраиваем MutationObserver для новых select элементов
   */
  private setupMutationObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;

            if (
              element.tagName === 'SELECT' &&
              !element.classList.contains('original-select-hidden')
            ) {
              this.replaceSelect(element as HTMLSelectElement);
            }

            const selects = element.querySelectorAll?.(
              'select:not(.original-select-hidden)',
            );
            selects?.forEach((select) => {
              this.replaceSelect(select as HTMLSelectElement);
            });
          }
        });
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Очистка инъекции
   */
  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    const style = document.getElementById('custom-select-styles');
    if (style) {
      style.remove();
    }

    this.customSelects.forEach((wrapper, originalSelect) => {
      wrapper.remove();
      originalSelect.classList.remove('original-select-hidden');
    });

    this.customSelects.clear();
    this.injected = false;

    log.debug('Custom select injection destroyed');
  }
}

export default function injectCustomSelects(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const injector = CustomSelectInjector.getInstance();
      injector.init();
      resolve();
    } catch (error) {
      log.error('Injection failed:', error);
      reject(error);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectCustomSelects().catch((error) => {
      log.error('Auto-injection failed:', error);
    });
  });
} else {
  injectCustomSelects().catch((error) => {
    log.error('Auto-injection failed:', error);
  });
}

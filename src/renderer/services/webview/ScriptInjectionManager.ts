import { createLogger } from '../../../shared/logger';

const log = createLogger('ScriptInjectionManager');

/**
 * ScriptInjectionManager - Manages script injection into webview
 *
 * Responsibilities:
 * - Script injection timing
 * - DOM ready detection
 * - Retry logic for failed injections
 * - Multiple script coordination
 *
 * @example
 * ```typescript
 * const manager = new ScriptInjectionManager(webview);
 *
 * manager.injectOnReady(() => {
 *   log.debug('Injecting scripts...');
 *   injectClickInterceptor(webview);
 *   extractAuthToken(webview);
 * });
 * ```
 */

export interface InjectionCallback {
  (): void;
}

export interface ScriptInjectionConfig {
  maxRetries?: number;
  retryDelay?: number;
  waitForDomReady?: boolean;
}

export class ScriptInjectionManager {
  private webview: any;

  private config: Required<ScriptInjectionConfig>;

  private injectionCallbacks: InjectionCallback[] = [];

  private isInjecting: boolean = false;

  private retryCount: number = 0;

  constructor(webview?: any, config: ScriptInjectionConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      waitForDomReady: config.waitForDomReady ?? true,
    };

    if (webview) {
      this.attachWebView(webview);
    }
  }

  /**
   * Attach webview element
   */
  public attachWebView(webview: any): void {
    if (!webview) {
      log.error('Cannot attach null webview');
      return;
    }

    this.webview = webview;
    log.debug('WebView attached');
  }

  /**
   * Register injection callback
   */
  public registerCallback(callback: InjectionCallback): void {
    if (!this.injectionCallbacks.includes(callback)) {
      this.injectionCallbacks.push(callback);
      log.debug('Callback registered, total:', this.injectionCallbacks.length);
    }
  }

  /**
   * Unregister injection callback
   */
  public unregisterCallback(callback: InjectionCallback): void {
    const index = this.injectionCallbacks.indexOf(callback);
    if (index !== -1) {
      this.injectionCallbacks.splice(index, 1);
      log.debug(
        'Callback unregistered, remaining:',
        this.injectionCallbacks.length,
      );
    }
  }

  /**
   * Clear all callbacks
   */
  public clearCallbacks(): void {
    this.injectionCallbacks = [];
    log.debug('All callbacks cleared');
  }

  /**
   * Check if DOM is ready
   */
  private isDomReady(): boolean {
    if (!this.webview) return false;

    try {
      if (this.webview.getWebContentsId) {
        this.webview.getWebContentsId();
        return true;
      }
    } catch {
      return false;
    }

    return false;
  }

  /**
   * Wait for DOM to be ready
   */
  private waitForDomReady(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isDomReady()) {
        resolve();
        return;
      }

      if (!this.webview) {
        log.error('No webview attached');
        resolve();
        return;
      }

      const handleDomReady = () => {
        log.debug('DOM ready event fired');
        resolve();
      };

      this.webview.addEventListener('dom-ready', handleDomReady, {
        once: true,
      });

      setTimeout(() => {
        log.debug('DOM ready timeout, resolving anyway');
        resolve();
      }, 5000);
    });
  }

  /**
   * Execute all registered callbacks
   */
  private executeCallbacks(): void {
    if (this.injectionCallbacks.length === 0) {
      log.debug('No callbacks to execute');
      return;
    }

    log.debug('Executing', this.injectionCallbacks.length, 'callbacks');

    this.injectionCallbacks.forEach((callback, index) => {
      try {
        log.debug('Executing callback', index + 1);
        callback();
      } catch (error) {
        log.error('Error executing callback', index + 1, ':', error);
      }
    });
  }

  /**
   * Inject scripts with retry logic
   */
  public async inject(): Promise<void> {
    if (this.isInjecting) {
      log.debug('Injection already in progress');
      return;
    }

    if (!this.webview) {
      log.error('No webview attached for injection');
      return;
    }

    this.isInjecting = true;
    log.debug('Starting injection process...');

    try {
      if (this.config.waitForDomReady) {
        log.debug('Waiting for DOM to be ready...');
        await this.waitForDomReady();
      }

      this.executeCallbacks();

      this.retryCount = 0;
      log.debug('Injection completed successfully');
    } catch (error) {
      log.error('Injection error:', error);

      if (this.retryCount < this.config.maxRetries) {
        this.retryCount += 1;
        log.debug(
          `Retrying injection (${this.retryCount}/${this.config.maxRetries})...`,
        );

        setTimeout(() => {
          this.isInjecting = false;
          this.inject();
        }, this.config.retryDelay);
      } else {
        log.error('Max retries reached, giving up');
        this.retryCount = 0;
      }
    } finally {
      this.isInjecting = false;
    }
  }

  /**
   * Inject scripts when ready (convenience method)
   */
  public injectOnReady(callback: InjectionCallback): void {
    this.registerCallback(callback);
    this.inject();
  }

  /**
   * Get webview reference
   */
  public getWebView(): any {
    return this.webview;
  }

  /**
   * Reset manager state
   */
  public reset(): void {
    this.isInjecting = false;
    this.retryCount = 0;
    log.debug('State reset');
  }

  /**
   * Получает скрипт для инъекции кастомных select
   */
  private static getCustomSelectScript(): string {
    return `
      class CustomSelectInjector {
        constructor() {
          this.injected = false;
          this.observer = null;
          this.customSelects = new Map();
        }

        init() {
          if (this.injected) return;

          this.injectStyles();
          this.replaceExistingSelects();
          this.setupMutationObserver();
          this.injected = true;
        }

        injectStyles() {
          const styleId = 'custom-select-styles';
          const existingStyle = document.getElementById(styleId);
          if (existingStyle) existingStyle.remove();

          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = \`
            .custom-select-wrapper {
              position: relative;
              display: inline-block;
              min-width: 120px;
              font-family: "Open Sans", sans-serif;
            }
            /* Предотвращаем обрезание dropdown родительскими контейнерами */
            .custom-select-wrapper {
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
            .custom-select-trigger:hover {
              background: #1c1c1c;
            }
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
            .custom-select-options {
              padding: 4px 0;
              max-height: 250px !important;
              overflow-y: auto !important;
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
            /* Кастомный скроллбар для options */
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
            /* Принудительный скролл для options */
            .custom-select-dropdown .custom-select-options {
              overflow-y: scroll !important;
              overflow-x: hidden !important;
              max-height: 250px !important;
            }
          \`;
          document.head.appendChild(style);
        }

        replaceExistingSelects() {
          const selects = document.querySelectorAll('select:not(.original-select-hidden)');
          selects.forEach((select) => {
            this.replaceSelect(select);
          });
        }

        replaceSelect(originalSelect) {
          if (this.customSelects.has(originalSelect)) return;

          const wrapper = this.createCustomSelect(originalSelect);
          if (wrapper) {
            originalSelect.parentNode?.insertBefore(wrapper, originalSelect);
            originalSelect.classList.add('original-select-hidden');
            this.customSelects.set(originalSelect, wrapper);
          }
        }

        createCustomSelect(originalSelect) {
          try {
            const wrapper = document.createElement('div');
            wrapper.className = 'custom-select-wrapper';

            if (originalSelect.id) wrapper.id = \`custom-\${originalSelect.id}\`;
            if (originalSelect.className) wrapper.className += \` \${originalSelect.className}\`;

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
              const customOption = this.createCustomOption(option, originalSelect);
              optionsContainer.appendChild(customOption);
            });

            dropdown.appendChild(optionsContainer);
            wrapper.appendChild(trigger);
            wrapper.appendChild(dropdown);

            this.setupEventHandlers(trigger, dropdown, originalSelect, wrapper);
            this.updateDisplayValue(originalSelect, valueSpan);

            return wrapper;
          } catch (error) {
            console.error('Error creating custom select:', error);
            return null;
          }
        }

        createCustomOption(option, originalSelect) {
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

            const wrapper = optionElement.closest('.custom-select-wrapper');
            if (!wrapper) return;

            originalSelect.value = option.value;
            const changeEvent = new Event('change', { bubbles: true });
            originalSelect.dispatchEvent(changeEvent);

            const valueSpan = wrapper.querySelector('.custom-select-value');
            if (valueSpan) {
              this.updateDisplayValue(originalSelect, valueSpan);
            }

            const dropdown = wrapper.querySelector('.custom-select-dropdown');
            const trigger = wrapper.querySelector('.custom-select-trigger');

            if (dropdown) dropdown.classList.remove('open');
            if (trigger) trigger.classList.remove('open');

            wrapper.querySelectorAll('.custom-select-option').forEach((opt) => {
              opt.classList.remove('selected');
              if (opt.dataset.value === option.value) {
                opt.classList.add('selected');
              }
            });
          });

          return optionElement;
        }

        setupEventHandlers(trigger, dropdown, originalSelect, wrapper) {
          trigger.addEventListener('click', (e) => {
            e.stopPropagation();

            if (originalSelect.disabled) return;

            const isOpen = dropdown.classList.contains('open');

            document.querySelectorAll('.custom-select-dropdown.open').forEach((otherDropdown) => {
              if (otherDropdown !== dropdown) {
                otherDropdown.classList.remove('open');
                otherDropdown.parentElement?.querySelector('.custom-select-trigger')?.classList.remove('open');
              }
            });

            if (isOpen) {
              dropdown.classList.remove('open');
              trigger.classList.remove('open');
            } else {
              const triggerRect = trigger.getBoundingClientRect();
              const viewportHeight = window.innerHeight;
              const dropdownHeight = 200; // max-height из CSS

              dropdown.style.position = 'fixed';
              dropdown.style.left = triggerRect.left + 'px';
              dropdown.style.width = triggerRect.width + 'px';

              if (triggerRect.bottom + dropdownHeight > viewportHeight && triggerRect.top > dropdownHeight) {
                dropdown.style.top = (triggerRect.top - dropdownHeight - 2) + 'px';
                dropdown.style.maxHeight = Math.min(dropdownHeight, triggerRect.top - 10) + 'px';
              } else {
                dropdown.style.top = (triggerRect.bottom + 2) + 'px';
                dropdown.style.maxHeight = Math.min(dropdownHeight, viewportHeight - triggerRect.bottom - 10) + 'px';
              }

              dropdown.classList.add('open');
              trigger.classList.add('open');
            }
          });

          document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
              dropdown.classList.remove('open');
              trigger.classList.remove('open');
            }
          });

          const updatePosition = () => {
            if (dropdown.classList.contains('open')) {
              const triggerRect = trigger.getBoundingClientRect();
              const viewportHeight = window.innerHeight;
              const dropdownHeight = 200;

              dropdown.style.left = triggerRect.left + 'px';
              dropdown.style.width = triggerRect.width + 'px';

              if (triggerRect.bottom + dropdownHeight > viewportHeight && triggerRect.top > dropdownHeight) {
                dropdown.style.top = (triggerRect.top - dropdownHeight - 2) + 'px';
                dropdown.style.maxHeight = Math.min(dropdownHeight, triggerRect.top - 10) + 'px';
              } else {
                dropdown.style.top = (triggerRect.bottom + 2) + 'px';
                dropdown.style.maxHeight = Math.min(dropdownHeight, viewportHeight - triggerRect.bottom - 10) + 'px';
              }
            }
          };

          window.addEventListener('resize', updatePosition);
          window.addEventListener('scroll', updatePosition, true);

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
              case 'ArrowUp':
                e.preventDefault();
                if (!dropdown.classList.contains('open')) {
                  dropdown.classList.add('open');
                  trigger.classList.add('open');
                }
                break;
            }
          });
        }

        updateDisplayValue(originalSelect, valueSpan) {
          const selectedOption = originalSelect.options[originalSelect.selectedIndex];

          if (selectedOption) {
            valueSpan.textContent = selectedOption.textContent || selectedOption.value;
            valueSpan.classList.remove('custom-select-placeholder');
          } else {
            valueSpan.textContent = 'Выберите опцию...';
            valueSpan.classList.add('custom-select-placeholder');
          }
        }

        setupMutationObserver() {
          this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const element = node;

                  if (element.tagName === 'SELECT' && !element.classList.contains('original-select-hidden')) {
                    this.replaceSelect(element);
                  }

                  const selects = element.querySelectorAll?.('select:not(.original-select-hidden)');
                  selects?.forEach((select) => {
                    this.replaceSelect(select);
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
      }

      const injector = new CustomSelectInjector();
      injector.init();
    `;
  }

  /**
   * Инжектит кастомные select элементы
   */
  public injectCustomSelects(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.webview) {
        reject(new Error('WebView not available'));
        return;
      }

      const script = `
        (function() {
          try {
            ${ScriptInjectionManager.getCustomSelectScript()}
            console.log('[ScriptInjectionManager] Custom selects injected successfully');
            return true;
          } catch (error) {
            console.error('[ScriptInjectionManager] Custom select injection failed:', error);
            return false;
          }
        })();
      `;

      this.webview
        .executeJavaScript(script)
        .then((result: boolean) => {
          if (result) {
            resolve();
          } else {
            reject(new Error('Custom select injection failed'));
          }
          return undefined;
        })
        .catch((error: Error) => {
          log.warn('Custom select injection timeout or error:', error);
          reject(error);
        });
    });
  }

  /**
   * Destroy manager and cleanup
   */
  public destroy(): void {
    log.debug('Destroying manager...');
    this.clearCallbacks();
    this.webview = null;
    this.isInjecting = false;
    this.retryCount = 0;
    log.debug('Manager destroyed');
  }
}

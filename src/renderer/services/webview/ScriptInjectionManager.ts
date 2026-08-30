import { createLogger } from '../../../shared/logger';
import { getCustomSelectScript } from '../../scripts/customSelectInjector';

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

  private pendingDomReadyCleanup: (() => void) | null = null;

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

    this.cancelPendingDomReady();
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
   * Снимает подписку на dom-ready и таймаут ожидания
   */
  private cancelPendingDomReady(): void {
    this.pendingDomReadyCleanup?.();
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

      const { webview } = this;
      let timeoutId: ReturnType<typeof setTimeout>;

      const handleDomReady = () => {
        log.debug('DOM ready event fired');
        this.cancelPendingDomReady();
        resolve();
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        webview.removeEventListener('dom-ready', handleDomReady);
        this.pendingDomReadyCleanup = null;
      };

      timeoutId = setTimeout(() => {
        log.debug('DOM ready timeout, resolving anyway');
        this.cancelPendingDomReady();
        resolve();
      }, 5000);

      webview.addEventListener('dom-ready', handleDomReady);
      this.pendingDomReadyCleanup = cleanup;
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
   * Инжектит кастомные select элементы
   */
  public injectCustomSelects(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.webview) {
        reject(new Error('WebView not available'));
        return;
      }

      this.webview
        .executeJavaScript(getCustomSelectScript())
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
    this.cancelPendingDomReady();
    this.clearCallbacks();
    this.webview = null;
    this.isInjecting = false;
    this.retryCount = 0;
    log.debug('Manager destroyed');
  }
}

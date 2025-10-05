/* eslint-disable no-console */
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
 *   console.log('Injecting scripts...');
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
      console.error('[ScriptInjectionManager] Cannot attach null webview');
      return;
    }

    this.webview = webview;
    console.log('[ScriptInjectionManager] WebView attached');
  }

  /**
   * Register injection callback
   */
  public registerCallback(callback: InjectionCallback): void {
    if (!this.injectionCallbacks.includes(callback)) {
      this.injectionCallbacks.push(callback);
      console.log(
        '[ScriptInjectionManager] Callback registered, total:',
        this.injectionCallbacks.length,
      );
    }
  }

  /**
   * Unregister injection callback
   */
  public unregisterCallback(callback: InjectionCallback): void {
    const index = this.injectionCallbacks.indexOf(callback);
    if (index !== -1) {
      this.injectionCallbacks.splice(index, 1);
      console.log(
        '[ScriptInjectionManager] Callback unregistered, remaining:',
        this.injectionCallbacks.length,
      );
    }
  }

  /**
   * Clear all callbacks
   */
  public clearCallbacks(): void {
    this.injectionCallbacks = [];
    console.log('[ScriptInjectionManager] All callbacks cleared');
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
        console.error('[ScriptInjectionManager] No webview attached');
        resolve();
        return;
      }

      const handleDomReady = () => {
        console.log('[ScriptInjectionManager] DOM ready event fired');
        resolve();
      };

      // Listen for dom-ready event
      this.webview.addEventListener('dom-ready', handleDomReady, {
        once: true,
      });

      // Fallback timeout
      setTimeout(() => {
        console.log(
          '[ScriptInjectionManager] DOM ready timeout, resolving anyway',
        );
        resolve();
      }, 5000);
    });
  }

  /**
   * Execute all registered callbacks
   */
  private executeCallbacks(): void {
    if (this.injectionCallbacks.length === 0) {
      console.log('[ScriptInjectionManager] No callbacks to execute');
      return;
    }

    console.log(
      '[ScriptInjectionManager] Executing',
      this.injectionCallbacks.length,
      'callbacks',
    );

    this.injectionCallbacks.forEach((callback, index) => {
      try {
        console.log('[ScriptInjectionManager] Executing callback', index + 1);
        callback();
      } catch (error) {
        console.error(
          '[ScriptInjectionManager] Error executing callback',
          index + 1,
          ':',
          error,
        );
      }
    });
  }

  /**
   * Inject scripts with retry logic
   */
  public async inject(): Promise<void> {
    if (this.isInjecting) {
      console.log('[ScriptInjectionManager] Injection already in progress');
      return;
    }

    if (!this.webview) {
      console.error(
        '[ScriptInjectionManager] No webview attached for injection',
      );
      return;
    }

    this.isInjecting = true;
    console.log('[ScriptInjectionManager] Starting injection process...');

    try {
      // Wait for DOM if configured
      if (this.config.waitForDomReady) {
        console.log('[ScriptInjectionManager] Waiting for DOM to be ready...');
        await this.waitForDomReady();
      }

      // Execute callbacks
      this.executeCallbacks();

      // Reset retry count on success
      this.retryCount = 0;
      console.log('[ScriptInjectionManager] Injection completed successfully');
    } catch (error) {
      console.error('[ScriptInjectionManager] Injection error:', error);

      // Retry logic
      if (this.retryCount < this.config.maxRetries) {
        this.retryCount += 1;
        console.log(
          `[ScriptInjectionManager] Retrying injection (${this.retryCount}/${this.config.maxRetries})...`,
        );

        setTimeout(() => {
          this.isInjecting = false;
          this.inject();
        }, this.config.retryDelay);
      } else {
        console.error(
          '[ScriptInjectionManager] Max retries reached, giving up',
        );
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
    console.log('[ScriptInjectionManager] State reset');
  }
}

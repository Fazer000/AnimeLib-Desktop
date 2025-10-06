/* eslint-disable no-console */
/**
 * WebViewManager - Manages webview navigation, URL tracking, and state
 *
 * Responsibilities:
 * - WebView navigation (back, forward, reload)
 * - URL tracking and persistence
 * - Navigation state management (canGoBack, canGoForward)
 * - Event handling and callbacks
 *
 * @example
 * ```typescript
 * const manager = new WebViewManager(webviewElement);
 *
 * manager.subscribe({
 *   onNavigationStateChange: (canGoBack, canGoForward) => {
 *     setCanGoBack(canGoBack);
 *     setCanGoForward(canGoForward);
 *   },
 *   onUrlChange: (url) => {
 *     setCurrentUrl(url);
 *   }
 * });
 *
 * manager.goBack();
 * manager.goForward();
 * manager.reload();
 * ```
 */

export interface NavigationState {
  canGoBack: boolean;
  canGoForward: boolean;
  currentUrl: string;
}

export interface WebViewCallbacks {
  onNavigationStateChange?: (canGoBack: boolean, canGoForward: boolean) => void;
  onUrlChange?: (url: string) => void;
  onLoadStart?: (url: string) => void;
  onLoadStop?: (url: string) => void;
  onError?: (error: any) => void;
}

export class WebViewManager {
  private webview: any;

  private callbacks: WebViewCallbacks = {};

  private currentUrl: string = '';

  private isInitialized: boolean = false;

  constructor(webview?: any) {
    if (webview) {
      this.attachWebView(webview);
    }
  }

  /**
   * Attach webview element and initialize event listeners
   */
  public attachWebView(webview: any): void {
    if (!webview) {
      console.error('[WebViewManager] Cannot attach null webview');
      return;
    }

    this.webview = webview;
    this.isInitialized = true;
    console.log('[WebViewManager] WebView attached');

    // Inject CSS for better rendering quality when DOM is ready
    webview.addEventListener('dom-ready', () => {
      this.injectRenderingImprovements();
    });

    // Don't update state immediately - wait for dom-ready
    // State will be updated when navigation events occur
  }

  /**
   * Inject CSS and settings for better rendering quality
   */
  private injectRenderingImprovements(): void {
    if (!this.isReady()) {
      return;
    }

    const css = `

    `;

    try {
      this.webview.insertCSS(css);
      console.log('[WebViewManager] Rendering improvements injected');
    } catch (error) {
      console.error(
        '[WebViewManager] Error injecting rendering improvements:',
        error,
      );
    }
  }

  /**
   * Detach webview and cleanup
   */
  public detach(): void {
    this.webview = null;
    this.isInitialized = false;
    console.log('[WebViewManager] WebView detached');
  }

  /**
   * Subscribe to webview events
   */
  public subscribe(callbacks: WebViewCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Check if webview is ready
   */
  public isReady(): boolean {
    if (!this.isInitialized || !this.webview) {
      return false;
    }

    // Check if webview is attached to DOM and ready
    try {
      if (this.webview.getWebContentsId) {
        this.webview.getWebContentsId();
        return true;
      }
    } catch {
      // WebView not ready yet
      return false;
    }

    return false;
  }

  /**
   * Get current navigation state
   */
  public getNavigationState(): NavigationState {
    if (!this.isReady()) {
      return {
        canGoBack: false,
        canGoForward: false,
        currentUrl: this.currentUrl,
      };
    }

    try {
      const canGoBack = this.webview.canGoBack();
      const canGoForward = this.webview.canGoForward();

      return {
        canGoBack,
        canGoForward,
        currentUrl: this.currentUrl,
      };
    } catch (error) {
      console.error('[WebViewManager] Error getting navigation state:', error);
      return {
        canGoBack: false,
        canGoForward: false,
        currentUrl: this.currentUrl,
      };
    }
  }

  /**
   * Update navigation state and notify callbacks
   */
  public updateNavigationState(): void {
    if (!this.isReady()) {
      console.log(
        '[WebViewManager] WebView not ready yet, skipping state update',
      );
      return;
    }

    const state = this.getNavigationState();

    if (this.callbacks.onNavigationStateChange) {
      this.callbacks.onNavigationStateChange(
        state.canGoBack,
        state.canGoForward,
      );
    }
  }

  /**
   * Navigate back
   */
  public goBack(): boolean {
    if (!this.isReady()) {
      console.warn('[WebViewManager] Cannot go back, webview not ready');
      return false;
    }

    try {
      if (this.webview.canGoBack()) {
        this.webview.goBack();
        // State will be updated by navigation event
        setTimeout(() => this.updateNavigationState(), 100);
        return true;
      }
    } catch (error) {
      console.error('[WebViewManager] Error in goBack:', error);
    }

    return false;
  }

  /**
   * Navigate forward
   */
  public goForward(): boolean {
    if (!this.isReady()) {
      console.warn('[WebViewManager] Cannot go forward, webview not ready');
      return false;
    }

    try {
      if (this.webview.canGoForward()) {
        this.webview.goForward();
        // State will be updated by navigation event
        setTimeout(() => this.updateNavigationState(), 100);
        return true;
      }
    } catch (error) {
      console.error('[WebViewManager] Error in goForward:', error);
    }

    return false;
  }

  /**
   * Reload current page
   */
  public reload(): void {
    if (!this.isReady()) {
      console.warn('[WebViewManager] Cannot reload, webview not ready');
      return;
    }

    try {
      this.webview.reload();
      console.log('[WebViewManager] Reloading webview');
    } catch (error) {
      console.error('[WebViewManager] Error reloading:', error);
    }
  }

  /**
   * Navigate to URL
   */
  public navigateTo(url: string): void {
    if (!this.isReady()) {
      console.error('[WebViewManager] Cannot navigate, webview not ready');
      return;
    }

    if (!url.trim()) {
      console.error('[WebViewManager] Cannot navigate to empty URL');
      return;
    }

    try {
      console.log('[WebViewManager] Navigating to:', url);
      this.webview.src = url;
      this.currentUrl = url;

      if (this.callbacks.onUrlChange) {
        this.callbacks.onUrlChange(url);
      }
    } catch (error) {
      console.error('[WebViewManager] Error navigating to URL:', error);
    }
  }

  /**
   * Navigate to home URL (from localStorage)
   */
  public navigateToHome(): void {
    const homeUrl = WebViewManager.getHomeUrl();
    if (homeUrl) {
      console.log('[WebViewManager] Navigating to home URL:', homeUrl);
      this.navigateTo(homeUrl);
    } else {
      console.warn('[WebViewManager] No home URL found in localStorage');
    }
  }

  /**
   * Get home URL from localStorage
   */
  public static getHomeUrl(): string | null {
    try {
      return localStorage.getItem('animeLibUrl');
    } catch (error) {
      console.error('[WebViewManager] Error reading home URL:', error);
      return null;
    }
  }

  /**
   * Save URL to localStorage
   */
  public static saveUrl(url: string, isFullUrl: boolean = false): void {
    try {
      if (isFullUrl) {
        // Save full URL for current page tracking
        localStorage.setItem('animeLibCurrentPage', url);
        console.log('[WebViewManager] Full URL saved:', url);
      } else {
        // Save clean domain URL
        const urlObj = new URL(url);
        const cleanUrl = `${urlObj.protocol}//${urlObj.host}/`;
        localStorage.setItem('animeLibUrl', cleanUrl);
        console.log('[WebViewManager] Clean URL saved:', cleanUrl);
      }
    } catch (error) {
      console.error('[WebViewManager] Error saving URL:', error);
    }
  }

  /**
   * Get current URL from webview
   */
  public getCurrentUrl(): string {
    if (!this.isReady()) return this.currentUrl;
    return this.webview.src || this.currentUrl;
  }

  /**
   * Execute JavaScript in webview
   */
  public async executeScript(script: string): Promise<any> {
    if (!this.isReady()) {
      throw new Error('WebView not ready');
    }

    if (!this.webview.executeJavaScript) {
      throw new Error('executeJavaScript not available');
    }

    return this.webview.executeJavaScript(script);
  }

  /**
   * Get WebContents ID
   */
  public getWebContentsId(): number | null {
    if (!this.isReady()) return null;

    try {
      return this.webview.getWebContentsId();
    } catch {
      return null;
    }
  }

  /**
   * Check if DOM is ready
   */
  public isDomReady(): boolean {
    return this.getWebContentsId() !== null;
  }

  /**
   * Handle navigation event
   */
  public handleNavigation(url: string): void {
    console.log('[WebViewManager] Navigation event:', url);
    this.currentUrl = url;

    // Save both full and clean URLs
    WebViewManager.saveUrl(url, true); // Full URL
    WebViewManager.saveUrl(url, false); // Clean domain

    this.updateNavigationState();

    if (this.callbacks.onUrlChange) {
      this.callbacks.onUrlChange(url);
    }
  }

  /**
   * Handle load stop event
   */
  public handleLoadStop(): void {
    const url = this.getCurrentUrl();
    console.log('[WebViewManager] Load stop:', url);

    WebViewManager.saveUrl(url, true);
    this.updateNavigationState();

    if (this.callbacks.onLoadStop) {
      this.callbacks.onLoadStop(url);
    }
  }

  /**
   * Handle error event
   */
  public handleError(error: any): void {
    console.error('[WebViewManager] Error:', error);

    if (this.callbacks.onError) {
      this.callbacks.onError(error);
    }
  }

  /**
   * Get webview reference
   */
  public getWebView(): any {
    return this.webview;
  }
}

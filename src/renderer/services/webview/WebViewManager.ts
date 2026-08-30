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

import {
  getHomeUrl as getSiteHomeUrl,
  isSiteUrl,
  saveSiteUrl,
} from '../../utils/urlHelpers';
import { NavigationHistoryTracker } from './NavigationHistoryTracker';
import type { NavigationSource } from './NavigationHistoryTracker';

import { createLogger } from '../../../shared/logger';

const log = createLogger('WebViewManager');

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

  private pendingHistoryResetUrl: string | null = null;

  private historyResetArmed: boolean = false;

  private domReadyListener: (() => void) | null = null;

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
      log.error('Cannot attach null webview');
      return;
    }

    this.detachDomReadyListener();

    this.webview = webview;
    this.isInitialized = true;
    log.debug('WebView attached');

    this.domReadyListener = () => this.injectRenderingImprovements();
    webview.addEventListener('dom-ready', this.domReadyListener);
  }

  /**
   * Снимает подписку на dom-ready текущего webview
   */
  private detachDomReadyListener(): void {
    if (this.webview && this.domReadyListener) {
      this.webview.removeEventListener('dom-ready', this.domReadyListener);
    }
    this.domReadyListener = null;
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
      log.debug('Rendering improvements injected');
    } catch (error) {
      log.error('Error injecting rendering improvements:', error);
    }
  }

  /**
   * Detach webview and cleanup
   */
  public detach(): void {
    this.detachDomReadyListener();
    this.webview = null;
    this.isInitialized = false;
    this.pendingHistoryResetUrl = null;
    this.historyResetArmed = false;
    log.debug('WebView detached');
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
      log.error('Error getting navigation state:', error);
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
      log.debug('WebView not ready yet, skipping state update');
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
      log.warn('Cannot go back, webview not ready');
      return false;
    }

    try {
      if (this.webview.canGoBack()) {
        NavigationHistoryTracker.record({
          source: 'back',
          url: this.getCurrentUrl(),
        });
        this.webview.goBack();
        setTimeout(() => this.updateNavigationState(), 100);
        return true;
      }
    } catch (error) {
      log.error('Error in goBack:', error);
    }

    return false;
  }

  /**
   * Navigate forward
   */
  public goForward(): boolean {
    if (!this.isReady()) {
      log.warn('Cannot go forward, webview not ready');
      return false;
    }

    try {
      if (this.webview.canGoForward()) {
        NavigationHistoryTracker.record({
          source: 'forward',
          url: this.getCurrentUrl(),
        });
        this.webview.goForward();
        setTimeout(() => this.updateNavigationState(), 100);
        return true;
      }
    } catch (error) {
      log.error('Error in goForward:', error);
    }

    return false;
  }

  /**
   * Reload current page
   */
  public reload(): void {
    if (!this.isReady()) {
      log.warn('Cannot reload, webview not ready');
      return;
    }

    try {
      NavigationHistoryTracker.record({
        source: 'reload',
        url: this.getCurrentUrl(),
      });
      this.webview.reload();
      log.debug('Reloading webview');
    } catch (error) {
      log.error('Error reloading:', error);
    }
  }

  /**
   * Navigate to URL
   */
  public navigateTo(url: string): void {
    if (!this.isReady()) {
      log.error('Cannot navigate, webview not ready');
      return;
    }

    if (!url.trim()) {
      log.error('Cannot navigate to empty URL');
      return;
    }

    try {
      log.debug('Navigating to:', url);
      this.webview.src = url;
      this.currentUrl = url;

      if (this.callbacks.onUrlChange) {
        this.callbacks.onUrlChange(url);
      }
    } catch (error) {
      log.error('Error navigating to URL:', error);
    }
  }

  /**
   * Переходит на главную и сбрасывает историю переходов
   */
  public navigateToHome(): void {
    const homeUrl = WebViewManager.getHomeUrl();
    log.debug('Navigating to home URL:', homeUrl);

    if (this.getCurrentUrl() === homeUrl) {
      this.clearHistory();
      this.updateNavigationState();
      return;
    }

    this.pendingHistoryResetUrl = homeUrl;
    this.historyResetArmed = false;
    this.navigateTo(homeUrl);
  }

  /**
   * Очищает историю переходов webview
   */
  public clearHistory(): void {
    if (!this.isReady()) {
      return;
    }

    try {
      this.webview.clearHistory();
      NavigationHistoryTracker.record({
        source: 'home-reset',
        url: this.getCurrentUrl(),
      });
      log.debug('Navigation history cleared');
    } catch (error) {
      log.error('Error clearing history:', error);
    }
  }

  /**
   * Управляет звуком webview
   */
  public setAudioMuted(muted: boolean): void {
    if (!this.isReady()) {
      return;
    }

    try {
      this.webview.setAudioMuted(muted);
    } catch (error) {
      log.error('Error setting audio muted:', error);
    }
  }

  /**
   * Get base site URL
   */
  public static getHomeUrl(): string {
    return getSiteHomeUrl();
  }

  /**
   * Save URL to localStorage; base URL updates only for site domains
   */
  public static saveUrl(url: string, isFullUrl: boolean = false): void {
    try {
      if (isFullUrl) {
        localStorage.setItem('animeLibCurrentPage', url);
        log.debug('Full URL saved:', url);
        return;
      }

      if (!isSiteUrl(url)) {
        log.debug('Base URL not updated, foreign domain:', url);
        return;
      }

      const baseUrl = saveSiteUrl(url);
      log.debug('Base URL saved:', baseUrl);
    } catch (error) {
      log.error('Error saving URL:', error);
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
   * Возвращает последний URL из событий навигации
   */
  public getTrackedUrl(): string {
    return this.currentUrl;
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
  public handleNavigation(
    url: string,
    source: NavigationSource = 'navigate',
  ): void {
    log.debug('Navigation event:', url);
    this.currentUrl = url;

    WebViewManager.saveUrl(url, true);
    WebViewManager.saveUrl(url, false);

    if (
      this.pendingHistoryResetUrl !== null &&
      url === this.pendingHistoryResetUrl
    ) {
      this.pendingHistoryResetUrl = null;
      this.historyResetArmed = true;
      log.debug('History reset armed for:', url);
    }

    this.updateNavigationState();

    const state = this.getNavigationState();
    NavigationHistoryTracker.record({
      source,
      url,
      canGoBack: state.canGoBack,
      canGoForward: state.canGoForward,
    });

    if (this.callbacks.onUrlChange) {
      this.callbacks.onUrlChange(url);
    }
  }

  /**
   * Handle load stop event
   */
  public handleLoadStop(): void {
    const url = this.getCurrentUrl();
    log.debug('Load stop:', url);

    WebViewManager.saveUrl(url, true);

    if (this.historyResetArmed) {
      this.historyResetArmed = false;
      this.clearHistory();
    }

    this.updateNavigationState();

    if (this.callbacks.onLoadStop) {
      this.callbacks.onLoadStop(url);
    }
  }

  /**
   * Handle error event
   */
  public handleError(error: any): void {
    log.error('Error:', error);

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

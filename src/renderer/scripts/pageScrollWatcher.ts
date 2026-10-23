/**
 * Прокрутка страницы сайта и место его «Мини чата» для кнопки «наверх»
 */
import type { RectLike } from '../utils/pointInRect';

import { createLogger } from '../../shared/logger';

const log = createLogger('PageScroll');

/** Префикс сообщения, которым гостевая страница сообщает о прокрутке. */
export const PAGE_SCROLL_MARKER = '[animelib-scroll]';

export interface PageScrollState {
  scrolled: boolean;
  width: number;
  height: number;
  chat: RectLike | null;
}

interface ScriptHost {
  executeJavaScript?: (code: string) => Promise<unknown>;
}

/** Скрипт наблюдателя за прокруткой страницы */
export function buildPageScrollWatcherScript(threshold: number): string {
  return `
(function () {
  try {
    if (window.__animeLibScrollWatcher) {
      window.__animeLibScrollWatcher();
      return true;
    }

    var last = '';
    var pending = false;

    var isShown = function (el) {
      return el && getComputedStyle(el).display !== 'none';
    };

    var chatRect = function () {
      var wrap = document.querySelector('.chat-wrap');
      if (!isShown(wrap)) return null;

      var dock = wrap.querySelector('.chat-dock');
      var rect = (isShown(dock) ? dock : wrap).getBoundingClientRect();
      if (!rect.width || !rect.height) return null;

      return {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
      };
    };

    var report = function () {
      pending = false;
      var state = JSON.stringify({
        scrolled: window.scrollY > ${threshold},
        width: window.innerWidth,
        height: window.innerHeight,
        chat: chatRect(),
      });
      if (state === last) return;
      last = state;
      console.info('${PAGE_SCROLL_MARKER}' + state);
    };

    var schedule = function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(report);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    new MutationObserver(schedule).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    window.__animeLibScrollWatcher = function () {
      last = '';
      schedule();
    };

    schedule();
    return true;
  } catch (e) {
    return false;
  }
})();
`;
}

/** Плавно прокручивает страницу сайта к началу. */
export const scrollPageToTopScript = `
(function () {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  return true;
})();
`;

/**
 * Проверяет, что значение похоже на прямоугольник с числовыми краями
 */
function isRect(value: unknown): value is RectLike {
  if (!value || typeof value !== 'object') return false;

  const rect = value as Record<string, unknown>;

  return ['left', 'top', 'right', 'bottom'].every((key) =>
    Number.isFinite(rect[key]),
  );
}

/** Достаёт состояние прокрутки из сообщения гостевой страницы. */
export function parsePageScrollMessage(
  message: unknown,
): PageScrollState | null {
  if (typeof message !== 'string') return null;
  if (!message.startsWith(PAGE_SCROLL_MARKER)) return null;

  try {
    const data = JSON.parse(message.slice(PAGE_SCROLL_MARKER.length));

    if (
      typeof data?.scrolled !== 'boolean' ||
      !Number.isFinite(data.width) ||
      !Number.isFinite(data.height)
    ) {
      return null;
    }

    return {
      scrolled: data.scrolled,
      width: data.width,
      height: data.height,
      chat: isRect(data.chat) ? data.chat : null,
    };
  } catch {
    return null;
  }
}

/** Ставит наблюдателя за прокруткой в гостевой странице. */
export function installPageScrollWatcher(
  webview: ScriptHost,
  threshold: number,
): Promise<boolean> {
  if (!webview?.executeJavaScript) return Promise.resolve(false);

  return webview
    .executeJavaScript(buildPageScrollWatcherScript(threshold))
    .then((value) => value === true)
    .catch((error) => {
      log.warn('Не удалось поставить наблюдателя прокрутки', error);

      return false;
    });
}

/** Прокручивает страницу сайта в webview к началу. */
export function scrollPageToTop(webview: ScriptHost): Promise<boolean> {
  if (!webview?.executeJavaScript) return Promise.resolve(false);

  return webview
    .executeJavaScript(scrollPageToTopScript)
    .then((value) => value === true)
    .catch((error) => {
      log.warn('Не удалось прокрутить страницу', error);

      return false;
    });
}

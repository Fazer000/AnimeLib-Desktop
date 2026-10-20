import { LIB_API_URL, LIB_SITES, LibSite } from '../../constants';
import { buildTitleAction } from '../utils/titleAction';

interface TitleActionConfig {
  apiUrl: string;
  sites: LibSite[];
}

/**
 * Заменяет кнопку «Лицензирован» на странице тайтла кнопкой «Начать /
 * Продолжить» со счётчиком, как у доступных тайтлов. На AnimeLib кнопка
 * открывает плеер приложения, на остальных сайтах — главу в читалке сайта.
 * Выполняется в странице, поэтому самодостаточна; модель кнопки приходит
 * параметром
 */
export function titleActionButtonMain(
  config: TitleActionConfig,
  build: typeof buildTitleAction,
): void {
  const state = window as unknown as { libTitleActionScan?: () => void };
  if (state.libTitleActionScan) {
    state.libTitleActionScan();
    return;
  }

  const host = window.location.hostname;
  const site = config.sites.find((item) =>
    item.hosts.some((domain) => host === domain || host.endsWith(`.${domain}`)),
  );
  if (!site) return;

  const LICENSED = 'Лицензирован';
  const MARK = 'data-lib-title-action';
  const watch = site.kind === 'anime';
  const cache = new Map<string, Promise<ReturnType<typeof build>>>();

  const style = document.createElement('style');
  style.textContent = `
    [${MARK}] { gap: 8px; }
    [${MARK}] .lib-title-action-label { flex: 1; text-align: left; }
    [${MARK}] .lib-title-action-counter { opacity: 0.85; font-size: 12px; }
    [${MARK}][disabled] {
      cursor: default;
      opacity: 0.7;
      justify-content: center;
    }
    [${MARK}][disabled] .lib-title-action-label { flex: none; }
  `;
  document.head.appendChild(style);

  const token = (): string | null => {
    try {
      const auth = JSON.parse(localStorage.getItem('auth') || 'null');
      return auth?.token?.access_token || null;
    } catch {
      return null;
    }
  };

  const api = async (path: string) => {
    const headers: Record<string, string> = {
      'Site-Id': String(site.siteId),
      Accept: 'application/json',
    };
    const bearer = token();
    if (bearer) headers.Authorization = `Bearer ${bearer}`;

    const response = await fetch(`${config.apiUrl}${path}`, { headers });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`API ${response.status}`);
    return (await response.json()).data;
  };

  const currentSlug = (): string | null => {
    const match = /^\/ru\/(?:anime|manga|book)\/([^/?#]+)/.exec(
      window.location.pathname,
    );
    return match ? decodeURIComponent(match[1]) : null;
  };

  const loadModel = (slug: string) => {
    const known = cache.get(slug);
    if (known) return known;

    const items = watch
      ? api(`/episodes?anime_id=${slug}`)
      : api(`/manga/${slug}/chapters`);
    const bookmark = token()
      ? api(`/${watch ? 'anime' : 'manga'}/${slug}/bookmark`).catch(() => null)
      : Promise.resolve(null);

    const model = Promise.all([items, bookmark]).then(([list, mark]) =>
      build({
        watch,
        slug,
        items: Array.isArray(list) ? list : [],
        bookmarkItemId: mark?.item_id ?? null,
      }),
    );
    model.catch(() => cache.delete(slug));
    cache.set(slug, model);
    return model;
  };

  const openPlayer = () => {
    const url = window.location.href;
    window.parent.postMessage({ type: 'player-button-clicked', url }, '*');
    window.location.href = `anime-lib-player://${encodeURIComponent(url)}`;
  };

  const render = (
    button: HTMLElement,
    slug: string,
    model: ReturnType<typeof build>,
  ) => {
    const icon = button.querySelector('svg');
    const label = document.createElement('span');
    label.className = 'lib-title-action-label';
    label.textContent = model.label;

    const nodes: Node[] = [label];
    if (icon) nodes.unshift(icon);
    if (model.counter) {
      const counter = document.createElement('span');
      counter.className = 'lib-title-action-counter';
      counter.textContent = model.counter;
      nodes.push(counter);
    }
    button.replaceChildren(...nodes);
    button.setAttribute(MARK, slug);

    if (model.available) {
      button.classList.remove('variant-default');
      button.classList.add('is-filled', 'variant-primary');
      button.removeAttribute('disabled');
    } else {
      button.setAttribute('disabled', 'true');
    }

    // eslint-disable-next-line no-param-reassign
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!model.available || !model.href) return;

      if (watch) openPlayer();
      else window.location.assign(model.href);
    };
  };

  const scan = () => {
    const slug = currentSlug();
    if (!slug) return;

    document.querySelectorAll<HTMLElement>('button.btn').forEach((button) => {
      const licensed = button.textContent?.trim() === LICENSED;
      const stale =
        button.hasAttribute(MARK) && button.getAttribute(MARK) !== slug;
      if (!licensed && !stale) return;

      button.setAttribute(MARK, slug);
      loadModel(slug)
        .then((model) => {
          if (currentSlug() === slug) render(button, slug, model);
          return model;
        })
        .catch(() => button.removeAttribute(MARK));
    });
  };

  let timer: ReturnType<typeof setTimeout> | null = null;
  new MutationObserver(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(scan, 150);
  }).observe(document.body, { childList: true, subtree: true });

  state.libTitleActionScan = scan;
  scan();
}

/**
 * Скрипт для executeJavaScript: внедряет замену кнопки в страницу сайта
 */
export function getTitleActionScript(): string {
  const config: TitleActionConfig = { apiUrl: LIB_API_URL, sites: LIB_SITES };

  return `(function () {
  try {
    (${titleActionButtonMain.toString()})(${JSON.stringify(config)}, ${buildTitleAction.toString()});
    return true;
  } catch (error) {
    console.error('[TitleAction] injection failed:', error);
    return false;
  }
})();`;
}

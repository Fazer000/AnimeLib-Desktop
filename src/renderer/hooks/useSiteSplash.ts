import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { LIB_SITES } from '../../constants';
import SPLASH_TIMING from '../../constants/splash';
import { findLibSiteByUrl } from '../utils/libSites';
import { sitePageReadyScript } from '../scripts/sitePageReady';

/** Связывает заставку с навигацией и фактической готовностью страницы. */
export default function useSiteSplash(
  webviewRef: RefObject<any>,
  initialUrl: string,
) {
  const [site, setSite] = useState(
    findLibSiteByUrl(initialUrl) ?? LIB_SITES[0],
  );
  const [visible, setVisible] = useState(true);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return undefined;
    let generation = 0;
    let shownAt = Date.now();
    let streak = 0;
    let poll: ReturnType<typeof setTimeout> | undefined;
    let hint: ReturnType<typeof setTimeout> | undefined;
    let safety: ReturnType<typeof setTimeout> | undefined;
    let dismiss: ReturnType<typeof setTimeout> | undefined;
    const clear = () => {
      clearTimeout(poll);
      clearTimeout(hint);
      clearTimeout(safety);
      clearTimeout(dismiss);
    };
    const hide = () => {
      generation += 1;
      clear();
      dismiss = setTimeout(
        () => setVisible(false),
        Math.max(0, SPLASH_TIMING.entry - (Date.now() - shownAt)),
      );
    };
    const start = (event?: {
      isMainFrame?: boolean;
      isInPlace?: boolean;
      url?: string;
    }) => {
      if (event?.isMainFrame === false || event?.isInPlace) return;
      const nextSite = findLibSiteByUrl(event?.url ?? initialUrl);
      if (!nextSite) {
        hide();
        return;
      }
      generation += 1;
      clear();
      shownAt = Date.now();
      streak = 0;
      setSite(nextSite);
      setVisible(true);
      setSlow(false);
      hint = setTimeout(() => setSlow(true), SPLASH_TIMING.slowHint);
      safety = setTimeout(hide, SPLASH_TIMING.timeout);
    };
    const check = () => {
      clearTimeout(poll);
      const token = generation;
      webview
        .executeJavaScript(sitePageReadyScript)
        .then((ready: boolean) => {
          if (token !== generation) return undefined;
          streak = ready ? streak + 1 : 0;
          if (streak >= 2) hide();
          else poll = setTimeout(check, 120);
          return undefined;
        })
        .catch(() => {
          if (token === generation) poll = setTimeout(check, 200);
        });
    };
    const fail = (event: { isMainFrame?: boolean; errorCode?: number }) => {
      if (event.isMainFrame !== false && event.errorCode !== -3) hide();
    };
    start();
    webview.addEventListener('did-start-navigation', start);
    webview.addEventListener('did-finish-load', check);
    webview.addEventListener('did-fail-load', fail);
    return () => {
      generation += 1;
      clear();
      webview.removeEventListener('did-start-navigation', start);
      webview.removeEventListener('did-finish-load', check);
      webview.removeEventListener('did-fail-load', fail);
    };
  }, [webviewRef, initialUrl]);

  return { site, visible, slow };
}

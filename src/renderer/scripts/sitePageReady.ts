/** Проверяет, что сайт уже показал содержимое вместо пустой оболочки. */
export function sitePageReady(): boolean {
  if (document.readyState !== 'complete' || !document.body) return false;
  const { body } = document;
  const text = body.innerText?.trim() ?? body.textContent?.trim() ?? '';
  const placeholders = body.querySelectorAll(
    '[class*="skeleton"], [class*="preloader"], .is-loading',
  );
  const visiblePlaceholder = Array.from(placeholders).some((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  const content =
    text.length > 80 || body.querySelectorAll('a[href], img').length > 5;
  return Boolean(content && !visiblePlaceholder);
}

export const sitePageReadyScript = `(${sitePageReady.toString()})()`;

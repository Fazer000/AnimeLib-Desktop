/** Следит за курсором над зоной наведения в области перетаскивания окна и сообщает странице */
import { BrowserWindow, screen } from 'electron';
import { HOVER_ZONE_POLL_MS } from '../constants';
import { HoverZoneRect, isCursorInZone } from '../shared/hoverZone';

let zone: HoverZoneRect | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let inside = false;

/**
 * Задаёт зону для окна; null перестаёт следить
 */
export default function setHoverZone(
  window: BrowserWindow,
  nextZone: HoverZoneRect | null,
): void {
  zone = nextZone;

  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  if (!zone) {
    if (inside && !window.isDestroyed()) {
      window.webContents.send('hover-zone-changed', false);
    }
    inside = false;
    return;
  }

  timer = setInterval(() => {
    if (!zone || window.isDestroyed()) return;

    const now =
      window.isVisible() &&
      !window.isMinimized() &&
      isCursorInZone(
        screen.getCursorScreenPoint(),
        window.getContentBounds(),
        zone,
        window.webContents.getZoomFactor(),
      );

    if (now !== inside) {
      inside = now;
      window.webContents.send('hover-zone-changed', now);
    }
  }, HOVER_ZONE_POLL_MS);
}

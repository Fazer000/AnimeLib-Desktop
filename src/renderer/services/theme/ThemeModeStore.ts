import { createLogger } from '../../../shared/logger';
import {
  ColorSchemeName,
  DEFAULT_THEME_MODE,
  ThemeMode,
  normalizeThemeMode,
  resolveColorScheme,
} from '../../theme/themeMode';

const log = createLogger('ThemeMode');

export type ThemeModeListener = (
  scheme: ColorSchemeName,
  mode: ThemeMode,
) => void;

const STORAGE_KEY = 'animeLibThemeMode';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Общее состояние темы: режим сайта плюс системное предпочтение. */
export class ThemeModeStore {
  private mode: ThemeMode = DEFAULT_THEME_MODE;

  private prefersDark: boolean = true;

  private listeners = new Set<ThemeModeListener>();

  private media: MediaQueryList | null = null;

  constructor() {
    this.mode = ThemeModeStore.restore();
    this.watchSystemPreference();
  }

  /** Подписывает слушателя и сразу отдаёт функцию отписки. */
  subscribe(listener: ThemeModeListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Режим, выбранный на сайте. */
  getMode(): ThemeMode {
    return this.mode;
  }

  /** Схема после разрешения системного режима. */
  getScheme(): ColorSchemeName {
    return resolveColorScheme(this.mode, this.prefersDark);
  }

  /** Принимает режим от сайта, сохраняет его и оповещает подписчиков. */
  setMode(value: unknown): void {
    const next = normalizeThemeMode(value);
    if (next === this.mode) return;

    this.mode = next;
    ThemeModeStore.persist(next);
    this.notify();
  }

  private watchSystemPreference(): void {
    if (typeof window === 'undefined') return;
    if (typeof window.matchMedia !== 'function') return;

    this.media = window.matchMedia(DARK_QUERY);
    this.prefersDark = this.media.matches;

    const onChange = (event: MediaQueryListEvent) => {
      this.prefersDark = event.matches;
      if (this.mode === 'system') this.notify();
    };

    if (typeof this.media.addEventListener === 'function') {
      this.media.addEventListener('change', onChange);
    }
  }

  private notify(): void {
    const scheme = this.getScheme();
    this.listeners.forEach((listener) => listener(scheme, this.mode));
  }

  private static restore(): ThemeMode {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      return stored === null ? DEFAULT_THEME_MODE : normalizeThemeMode(stored);
    } catch (error) {
      log.warn('Не удалось прочитать сохранённый режим темы', error);

      return DEFAULT_THEME_MODE;
    }
  }

  private static persist(mode: ThemeMode): void {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (error) {
      log.warn('Не удалось сохранить режим темы', error);
    }
  }
}

export const themeModeStore = new ThemeModeStore();

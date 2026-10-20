import {
  AUTO_QUALITY_CEILING_MS,
  AUTO_QUALITY_GRACE_MS,
  AUTO_QUALITY_HIGH_BUFFER_MS,
  AUTO_QUALITY_HIGH_BUFFER_S,
  AUTO_QUALITY_LOW_BUFFER_MS,
  AUTO_QUALITY_LOW_BUFFER_S,
  AUTO_QUALITY_SIZE_SETTLE_MS,
  AUTO_QUALITY_SIZE_TOLERANCE,
  AUTO_QUALITY_STALL_MS,
  AUTO_QUALITY_SWITCH_COOLDOWN_MS,
} from '../../constants';

/** Почему «Авто» играет не самое высокое качество. */
export type AutoQualityReason = 'network' | 'size' | null;

/** Потолок после проблем с сетью: какое качество и до какого времени. */
export interface NetworkCeiling {
  height: number;
  until: number;
}

/** Состояние воспроизведения для очередного шага автоподбора. */
export interface AutoQualitySample {
  playing: boolean;
  buffering: boolean;
  bufferAhead: number;
}

/**
 * Высота кадра качества: «1080p» → 1080
 */
export function qualityHeight(value: string): number {
  return parseInt(value, 10) || 0;
}

/**
 * Сколько пикселей по высоте занимает кадр 16:9 в плеере такого размера
 */
export function playerPixelHeight(
  width: number,
  height: number,
  pixelRatio: number,
): number {
  return Math.round(Math.min(height, (width * 9) / 16) * pixelRatio);
}

/**
 * Потолок по размеру плеера: самое низкое качество, которого хватает на
 * высоту кадра с небольшим допуском; не хватает ни одного — самое высокое
 */
export function sizeCapHeight(pixelHeight: number, values: string[]): number {
  const heights = values.map(qualityHeight).sort((a, b) => a - b);
  const enough = heights.find(
    (height) => height >= pixelHeight * AUTO_QUALITY_SIZE_TOLERANCE,
  );

  return enough ?? heights[heights.length - 1] ?? 0;
}

/**
 * Самое высокое качество не выше предела; если все выше — самое низкое
 */
export function highestWithin(values: string[], limit: number): string {
  const sorted = [...values].sort(
    (a, b) => qualityHeight(b) - qualityHeight(a),
  );
  return (
    sorted.find((value) => qualityHeight(value) <= limit) ??
    sorted[sorted.length - 1]
  );
}

/**
 * Запомненный ручной выбор для серии: то же качество, иначе ближайшее ниже,
 * иначе самое низкое из доступных
 */
export function pickManualQuality(values: string[], preferred: string): string {
  if (values.includes(preferred)) return preferred;
  return highestWithin(values, qualityHeight(preferred));
}

/**
 * Автоподбор качества по буферу и размеру плеера. Время передаётся извне,
 * поэтому класс не зависит от таймеров и проверяется тестами.
 * Понижает, когда воспроизведение ждёт буфер или запас долго мал, и на
 * время не возвращается к качеству, где сеть не справилась. Повышает по
 * шагу, когда запас долго большой. Не берёт больше, чем нужно плееру
 */
export class AutoQualityPolicy {
  private readonly values: string[];

  private current = '';

  private cap = Infinity;

  private pendingCap: number | null = null;

  private pendingCapSince = 0;

  private ceiling: number | null = null;

  private ceilingUntil = 0;

  private lastSwitchAt = -Infinity;

  private graceUntil = 0;

  private stallSince: number | null = null;

  private lowSince: number | null = null;

  private highSince: number | null = null;

  /** Качество снижено под размер плеера: при увеличении сразу вернуть */
  private sizeLimited = false;

  constructor(values: string[], ceiling: NetworkCeiling | null = null) {
    this.values = [...values].sort(
      (a, b) => qualityHeight(b) - qualityHeight(a),
    );
    if (ceiling) {
      this.ceiling = ceiling.height;
      this.ceilingUntil = ceiling.until;
    }
  }

  /** Действующий потолок по сети, чтобы перенести его на следующую серию. */
  networkCeiling(now: number): NetworkCeiling | null {
    return this.ceilingActive(now)
      ? { height: this.ceiling!, until: this.ceilingUntil }
      : null;
  }

  /** Начальное качество под размер плеера. */
  initial(capHeight: number, now: number): string {
    this.cap = capHeight;
    this.current = highestWithin(this.values, this.limit(now));
    const networkBound = this.ceilingActive(now) && this.ceiling! < this.cap;
    this.sizeLimited =
      !networkBound &&
      qualityHeight(this.current) < qualityHeight(this.values[0] ?? '');
    return this.current;
  }

  /** Качество сменилось (автоматически или загрузкой источника). */
  noteSwitch(value: string, now: number): void {
    this.current = value;
    this.lastSwitchAt = now;
    this.noteSeek(now);
  }

  /** Перемотка: ожидание буфера после неё — не вина сети. */
  noteSeek(now: number): void {
    this.graceUntil = now + AUTO_QUALITY_GRACE_MS;
    this.stallSince = null;
    this.lowSince = null;
    this.highSince = null;
  }

  /** Новый потолок по размеру; применяется, когда размер устоится. */
  setCap(capHeight: number, now: number): void {
    if (capHeight === this.cap) {
      this.pendingCap = null;
      return;
    }
    if (capHeight !== this.pendingCap) {
      this.pendingCap = capHeight;
      this.pendingCapSince = now;
    }
  }

  /**
   * Почему играет не самое высокое качество: сеть недавно не справилась
   * или выше не нужно для размера плеера; ждёт повышения — без причины
   */
  reason(now: number): AutoQualityReason {
    const height = qualityHeight(this.current);
    const best = qualityHeight(this.values[0] ?? '');
    if (!this.current || height >= best) return null;
    if (this.ceilingActive(now) && this.ceiling! < this.cap) return 'network';

    const bySize = qualityHeight(highestWithin(this.values, this.cap));
    return bySize <= height ? 'size' : null;
  }

  /** Очередной шаг: качество, на которое переключиться, или null. */
  sample(state: AutoQualitySample, now: number): string | null {
    if (!this.current || this.values.length < 2) return null;

    if (
      this.pendingCap !== null &&
      now - this.pendingCapSince >= AUTO_QUALITY_SIZE_SETTLE_MS
    ) {
      this.cap = this.pendingCap;
      this.pendingCap = null;
    }

    const height = qualityHeight(this.current);
    const fit = highestWithin(this.values, this.limit(now));

    if (qualityHeight(fit) < height) {
      this.sizeLimited = this.cap < height;
      return fit;
    }

    if (this.sizeLimited && qualityHeight(fit) > height && !state.buffering) {
      this.sizeLimited = false;
      return fit;
    }

    if (now < this.graceUntil) return null;

    if (this.isStalled(state, now) || this.isStarving(state, now)) {
      const lower = this.values.find((value) => qualityHeight(value) < height);
      if (!lower) return null;

      this.sizeLimited = false;
      this.ceiling = qualityHeight(lower);
      this.ceilingUntil = now + AUTO_QUALITY_CEILING_MS;
      return lower;
    }

    if (qualityHeight(fit) > height && this.canStepUp(state, now)) {
      return [...this.values]
        .reverse()
        .find((value) => qualityHeight(value) > height)!;
    }

    return null;
  }

  private limit(now: number): number {
    return this.ceilingActive(now)
      ? Math.min(this.cap, this.ceiling!)
      : this.cap;
  }

  private ceilingActive(now: number): boolean {
    return this.ceiling !== null && now < this.ceilingUntil;
  }

  private isStalled(state: AutoQualitySample, now: number): boolean {
    if (!(state.playing && state.buffering)) {
      this.stallSince = null;
      return false;
    }
    this.stallSince ??= now;
    return now - this.stallSince >= AUTO_QUALITY_STALL_MS;
  }

  private isStarving(state: AutoQualitySample, now: number): boolean {
    const low =
      state.playing &&
      !state.buffering &&
      state.bufferAhead < AUTO_QUALITY_LOW_BUFFER_S;
    if (!low) {
      this.lowSince = null;
      return false;
    }
    this.lowSince ??= now;
    return now - this.lowSince >= AUTO_QUALITY_LOW_BUFFER_MS;
  }

  private canStepUp(state: AutoQualitySample, now: number): boolean {
    const healthy =
      state.playing &&
      !state.buffering &&
      state.bufferAhead >= AUTO_QUALITY_HIGH_BUFFER_S;
    if (!healthy) {
      this.highSince = null;
      return false;
    }
    this.highSince ??= now;
    return (
      now - this.highSince >= AUTO_QUALITY_HIGH_BUFFER_MS &&
      now - this.lastSwitchAt >= AUTO_QUALITY_SWITCH_COOLDOWN_MS
    );
  }
}

const REASON_TEXT: Record<Exclude<AutoQualityReason, null>, string> = {
  network: 'медленная сеть',
  size: 'под размер окна',
};

/**
 * Подпись под пунктом «Авто»: что играет сейчас и почему не выше
 */
export function autoQualityCaption(
  currentLabel: string,
  reason: AutoQualityReason,
): string {
  if (!currentLabel) return '';
  return reason
    ? `Сейчас ${currentLabel} · ${REASON_TEXT[reason]}`
    : `Сейчас ${currentLabel}`;
}

/**
 * Значение строки «Качество» в главном меню: «Авто · 1080p» или «720p»
 */
export function qualitySummary(auto: boolean, currentLabel: string): string {
  if (!auto) return currentLabel || '—';
  return currentLabel ? `Авто · ${currentLabel}` : 'Авто';
}

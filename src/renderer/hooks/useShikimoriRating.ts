import { useEffect, useState } from 'react';
import { shikimoriApi } from '../api/shikimoriApi';
import { parseShikimoriId } from '../utils/shikimoriFranchise';
import type { ShikimoriRating } from '../utils/shikimoriRating';
import LruCache from '../utils/LruCache';
import { SHIKIMORI_RATING_CACHE_LIMIT } from '../../constants';
import { createLogger } from '../../shared/logger';

const log = createLogger('useShikimoriRating');

/** Оценки уже открытых тайтлов: карточка открывается часто, Shikimori ограничивает частоту */
const cache = new LruCache<ShikimoriRating | null>(
  SHIKIMORI_RATING_CACHE_LIMIT,
);

/**
 * Оценка тайтла на Shikimori по ссылке shikimori_href; пока грузится,
 * нет ссылки или оценки — null
 */
export default function useShikimoriRating(
  shikimoriHref: string | null | undefined,
): ShikimoriRating | null {
  const id = parseShikimoriId(shikimoriHref);
  const key = id === null ? '' : String(id);
  const [rating, setRating] = useState<ShikimoriRating | null>(() =>
    key ? (cache.get(key) ?? null) : null,
  );

  useEffect(() => {
    if (!key) {
      setRating(null);
      return undefined;
    }

    const cached = cache.get(key);
    if (cached !== undefined) {
      setRating(cached);
      return undefined;
    }

    let cancelled = false;
    setRating(null);
    shikimoriApi
      .getRating(Number(key))
      .then((value) => {
        cache.set(key, value);
        if (!cancelled) setRating(value);
        return value;
      })
      .catch((error) => log.warn('Shikimori rating unavailable:', error));

    return () => {
      cancelled = true;
    };
  }, [key]);

  return rating;
}

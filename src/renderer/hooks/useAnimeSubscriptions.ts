/**
 * Подписки на выход серий тайтла и команды, на которые можно подписаться
 */
import { useCallback, useEffect, useState } from 'react';
import { animeApi, AnimeSubscription, AnimeTeam } from '../api/animeApi';
import { createLogger } from '../../shared/logger';

const log = createLogger('useAnimeSubscriptions');

export interface AnimeSubscriptionsState {
  teams: AnimeTeam[];
  subscriptions: AnimeSubscription[];
  loaded: boolean;
  save: (items: AnimeSubscription[]) => Promise<boolean>;
}

/**
 * Загружает подписки и команды тайтла, пока active, и сохраняет новый выбор
 */
export function useAnimeSubscriptions(
  animeSlugUrl: string | null,
  animeId: number | null,
  active: boolean,
): AnimeSubscriptionsState {
  const [teams, setTeams] = useState<AnimeTeam[]>([]);
  const [subscriptions, setSubscriptions] = useState<AnimeSubscription[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    setTeams([]);
    setSubscriptions([]);
    setLoaded(false);
  }, [animeSlugUrl]);

  useEffect(() => {
    if (!active || !animeSlugUrl || loaded) return undefined;

    let cancelled = false;

    const load = async () => {
      try {
        const [teamList, items] = await Promise.all([
          animeApi.getAnimeTeams(animeSlugUrl),
          animeApi.getAnimeSubscriptions(animeSlugUrl),
        ]);
        if (cancelled) return;
        setTeams(teamList);
        setSubscriptions(items);
        setLoaded(true);
      } catch (error) {
        log.error('Failed to load subscriptions:', error);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [active, animeSlugUrl, loaded]);

  const save = useCallback(
    async (items: AnimeSubscription[]) => {
      if (animeId === null) return false;

      try {
        setSubscriptions(await animeApi.saveAnimeSubscriptions(animeId, items));
        return true;
      } catch (error) {
        log.error('Failed to save subscriptions:', error);
        return false;
      }
    },
    [animeId],
  );

  return { teams, subscriptions, loaded, save };
}

export default useAnimeSubscriptions;

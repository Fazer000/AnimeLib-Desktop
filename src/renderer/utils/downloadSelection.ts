/** Выбор перевода, качества и источника для загрузки серии. */
import type { Player } from '../api/animeApi';
import {
  DownloadSource,
  OFFLINE_DOWNLOADABLE_PLAYER,
  OFFLINE_DOWNLOADABLE_PLAYERS,
} from '../../constants';
import { buildVideoUrls } from '../../shared/videoServers';
import { PlayerSelectionManager } from '../services/player';
import { normalizeKodikUrl, toKodikDirectUrl } from './kodikHelpers';

export type KodikQualityMap = Record<number, string[]>;

export interface DownloadTeamOption {
  key: string;
  label: string;
}

/** Определяет вариант перевода независимо от серии и источника. */
const downloadTeamKey = (player: Player): string =>
  JSON.stringify([player.team.name, player.translation_type?.id]);

/** Собирает варианты и помечает дорожки с субтитрами. */
export function getDownloadTeamOptions(
  players: Player[],
): DownloadTeamOption[] {
  const variants = new Map<string, Player>();
  players.forEach((player) => {
    const key = downloadTeamKey(player);
    if (
      OFFLINE_DOWNLOADABLE_PLAYERS.includes(player.player) &&
      !variants.has(key)
    ) {
      variants.set(key, player);
    }
  });
  return Array.from(variants, ([key, player]) => {
    const { name } = player.team;
    const label = PlayerSelectionManager.isSubtitlesOnly(player)
      ? `${name} · Субтитры`
      : name;
    return { key, label };
  });
}

/** Находит выбранный вариант для конкретной серии. */
export const resolveTeamPlayer = (
  players: Player[] | undefined,
  teamKey: string,
): Player | undefined => {
  const candidates = players?.filter(
    (item) =>
      OFFLINE_DOWNLOADABLE_PLAYERS.includes(item.player) &&
      downloadTeamKey(item) === teamKey,
  );
  return (
    candidates?.find((item) => item.player === OFFLINE_DOWNLOADABLE_PLAYER) ??
    candidates?.[0]
  );
};

/** Возвращает качества источника в порядке убывания. */
const getPlayerQualities = (
  player: Player | undefined,
  kodikQualities: KodikQualityMap,
): string[] => {
  if (!player) {
    return [];
  }

  const list =
    player.player === OFFLINE_DOWNLOADABLE_PLAYER
      ? (player.video?.quality || []).map((item) => `${item.quality}p`)
      : kodikQualities[player.id] || [];

  return [...list].sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
};

/** Возвращает доступные качества выбранного перевода. */
export const getEpisodeQualities = (
  players: Player[] | undefined,
  teamKey: string,
  kodikQualities: KodikQualityMap = {},
): string[] =>
  getPlayerQualities(resolveTeamPlayer(players, teamKey), kodikQualities);

/**
 * Подбирает качество серии по умолчанию: точное совпадение или ближайшее меньшее
 */
export const resolveEpisodeQuality = (
  qualities: string[],
  preferred: string,
): string => {
  if (qualities.length === 0) {
    return '';
  }

  if (qualities.includes(preferred)) {
    return preferred;
  }

  const target = parseInt(preferred, 10);

  if (!target) {
    return qualities[0];
  }

  return (
    qualities.find((item) => parseInt(item, 10) <= target) ||
    qualities[qualities.length - 1]
  );
};

export type KodikLinks = Record<number, Record<string, Array<{ src: string }>>>;
type DownloadCredentials = Pick<DownloadSource, 'authToken' | 'siteOrigin'>;

/** Собирает один и тот же источник для проверки размера и загрузки. */
function resolveDownloadSource(
  player: Player,
  quality: string,
  kodikLinks: KodikLinks,
  credentials: DownloadCredentials,
): DownloadSource | undefined {
  let isHls = false;
  let primaryUrl = '';
  let fallbackUrls: string[] = [];

  if (player.player !== OFFLINE_DOWNLOADABLE_PLAYER) {
    const sources = kodikLinks[player.id]?.[quality.replace('p', '')] || [];
    const links = sources.map((item) => normalizeKodikUrl(item.src));
    const direct = links.map(toKodikDirectUrl).filter(Boolean);
    const chosen = direct.length > 0 ? direct : links;

    isHls = direct.length === 0;
    [primaryUrl] = chosen;
    fallbackUrls = chosen.slice(1);
  } else {
    const source = player.video?.quality?.find(
      (item) => `${item.quality}p` === quality,
    );

    if (source) {
      const urls = buildVideoUrls(source.href, player.video_domain);
      [primaryUrl, ...fallbackUrls] = urls;
    }
  }

  if (!primaryUrl) return undefined;
  return {
    videoUrl: primaryUrl,
    fallbackUrls,
    sourceType: isHls ? 'hls' : 'progressive',
    playerType: player.player,
    ...credentials,
  };
}

interface EpisodeDownloadOptions {
  players: Player[] | undefined;
  teamKey: string;
  preferredQuality: string;
  overrideQuality: string | undefined;
  kodikQualities: KodikQualityMap;
  kodikLinks: KodikLinks;
  credentials: DownloadCredentials;
}

/** Готовит общий выбор для оценки размера и постановки в очередь. */
export function prepareEpisodeDownload({
  players,
  teamKey,
  preferredQuality,
  overrideQuality,
  kodikQualities,
  kodikLinks,
  credentials,
}: EpisodeDownloadOptions) {
  const player = resolveTeamPlayer(players, teamKey);
  const qualities = getPlayerQualities(player, kodikQualities);
  const quality =
    overrideQuality && qualities.includes(overrideQuality)
      ? overrideQuality
      : resolveEpisodeQuality(qualities, preferredQuality);
  return {
    player,
    quality,
    source:
      player && resolveDownloadSource(player, quality, kodikLinks, credentials),
  };
}

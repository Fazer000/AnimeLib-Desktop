/**
 * Данные для системной карточки медиасеанса
 */

export interface MediaMetadataSource {
  title: string;
  episodeNumber: string;
  episodeName: string;
  teamName: string;
  artworkUrl: string;
}

/**
 * Карточка медиасеанса в форме, которую принимает MediaMetadata
 */
export interface MediaCardMetadata {
  title: string;
  artist: string;
  album: string;
  artwork: Array<{ src: string }>;
}

/**
 * Собирает карточку медиасеанса: название аниме, серия с названием и озвучка
 */
export function buildMediaMetadata({
  title,
  episodeNumber,
  episodeName,
  teamName,
  artworkUrl,
}: MediaMetadataSource): MediaCardMetadata {
  const number = episodeNumber.trim();
  const episode = number ? `Эпизод ${number}` : '';

  return {
    title: title.trim(),
    artist: [episode, episodeName.trim()].filter(Boolean).join(' • '),
    album: teamName.trim(),
    artwork: artworkUrl ? [{ src: artworkUrl }] : [],
  };
}

export default buildMediaMetadata;

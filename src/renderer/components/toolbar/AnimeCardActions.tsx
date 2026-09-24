import React from 'react';
import { Box } from '@mui/material';
import { animeApi, AnimeInfo } from '../../api/animeApi';
import { useAnimeBookmarkFolder } from '../../hooks/useAnimeBookmarkFolder';
import { useAnimeSubscriptions } from '../../hooks/useAnimeSubscriptions';
import SubscriptionButton from './SubscriptionButton';
import BookmarkFolderButton from './BookmarkFolderButton';

interface AnimeCardActionsProps {
  animeInfo: AnimeInfo;
  active: boolean;
}

/**
 * Уведомления и папка закладок в карточке аниме. Клики не открывают
 * страницу тайтла; без входа в аккаунт строка не показывается
 */
function AnimeCardActions({ animeInfo, active }: AnimeCardActionsProps) {
  const authorized = Boolean(animeApi.getCurrentUserId());
  const slug = authorized ? animeInfo.slug_url : null;
  const folder = useAnimeBookmarkFolder(slug, active);
  const subscriptions = useAnimeSubscriptions(slug, animeInfo.id, active);

  if (!authorized) return null;

  return (
    <Box
      data-card-actions=""
      onClick={(event) => event.stopPropagation()}
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1,
        mt: 0.5,
        cursor: 'default',
      }}
    >
      <SubscriptionButton state={subscriptions} />
      <BookmarkFolderButton state={folder} />
    </Box>
  );
}

export default AnimeCardActions;

import React from 'react';
import { Box, useTheme } from '@mui/material';
import { animeApi, AnimeInfo } from '../../api/animeApi';
import { useAnimeBookmarkFolder } from '../../hooks/useAnimeBookmarkFolder';
import { useAnimeSubscriptions } from '../../hooks/useAnimeSubscriptions';
import SubscriptionButton from './SubscriptionButton';
import BookmarkFolderButton from './BookmarkFolderButton';

interface AnimeCardActionsProps {
  animeInfo: AnimeInfo;
  active: boolean;
  trailing?: React.ReactNode;
}

/**
 * Строка действий карточки аниме: уведомления, папка закладок и trailing
 * (оценка) после разделителя. Клики не открывают страницу тайтла; без входа
 * в аккаунт остаётся только trailing
 */
function AnimeCardActions({
  animeInfo,
  active,
  trailing = null,
}: AnimeCardActionsProps) {
  const { customColors } = useTheme().palette;
  const authorized = Boolean(animeApi.getCurrentUserId());
  const slug = authorized ? animeInfo.slug_url : null;
  const folder = useAnimeBookmarkFolder(slug, active);
  const subscriptions = useAnimeSubscriptions(slug, animeInfo.id, active);

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1,
        mt: 0.5,
      }}
    >
      {authorized && (
        <Box
          data-card-actions=""
          onClick={(event) => event.stopPropagation()}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'default',
          }}
        >
          <SubscriptionButton state={subscriptions} />
          <BookmarkFolderButton state={folder} />
          {trailing && (
            <Box
              sx={{
                width: '1px',
                height: 20,
                mx: 0.5,
                backgroundColor: customColors.lineColor,
              }}
            />
          )}
        </Box>
      )}
      {trailing}
    </Box>
  );
}

AnimeCardActions.defaultProps = { trailing: null };

export default AnimeCardActions;

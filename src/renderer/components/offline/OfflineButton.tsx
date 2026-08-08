import React, { useEffect, useState } from 'react';
import { Badge, Box, Fab } from '@mui/material';
import { DownloadRounded } from '@mui/icons-material';
import DownloadManagerDialog from './DownloadManagerDialog';
import useOfflineLibrary from '../../hooks/useOfflineLibrary';
import {
  FLOATING_BUTTONS_LEFT,
  FLOATING_BUTTONS_TOP,
} from '../../../constants';

interface OfflineButtonProps {
  // eslint-disable-next-line react/require-default-props
  onPlayOffline?: (animeId: string, episodeId?: number) => void;
  // eslint-disable-next-line react/require-default-props
  openTab?: number | null;
  // eslint-disable-next-line react/require-default-props
  onOpenHandled?: () => void;
}

/**
 * Плавающая кнопка менеджера загрузок вне плеера
 */
function OfflineButton({
  onPlayOffline,
  openTab = null,
  onOpenHandled,
}: OfflineButtonProps) {
  const snapshot = useOfflineLibrary();
  const [open, setOpen] = useState<boolean>(false);
  const [initialTab, setInitialTab] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (openTab === null) {
      return;
    }

    setInitialTab(openTab);
    setOpen(true);
    onOpenHandled?.();
  }, [openTab, onOpenHandled]);

  const activeCount = snapshot.tasks.filter(
    (task) =>
      task.status === 'queued' ||
      task.status === 'downloading' ||
      task.status === 'paused',
  ).length;

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          top: FLOATING_BUTTONS_TOP,
          left: FLOATING_BUTTONS_LEFT,
          zIndex: 1200,
        }}
      >
        <Badge
          badgeContent={activeCount}
          color="secondary"
          overlap="circular"
          invisible={activeCount === 0}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{
            '& .MuiBadge-badge': {
              zIndex: 1051,
              border: '2px solid rgba(20, 20, 20, 0.9)',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.5)',
            },
          }}
        >
          <Fab
            onClick={() => {
              setInitialTab(2);
              setOpen(true);
            }}
            size="medium"
            sx={{
              backgroundColor: 'rgba(20, 20, 20, 0.9)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(116, 116, 128, 0.33)',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
              '&:hover': { backgroundColor: 'rgba(116, 116, 128, 0.4)' },
            }}
          >
            <DownloadRounded sx={{ fontSize: 24, color: '#7C3AED' }} />
          </Fab>
        </Badge>
      </Box>

      <DownloadManagerDialog
        open={open}
        onClose={() => setOpen(false)}
        initialTab={initialTab}
        onPlayOffline={onPlayOffline}
      />
    </>
  );
}

export default OfflineButton;

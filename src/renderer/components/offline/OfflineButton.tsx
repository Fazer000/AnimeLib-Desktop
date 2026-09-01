import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { DownloadRounded } from '@mui/icons-material';
import DownloadManagerDialog from './DownloadManagerDialog';
import EdgeActionButton from '../EdgeActionButton';
import useOfflineLibrary from '../../hooks/useOfflineLibrary';
import { FLOATING_BUTTONS_TOP } from '../../../constants';
import { ACCENT, WHITE } from '../../theme/palette';

interface OfflineButtonProps {
  // eslint-disable-next-line react/require-default-props
  onPlayOffline?: (animeId: string, episodeId?: number) => void;
  // eslint-disable-next-line react/require-default-props
  openTab?: number | null;
  // eslint-disable-next-line react/require-default-props
  onOpenHandled?: () => void;
}

const COUNTER_SX = {
  position: 'absolute',
  top: 1,
  left: 26,
  minWidth: 16,
  height: 16,
  px: '4px',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '8px',
  backgroundColor: ACCENT,
  color: WHITE,
  fontSize: '0.62rem',
  fontWeight: 700,
  lineHeight: 1,
  border: '2px solid rgba(20, 20, 20, 0.9)',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.5)',
  pointerEvents: 'none',
  zIndex: 1,
};

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
          left: 0,
          zIndex: 1200,
        }}
      >
        <EdgeActionButton
          side="left"
          solid
          active={open}
          label="Загрузки"
          color={WHITE}
          onClick={() => {
            setInitialTab(2);
            setOpen(true);
          }}
          icon={<DownloadRounded sx={{ fontSize: 24, color: ACCENT }} />}
        />

        {activeCount > 0 && (
          <Box sx={COUNTER_SX}>{activeCount > 99 ? '99+' : activeCount}</Box>
        )}
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

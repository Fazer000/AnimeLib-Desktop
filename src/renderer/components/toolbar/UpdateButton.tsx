import React, { useState } from 'react';
import { Button } from '@mui/material';
import { SystemUpdateAlt } from '@mui/icons-material';
import useUpdateChecker from '../../hooks/useUpdateChecker';
import UpdateDialog from './UpdateDialog';
import { SUCCESS_DEEP, SUCCESS_STRONG, WHITE } from '../../theme/palette';

/**
 * Кнопка обновления в тулбаре, видна только при наличии новой версии
 */
function UpdateButton() {
  const { updateInfo, status, progress, startUpdate, openRelease } =
    useUpdateChecker();
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  if (!updateInfo?.available) {
    return null;
  }

  const isDownloading = status === 'downloading';

  const handleConfirm = () => {
    startUpdate();
  };

  return (
    <>
      <Button
        size="small"
        variant="contained"
        startIcon={<SystemUpdateAlt sx={{ fontSize: 16 }} />}
        onClick={() => setDialogOpen(true)}
        sx={{
          WebkitAppRegion: 'no-drag',
          appRegion: 'no-drag',
          height: 22,
          px: 1,
          fontSize: '0.7rem',
          fontWeight: 500,
          lineHeight: 1,
          textTransform: 'none',
          whiteSpace: 'nowrap',
          minWidth: 0,
          backgroundColor: SUCCESS_DEEP,
          color: WHITE,
          boxShadow: 'none',
          '&:hover': { backgroundColor: SUCCESS_STRONG, boxShadow: 'none' },
          '& .MuiButton-startIcon': { mr: 0.5, ml: 0 },
        }}
      >
        {isDownloading ? `Загрузка ${progress}%` : 'Доступно обновление'}
      </Button>

      <UpdateDialog
        open={dialogOpen}
        updateInfo={updateInfo}
        status={status}
        progress={progress}
        onConfirm={handleConfirm}
        onOpenRelease={openRelease}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}

export default UpdateButton;

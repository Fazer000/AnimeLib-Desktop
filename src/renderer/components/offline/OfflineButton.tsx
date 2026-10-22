import React, { useEffect, useState } from 'react';
import { Download } from '../icons';
import DownloadManagerDialog from './DownloadManagerDialog';
import AnimeTheme from '../AnimeTheme';
import RailButton from '../sideRail/RailButton';
import useOfflineLibrary from '../../hooks/useOfflineLibrary';
import { SIDE_RAIL_ICON_SIZE, isActiveDownload } from '../../../constants';

interface OfflineButtonProps {
  // eslint-disable-next-line react/require-default-props
  onPlayOffline?: (animeId: string, episodeId?: number) => void;
  // eslint-disable-next-line react/require-default-props
  openTab?: number | null;
  // eslint-disable-next-line react/require-default-props
  onOpenHandled?: () => void;
  // eslint-disable-next-line react/require-default-props
  showButton?: boolean;
}

/**
 * Кнопка менеджера загрузок на левой панели; счётчик — идущие загрузки.
 * Без кнопки (сайты манги и ранобэ) диалог всё равно открывается
 * через openTab — из предложения открыть скачанное без сети
 */
function OfflineButton({
  onPlayOffline,
  openTab = null,
  onOpenHandled,
  showButton = true,
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

  const activeCount = snapshot.tasks.filter((task) =>
    isActiveDownload(task.status),
  ).length;

  return (
    <>
      {showButton && (
        <RailButton
          label="Загрузки"
          active={open}
          badge={activeCount}
          onClick={() => {
            setInitialTab(2);
            setOpen(true);
          }}
          icon={<Download sx={{ fontSize: SIDE_RAIL_ICON_SIZE }} />}
        />
      )}

      <AnimeTheme>
        <DownloadManagerDialog
          open={open}
          onClose={() => setOpen(false)}
          initialTab={initialTab}
          onPlayOffline={onPlayOffline}
        />
      </AnimeTheme>
    </>
  );
}

export default OfflineButton;

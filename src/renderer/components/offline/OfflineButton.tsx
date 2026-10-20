import React, { useEffect, useState } from 'react';
import { Download } from '../icons';
import DownloadManagerDialog from './DownloadManagerDialog';
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
}

/**
 * Кнопка менеджера загрузок на левой панели; счётчик — идущие загрузки
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

  const activeCount = snapshot.tasks.filter((task) =>
    isActiveDownload(task.status),
  ).length;

  return (
    <>
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

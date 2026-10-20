import React, { useState } from 'react';
import { Bug } from '../icons';
import ReportDialog from './ReportDialog';
import RailButton from '../sideRail/RailButton';
import { SIDE_RAIL_ICON_SIZE, ReportPayload } from '../../../constants';
import { createLogger } from '../../../shared/logger';

const log = createLogger('ReportButton');

/**
 * Кнопка обращения к разработчику внизу левой панели
 */
function ReportButton() {
  const [open, setOpen] = useState<boolean>(false);

  const handleSubmit = (payload: ReportPayload) => {
    log.debug('Report submitted:', payload.kind);
    window.electron?.electronAPI?.openIssuePage(payload);
    setOpen(false);
  };

  return (
    <>
      <RailButton
        label="Сообщить о проблеме"
        active={open}
        onClick={() => setOpen(true)}
        icon={<Bug sx={{ fontSize: SIDE_RAIL_ICON_SIZE }} />}
      />

      <ReportDialog
        open={open}
        onSubmit={handleSubmit}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export default ReportButton;

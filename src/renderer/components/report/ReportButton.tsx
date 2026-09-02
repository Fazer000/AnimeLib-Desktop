import React, { useState } from 'react';
import { Box, Fab, Tooltip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { BugReportRounded } from '@mui/icons-material';
import ReportDialog from './ReportDialog';
import {
  FLOATING_BUTTONS_BOTTOM,
  FLOATING_BUTTONS_LEFT,
  ReportPayload,
} from '../../../constants';
import { ACCENT, BLACK, BORDER, SURFACE_DEEPEST } from '../../theme/palette';
import { createLogger } from '../../../shared/logger';

const log = createLogger('ReportButton');

const FAB_SX = {
  backgroundColor: alpha(SURFACE_DEEPEST, 0.85),
  backdropFilter: 'blur(10px)',
  border: `1px solid ${alpha(BORDER, 0.6)}`,
  color: ACCENT,
  boxShadow: `0 4px 12px ${alpha(BLACK, 0.4)}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: alpha(ACCENT, 0.24),
    transform: 'translateY(-2px)',
    boxShadow: `0 6px 16px ${alpha(BLACK, 0.5)}`,
  },
  '&:active': { transform: 'translateY(0)' },
};

/**
 * Плавающая кнопка обращения к разработчику вне плеера
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
      <Box
        sx={{
          position: 'fixed',
          bottom: FLOATING_BUTTONS_BOTTOM,
          left: FLOATING_BUTTONS_LEFT,
          zIndex: 1200,
        }}
      >
        <Tooltip title="Сообщить о проблеме" placement="right" arrow>
          <Fab
            size="medium"
            aria-label="Сообщить о проблеме"
            onClick={() => setOpen(true)}
            sx={FAB_SX}
          >
            <BugReportRounded sx={{ fontSize: 24 }} />
          </Fab>
        </Tooltip>
      </Box>

      <ReportDialog
        open={open}
        onSubmit={handleSubmit}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export default ReportButton;

import React, { useState } from 'react';
import { Box, Fab, Tooltip, useTheme } from '@mui/material';
import type { CustomColors } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { Bug } from '../icons';
import ReportDialog from './ReportDialog';
import {
  FLOATING_BUTTONS_BOTTOM,
  FLOATING_BUTTONS_LEFT,
  ReportPayload,
} from '../../../constants';
import { createLogger } from '../../../shared/logger';

const log = createLogger('ReportButton');

const fabSx = (customColors: CustomColors) => ({
  backgroundColor: alpha(customColors.pageColor, 0.85),
  backdropFilter: 'blur(10px)',
  border: `1px solid ${customColors.borderColor}`,
  color: customColors.accentSoftColor,
  boxShadow: `0 4px 12px ${alpha(customColors.blackColor, 0.4)}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: `rgba(${customColors.accentRgb}, 0.24)`,
    transform: 'translateY(-2px)',
    boxShadow: `0 6px 16px ${alpha(customColors.blackColor, 0.5)}`,
  },
  '&:active': { transform: 'translateY(0)' },
});

/**
 * Плавающая кнопка обращения к разработчику вне плеера
 */
function ReportButton() {
  const { customColors } = useTheme().palette;
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
            sx={fabSx(customColors)}
          >
            <Bug sx={{ fontSize: 24 }} />
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

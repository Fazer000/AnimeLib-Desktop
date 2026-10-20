import React from 'react';
import { Box, useTheme } from '@mui/material';
import { formatLatency, MirrorState } from '../../utils/siteMirrors';

interface MirrorStatusLabelProps {
  state: MirrorState | undefined;
  // eslint-disable-next-line react/require-default-props
  okText?: string;
  failText: string;
}

/**
 * Точка и подпись доступности зеркала: время ответа или своя подпись,
 * «проверка…» пока ответа нет
 */
function MirrorStatusLabel({
  state,
  okText,
  failText,
}: MirrorStatusLabelProps) {
  const { customColors } = useTheme().palette;
  const status = state?.status ?? 'checking';

  const color = {
    ok: customColors.successColor,
    fail: customColors.dangerColor,
    checking: customColors.mutedTextColor,
  }[status];

  let text = 'проверка…';
  if (status === 'fail') text = failText;
  if (status === 'ok') text = okText ?? formatLatency(state?.ms ?? 0);

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        fontSize: '0.75rem',
        whiteSpace: 'nowrap',
        color,
      }}
    >
      <Box
        component="span"
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
      {text}
    </Box>
  );
}

export default MirrorStatusLabel;

import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { Check, Copy } from '../icons';
import { UPDATE_COPIED_RESET_MS } from '../../../constants';

interface ManualCommandProps {
  command: string;
}

/**
 * Команда для терминала с кнопкой копирования
 */
function ManualCommand({ command }: ManualCommandProps) {
  const { customColors } = useTheme().palette;
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!copied) return undefined;

    const timer = window.setTimeout(
      () => setCopied(false),
      UPDATE_COPIED_RESET_MS,
    );
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = () => {
    navigator.clipboard
      .writeText(command)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        mt: 1,
        pl: 1.25,
        pr: 0.5,
        py: 0.5,
        borderRadius: 1,
        border: `1px solid ${customColors.lineColor}`,
        backgroundColor: `rgba(${customColors.onSurfaceRgb}, 0.06)`,
      }}
    >
      <Typography
        component="code"
        title={command}
        sx={{
          flex: 1,
          minWidth: 0,
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          color: customColors.dialogTextColor,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {command}
      </Typography>
      <Button
        size="small"
        onClick={handleCopy}
        startIcon={
          copied ? (
            <Check sx={{ fontSize: 14 }} />
          ) : (
            <Copy sx={{ fontSize: 14 }} />
          )
        }
        sx={{
          flexShrink: 0,
          textTransform: 'none',
          fontSize: '0.8rem',
          color: customColors.accentSoftColor,
          '&:hover': {
            backgroundColor: `rgba(${customColors.accentRgb}, 0.12)`,
          },
        }}
      >
        {copied ? 'Скопировано' : 'Копировать'}
      </Button>
    </Box>
  );
}

export default ManualCommand;

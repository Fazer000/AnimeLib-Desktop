import React from 'react';
import { Box, ButtonBase, Typography, useTheme } from '@mui/material';
import { CloudOff } from './icons';

interface SiteLoadErrorProps {
  host: string;
  onChangeSite: () => void;
  onRetry: () => void;
}

/** Страница вместо сайта, который не загрузился */
function SiteLoadError({ host, onChangeSite, onRetry }: SiteLoadErrorProps) {
  const { customColors } = useTheme().palette;

  const button = {
    px: 2,
    py: 1.125,
    borderRadius: 2.25,
    fontSize: '0.8125rem',
    fontWeight: 600,
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        backgroundColor: customColors.pageColor,
      }}
    >
      <Box sx={{ maxWidth: 380, textAlign: 'center' }}>
        <CloudOff sx={{ fontSize: 44, color: customColors.mutedTextColor }} />
        <Typography
          sx={{
            mt: 1,
            mb: 0.75,
            fontSize: '1.125rem',
            fontWeight: 700,
            color: customColors.dialogTextColor,
            wordBreak: 'break-word',
          }}
        >
          {host} не открывается
        </Typography>
        <Typography
          sx={{
            mb: 2,
            fontSize: '0.8125rem',
            lineHeight: 1.5,
            color: customColors.mutedTextColor,
          }}
        >
          Сайт не ответил. Возможно, его блокирует провайдер — смените сайт или
          зеркало.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
          <ButtonBase
            onClick={onChangeSite}
            sx={{
              ...button,
              color: customColors.onAccentColor,
              backgroundColor: customColors.secondaryColor,
              '&:hover': { filter: 'brightness(1.12)' },
            }}
          >
            Сменить сайт
          </ButtonBase>
          <ButtonBase
            onClick={onRetry}
            sx={{
              ...button,
              color: customColors.dialogTextColor,
              border: `1px solid ${customColors.lineColor}`,
              '&:hover': {
                backgroundColor: `rgba(${customColors.onSurfaceRgb}, 0.06)`,
              },
            }}
          >
            Повторить
          </ButtonBase>
        </Box>
      </Box>
    </Box>
  );
}

export default SiteLoadError;

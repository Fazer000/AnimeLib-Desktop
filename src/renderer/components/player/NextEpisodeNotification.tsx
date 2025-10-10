import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';

interface NextEpisodeNotificationProps {
  nextEpisodeNumber: string;
  nextEpisodeName: string;
  countdownSeconds: number;
  onCancel: () => void;
  onPlayNow: () => void;
}

/**
 * Уведомление о следующем эпизоде с обратным отсчётом
 */
function NextEpisodeNotification({
  nextEpisodeNumber,
  nextEpisodeName,
  countdownSeconds: initialCountdown,
  onCancel,
  onPlayNow,
}: NextEpisodeNotificationProps) {
  const theme = useTheme();
  const [countdown, setCountdown] = useState(initialCountdown);

  // Обратный отсчёт
  useEffect(() => {
    if (countdown <= 0) {
      onPlayNow();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // eslint-disable-next-line consistent-return
    return () => clearInterval(timer);
  }, [countdown, onPlayNow]);

  return (
    <>
      {/* Backdrop */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 1999,
          animation: 'fadeIn 0.3s ease-out',
          '@keyframes fadeIn': {
            from: { opacity: 0 },
            to: { opacity: 1 },
          },
        }}
      />

      {/* Notification Card */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2000,
          backgroundColor: 'rgba(28, 28, 28, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          padding: 4,
          minWidth: 400,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
          animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          '@keyframes scaleIn': {
            from: {
              opacity: 0,
              transform: 'translate(-50%, -50%) scale(0.8)',
            },
            to: {
              opacity: 1,
              transform: 'translate(-50%, -50%) scale(1)',
            },
          },
        }}
      >
        {/* Заголовок */}
        <Typography
          sx={{
            fontSize: '1.25rem',
            color: theme.palette.customColors.dtPrimaryTextColor,
            marginBottom: 0.5,
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          Следующий эпизод {nextEpisodeNumber}
        </Typography>

        {/* Название эпизода */}
        {nextEpisodeName && (
          <Typography
            sx={{
              fontSize: '1rem',
              color: theme.palette.customColors.dtPrimaryTextColor,
              marginBottom: 2,
              fontWeight: 500,
              textAlign: 'center',
            }}
          >
            {nextEpisodeName}
          </Typography>
        )}

        {/* Таймер */}
        <Typography
          sx={{
            fontSize: '1rem',
            color: theme.palette.customColors.dtAccentTextColor,
            marginBottom: 3,
            textAlign: 'center',
          }}
        >
          Начнётся через{' '}
          <strong style={{ fontSize: '1.25rem' }}>{countdown}</strong>
        </Typography>

        {/* Кнопки */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            justifyContent: 'center',
          }}
        >
          <Button
            onClick={onCancel}
            sx={{
              color: theme.palette.customColors.dtAccentTextColor,
              textTransform: 'none',
              fontSize: '1rem',
              padding: '10px 24px',
              borderRadius: 2,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            Отмена
          </Button>

          <Button
            onClick={onPlayNow}
            variant="contained"
            sx={{
              backgroundColor: theme.palette.customColors.dtSecondaryColor,
              color: theme.palette.customColors.dtPrimaryTextColor,
              textTransform: 'none',
              fontSize: '1rem',
              padding: '10px 32px',
              borderRadius: 2,
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: theme.palette.customColors.dtSecondaryColor,
                opacity: 0.9,
                boxShadow: 'none',
              },
            }}
          >
            Воспроизвести
          </Button>
        </Box>
      </Box>
    </>
  );
}

export default NextEpisodeNotification;

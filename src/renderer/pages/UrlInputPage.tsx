import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Fade } from '@mui/material';
import iconSvg from '../../../assets/icon.svg';
import { DEFAULT_SITE_URL } from '../utils/urlHelpers';

interface UrlInputProps {
  onSubmit: (url: string) => void;
}

function UrlInputPage({ onSubmit }: UrlInputProps) {
  const [url, setUrl] = useState<string>(DEFAULT_SITE_URL);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      setIsLoading(true);
      setTimeout(() => {
        onSubmit(url.trim());
        setIsLoading(false);
      }, 500);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 50%, #0a0a0a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background:
            'radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, transparent 70%)',
          animation: 'pulse 15s ease-in-out infinite',
        },
        '@keyframes pulse': {
          '0%, 100%': {
            transform: 'translate(0, 0) scale(1)',
            opacity: 0.5,
          },
          '50%': {
            transform: 'translate(-10%, -10%) scale(1.1)',
            opacity: 0.8,
          },
        },
      }}
    >
      <Fade in timeout={800}>
        <Box
          sx={{
            width: '100%',
            maxWidth: '1000px',
            mx: 'auto',
            px: 4,
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 30,
          }}
        >
          <Box
            sx={{
              flex: '0 0 auto',
              textAlign: 'center',
            }}
          >
            <Box
              component="img"
              src={iconSvg}
              alt="AnimeLib Logo"
              sx={{
                width: '200px',
                height: '200px',
                mb: 3,
              }}
            />
          </Box>

          <Box
            sx={{
              flex: 1,
              backgroundColor: 'rgba(26, 26, 26, 0.8)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              p: 5,
              border: '1px solid rgba(124, 58, 237, 0.2)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            <Typography
              sx={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#ffffff',
                mb: 4,
              }}
            >
              Введите URL сайта для начала просмотра
            </Typography>

            <form onSubmit={handleSubmit}>
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#7C3AED',
                  mb: 2,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                URL Сайта
              </Typography>

              <TextField
                fullWidth
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                placeholder={DEFAULT_SITE_URL}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: '16px',
                    fontSize: '16px',
                    color: '#ffffff',
                    transition: 'all 0.3s ease',
                    '& fieldset': {
                      borderColor: 'rgba(124, 58, 237, 0.3)',
                      borderWidth: '2px',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(124, 58, 237, 0.6)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#7C3AED',
                      boxShadow: '0 0 0 4px rgba(124, 58, 237, 0.1)',
                    },
                    '& input': {
                      py: 2,
                    },
                  },
                }}
              />

              <Button
                type="submit"
                fullWidth
                disabled={!url.trim() || isLoading}
                sx={{
                  py: 2,
                  fontSize: '16px',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '16px',
                  background:
                    'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                  color: '#ffffff',
                  transition: 'all 0.3s ease',
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                  '&:disabled': {
                    background: 'rgba(60, 60, 60, 0.5)',
                    color: 'rgba(255, 255, 255, 0.3)',
                  },
                }}
              >
                {isLoading ? 'Загрузка...' : 'Сохранить'}
              </Button>
            </form>
          </Box>
        </Box>
      </Fade>
    </Box>
  );
}

export default UrlInputPage;

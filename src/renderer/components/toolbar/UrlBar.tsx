/* eslint-disable react/require-default-props, jsx-a11y/anchor-is-valid, no-console */
import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  Fade,
} from '@mui/material';
import { Link, Close } from '@mui/icons-material';

interface UrlBarProps {
  currentUrl?: string;
  showUrlInput?: boolean;
  onUrlChange?: (url: string) => void;
  onToggleUrlInput?: () => void;
}

/**
 * UrlBar - URL input and display component
 *
 * Features:
 * - Toggle between URL display and input field
 * - Enter key to submit
 * - URL validation
 */
function UrlBar({
  currentUrl = '',
  showUrlInput = false,
  onUrlChange,
  onToggleUrlInput,
}: UrlBarProps) {
  const [localUrl, setLocalUrl] = useState('');

  // Load animeLibUrl from localStorage when showing input
  useEffect(() => {
    if (showUrlInput) {
      // Load from localStorage when opening input
      const savedUrl = localStorage.getItem('animeLibUrl') || '';
      setLocalUrl(savedUrl);
      console.log('[UrlBar] Loaded animeLibUrl from localStorage:', savedUrl);
    }
  }, [showUrlInput]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localUrl.trim()) {
      // Save to localStorage
      localStorage.setItem('animeLibUrl', localUrl.trim());
      console.log(
        '[UrlBar] Saved animeLibUrl to localStorage:',
        localUrl.trim(),
      );

      // Notify parent
      if (onUrlChange) {
        onUrlChange(localUrl.trim());
      }
    }
  };

  const handleUrlKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (localUrl.trim()) {
        // Save to localStorage
        localStorage.setItem('animeLibUrl', localUrl.trim());
        console.log(
          '[UrlBar] Saved animeLibUrl to localStorage:',
          localUrl.trim(),
        );

        // Notify parent
        if (onUrlChange) {
          onUrlChange(localUrl.trim());
        }
      }
    }
  };

  return (
    <>
      {/* Main URL/Title area */}
      <Box
        sx={{
          flex: 1,
          WebkitAppRegion: 'drag',
          appRegion: 'drag',
        }}
      >
        {showUrlInput ? (
          <Fade in={showUrlInput}>
            <form onSubmit={handleUrlSubmit}>
              <TextField
                size="small"
                value={localUrl}
                onChange={(e) => setLocalUrl(e.target.value)}
                onKeyPress={handleUrlKeyPress}
                placeholder="Введите URL..."
                sx={{
                  width: '100%',
                  WebkitAppRegion: 'no-drag',
                  appRegion: 'no-drag',
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#1a1a1a',
                    borderRadius: 1,
                    height: 24,
                    fontSize: '12px',
                    '& fieldset': {
                      borderColor: '#464649',
                    },
                    '&:hover fieldset': {
                      borderColor: '#7C3AED',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#7C3AED',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: '#bfbfbf',
                    padding: '4px 8px',
                    fontSize: '12px',
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={onToggleUrlInput}
                        sx={{ color: '#bfbfbf', padding: 0.5 }}
                      >
                        <Close sx={{ fontSize: 14 }} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </form>
          </Fade>
        ) : (
          <Typography
            variant="body2"
            sx={{
              color: '#bfbfbf',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '12px',
              lineHeight: 1.2,
              fontFamily: 'Open Sans, sans-serif',
            }}
          >
            {currentUrl}
          </Typography>
        )}
      </Box>

      {/* URL toggle button */}
      {onToggleUrlInput && (
        <IconButton
          size="small"
          onClick={onToggleUrlInput}
          sx={{
            color: '#ffffff',
            WebkitAppRegion: 'no-drag',
            appRegion: 'no-drag',
            padding: 0.5,
            minWidth: 24,
            height: 24,
          }}
          aria-label="Переключить URL ввод"
        >
          <Link sx={{ fontSize: 16 }} />
        </IconButton>
      )}
    </>
  );
}

export default UrlBar;

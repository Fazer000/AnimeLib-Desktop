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
import { saveSiteUrl } from '../../utils/urlHelpers';

import { createLogger } from '../../../shared/logger';

const log = createLogger('UrlBar');

interface UrlBarProps {
  // eslint-disable-next-line react/require-default-props
  currentUrl?: string;
  // eslint-disable-next-line react/require-default-props
  showUrlInput?: boolean;
  // eslint-disable-next-line react/require-default-props
  onUrlChange?: (url: string) => void;
  // eslint-disable-next-line react/require-default-props
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

  useEffect(() => {
    if (showUrlInput) {
      const savedUrl = localStorage.getItem('animeLibUrl') || '';
      setLocalUrl(savedUrl);
      log.debug('Loaded animeLibUrl from localStorage:', savedUrl);
    }
  }, [showUrlInput]);

  const submitUrl = () => {
    const trimmedUrl = localUrl.trim();
    if (!trimmedUrl) {
      return;
    }

    const baseUrl = saveSiteUrl(trimmedUrl);
    log.debug('Saved base animeLibUrl to localStorage:', baseUrl);

    if (onUrlChange) {
      onUrlChange(trimmedUrl);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitUrl();
  };

  const handleUrlKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitUrl();
    }
  };

  return (
    <>
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
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
          <Link sx={{ fontSize: 16 }} />
        </IconButton>
      )}
    </>
  );
}

export default UrlBar;

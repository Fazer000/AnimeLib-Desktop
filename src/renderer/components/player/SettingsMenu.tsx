import React, { useState } from 'react';
import {
  Box,
  MenuItem,
  IconButton,
  Typography,
  Switch,
  Divider,
} from '@mui/material';
import {
  ArrowBackRounded,
  CheckRounded,
  HdOutlined,
  SdOutlined,
  FourKOutlined,
  SpeedOutlined,
  FastForwardOutlined,
  SkipNextOutlined,
} from '@mui/icons-material';
import { SkipManager } from '../../services/player';
import { getQualityLevel } from '../../utils/videoHelpers';

interface SettingsMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  qualityOptions: Array<{ label: string; value: string }>;
  selectedQuality: string;
  playbackRate: number;
  skipManager: SkipManager;
  onQualityChange: (quality: string) => void;
  onPlaybackRateChange: (rate: number) => void;
  onSkipTimeChange: (time: number) => void;
  showEpisodes: boolean;
  autoplayEnabled: boolean;
  onAutoplayChange?: (enabled: boolean) => void;
  ambientLightEnabled: boolean;
  onAmbientLightChange?: (enabled: boolean) => void;
  autoSkipSettings?: {
    skipOpenings: boolean;
    skipEndings: boolean;
    skipCompilations: boolean;
    skipSplashScreens: boolean;
  };
  onAutoSkipChange?: (settings: {
    skipOpenings: boolean;
    skipEndings: boolean;
    skipCompilations: boolean;
    skipSplashScreens: boolean;
  }) => void;
}

type MenuPage = 'main' | 'quality' | 'speed' | 'skip' | 'autoSkip';

/**
 * Меню настроек видеоплеера
 */
function SettingsMenu({
  anchorEl,
  onClose,
  qualityOptions,
  selectedQuality,
  playbackRate,
  skipManager,
  onQualityChange,
  onPlaybackRateChange,
  onSkipTimeChange,
  showEpisodes = false,
  autoplayEnabled,
  onAutoplayChange,
  ambientLightEnabled,
  onAmbientLightChange,
  autoSkipSettings = {
    skipOpenings: false,
    skipEndings: false,
    skipCompilations: false,
    skipSplashScreens: false,
  },
  onAutoSkipChange,
}: SettingsMenuProps) {
  const [currentPage, setCurrentPage] = useState<MenuPage>('main');
  const handleQualityChange = (quality: string) => {
    onQualityChange(quality);
    onClose();
    setCurrentPage('main');
  };

  const handlePlaybackRateChange = (rate: number) => {
    onPlaybackRateChange(rate);
    onClose();
    setCurrentPage('main');
  };

  const handleSkipTimeChange = (time: number) => {
    onSkipTimeChange(time);
  };

  const handleBackToMain = () => {
    setCurrentPage('main');
  };

  const getQualityIcon = (quality: string) => {
    const level = getQualityLevel(quality);
    if (level === '4K') return FourKOutlined;
    if (level === 'HD') return HdOutlined;
    return SdOutlined;
  };

  if (!anchorEl) return null;

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
          zIndex: 1999,
        }}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onClose();
          setCurrentPage('main');
        }}
      />

      {/* Menu */}
      <Box
        sx={{
          position: 'absolute',
          bottom: showEpisodes ? 120 : 70,
          right: 16,
          zIndex: 2000,
          py: 1,
          transition: 'bottom 0.3s ease-in-out',
          backgroundColor: 'rgba(20, 20, 20, 0.68)',
          border: '1px solid rgba(116, 116, 128, 0.33)',
          color: 'white',
          minWidth: 200,
          maxWidth: 250,
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(2px)',
          animation: 'menuFadeIn 0.1s ease-out',
          '@keyframes menuFadeIn': {
            '0%': {
              opacity: 0,
              transform: 'translateY(10px) scale(0.95)',
            },
            '100%': {
              opacity: 1,
              transform: 'translateY(0) scale(1)',
            },
          },
        }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Main Page */}
        {currentPage === 'main' && (
          <Box>
            {/* Quality */}
            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPage('quality');
              }}
              sx={{
                color: 'white',
                fontFamily: 'Roboto, sans-serif',
                fontSize: '0.875rem',
                py: 0.75,
                px: 1.5,
                minHeight: 'auto',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  gap: 1,
                }}
              >
                <HdOutlined sx={{ fontSize: 18, color: '#7C3AED' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Качество
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '11px',
                    }}
                  >
                    {qualityOptions.find((q) => q.value === selectedQuality)
                      ?.label || 'Авто'}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  ›
                </Typography>
              </Box>
            </MenuItem>

            {/* Speed */}
            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPage('speed');
              }}
              sx={{
                color: 'white',
                fontFamily: 'Roboto, sans-serif',
                fontSize: '0.875rem',
                py: 0.75,
                px: 1.5,
                minHeight: 'auto',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  gap: 1,
                }}
              >
                <SpeedOutlined sx={{ fontSize: 18, color: '#A855F7' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Скорость
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '11px',
                    }}
                  >
                    {playbackRate}x
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  ›
                </Typography>
              </Box>
            </MenuItem>
            {/* Skip */}
            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPage('skip');
              }}
              sx={{
                color: 'white',
                fontFamily: 'Roboto, sans-serif',
                fontSize: '0.875rem',
                py: 0.75,
                px: 1.5,
                minHeight: 'auto',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  gap: 1,
                }}
              >
                <FastForwardOutlined sx={{ fontSize: 18, color: '#BB86FC' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Перемотка
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '11px',
                    }}
                  >
                    {skipManager.formatSkipTime()}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  ›
                </Typography>
              </Box>
            </MenuItem>

            {/* Auto Skip */}
            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPage('autoSkip');
              }}
              sx={{
                color: 'white',
                fontFamily: 'Roboto, sans-serif',
                fontSize: '0.875rem',
                py: 0.75,
                px: 1.5,
                minHeight: 'auto',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  gap: 1,
                }}
              >
                <SkipNextOutlined sx={{ fontSize: 18, color: '#C084FC' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Автопропуск
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '11px',
                    }}
                  >
                    {Object.values(autoSkipSettings).filter(Boolean).length}{' '}
                    активных
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  ›
                </Typography>
              </Box>
            </MenuItem>

            <Divider />

            {/* Autoplay */}
            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                onAutoplayChange?.(!autoplayEnabled);
              }}
              sx={{
                color: 'white',
                fontFamily: 'Roboto, sans-serif',
                fontSize: '0.875rem',
                py: 0.75,
                px: 1.5,
                minHeight: 'auto',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  gap: 1,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Автовоспроизведение
                  </Typography>
                </Box>
                <Switch
                  checked={autoplayEnabled}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    onAutoplayChange?.(e.target.checked);
                  }}
                  sx={{
                    '& .MuiSwitch-switchBase': {
                      color: '#BDBDBD',
                      '&.Mui-checked': {
                        color: '#BB86FC',
                        '& + .MuiSwitch-track': {
                          backgroundColor: 'rgba(187, 134, 252, 0.3)',
                          border: '1px solid #BB86FC',
                        },
                      },
                    },
                    '& .MuiSwitch-track': {
                      backgroundColor: 'rgba(189, 189, 189, 0.3)',
                      border: '1px solid #BDBDBD',
                    },
                    '& .MuiSwitch-thumb': {
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    },
                  }}
                  size="small"
                />
              </Box>
            </MenuItem>

            {/* Ambient Light */}
            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                onAmbientLightChange?.(!ambientLightEnabled);
              }}
              sx={{
                color: 'white',
                fontFamily: 'Roboto, sans-serif',
                fontSize: '0.875rem',
                py: 0.75,
                px: 1.5,
                minHeight: 'auto',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  gap: 1,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Адаптивная подсветка
                  </Typography>
                </Box>
                <Switch
                  checked={ambientLightEnabled}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    onAmbientLightChange?.(e.target.checked);
                  }}
                  sx={{
                    '& .MuiSwitch-switchBase': {
                      color: '#BDBDBD',
                      '&.Mui-checked': {
                        color: '#BB86FC',
                        '& + .MuiSwitch-track': {
                          backgroundColor: 'rgba(187, 134, 252, 0.3)',
                          border: '1px solid #BB86FC',
                        },
                      },
                    },
                    '& .MuiSwitch-track': {
                      backgroundColor: 'rgba(189, 189, 189, 0.3)',
                      border: '1px solid #BDBDBD',
                    },
                    '& .MuiSwitch-thumb': {
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    },
                  }}
                  size="small"
                />
              </Box>
            </MenuItem>
          </Box>
        )}

        {/* Quality Page */}
        {currentPage === 'quality' && (
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 1.5,
                py: 0.75,
                borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleBackToMain();
                }}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  padding: 0.25,
                  mr: 0.75,
                  minWidth: 'auto',
                  width: 24,
                  height: 24,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                }}
              >
                <ArrowBackRounded sx={{ fontSize: 16 }} />
              </IconButton>
              <Typography
                variant="subtitle2"
                sx={{
                  color: 'white',
                  fontFamily: 'Roboto, sans-serif',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                Качество
              </Typography>
            </Box>

            {qualityOptions.map((option) => (
              <MenuItem
                key={option.value}
                onClick={(e) => {
                  e.stopPropagation();
                  handleQualityChange(option.value);
                }}
                sx={{
                  color: 'white',
                  fontFamily: 'Roboto, sans-serif',
                  fontSize: '0.875rem',
                  py: 0.75,
                  px: 1.5,
                  minHeight: 'auto',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(124, 58, 237, 0.25)',
                    color: '#BB86FC',
                  },
                }}
                selected={option.value === selectedQuality}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    gap: 1,
                  }}
                >
                  {React.createElement(getQualityIcon(option.value), {
                    sx: {
                      fontSize: 18,
                      color:
                        option.value === selectedQuality
                          ? '#BB86FC'
                          : '#7C3AED',
                      opacity: 0.7,
                    },
                  })}
                  <Typography
                    variant="body2"
                    sx={{
                      flex: 1,
                      fontWeight: option.value === selectedQuality ? 600 : 500,
                    }}
                  >
                    {option.label}
                  </Typography>
                  {option.value === selectedQuality && (
                    <CheckRounded sx={{ fontSize: 16, color: '#BB86FC' }} />
                  )}
                </Box>
              </MenuItem>
            ))}
          </Box>
        )}

        {/* Speed Page */}
        {currentPage === 'speed' && (
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 1.5,
                py: 0.75,
                borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleBackToMain();
                }}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  padding: 0.25,
                  mr: 0.75,
                  minWidth: 'auto',
                  width: 24,
                  height: 24,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                }}
              >
                <ArrowBackRounded sx={{ fontSize: 16 }} />
              </IconButton>
              <Typography
                variant="subtitle2"
                sx={{
                  color: 'white',
                  fontFamily: 'Roboto, sans-serif',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                Скорость
              </Typography>
            </Box>

            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
              <MenuItem
                key={speed}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlaybackRateChange(speed);
                }}
                sx={{
                  color: 'white',
                  fontFamily: 'Roboto, sans-serif',
                  fontSize: '0.875rem',
                  py: 0.75,
                  px: 1.5,
                  minHeight: 'auto',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(124, 58, 237, 0.25)',
                    color: '#BB86FC',
                  },
                }}
                selected={speed === playbackRate}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    gap: 1,
                  }}
                >
                  <SpeedOutlined
                    sx={{
                      fontSize: 18,
                      color: speed === playbackRate ? '#BB86FC' : '#A855F7',
                      opacity: 0.7,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      flex: 1,
                      fontWeight: speed === playbackRate ? 600 : 500,
                    }}
                  >
                    {speed}x
                  </Typography>
                  {speed === playbackRate && (
                    <CheckRounded sx={{ fontSize: 16, color: '#BB86FC' }} />
                  )}
                </Box>
              </MenuItem>
            ))}
          </Box>
        )}

        {/* Skip Page */}
        {currentPage === 'skip' && (
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 1.5,
                py: 0.75,
                borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleBackToMain();
                }}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  padding: 0.25,
                  mr: 0.75,
                  minWidth: 'auto',
                  width: 24,
                  height: 24,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                }}
              >
                <ArrowBackRounded sx={{ fontSize: 16 }} />
              </IconButton>
              <Typography
                variant="subtitle2"
                sx={{
                  color: 'white',
                  fontFamily: 'Roboto, sans-serif',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                Время перемотки
              </Typography>
            </Box>

            {/* Minutes */}
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '11px',
                  mb: 0.5,
                  display: 'block',
                }}
              >
                Минуты
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                {[0, 1, 2, 3, 4, 5].map((min) => {
                  const isSelected = skipManager.getMinutes() === min;
                  return (
                    <Box
                      key={min}
                      onClick={(e) => {
                        e.stopPropagation();
                        skipManager.setMinutes(min);
                        handleSkipTimeChange(skipManager.getSkipTime());
                      }}
                      sx={{
                        flex: '0 0 calc(33.333% - 4px)',
                        textAlign: 'center',
                        py: 0.75,
                        px: 1,
                        borderRadius: 1,
                        cursor: 'pointer',
                        backgroundColor: isSelected
                          ? 'rgba(124, 58, 237, 0.3)'
                          : 'rgba(255, 255, 255, 0.1)',
                        border: isSelected
                          ? '1px solid #BB86FC'
                          : '1px solid transparent',
                        color: isSelected
                          ? '#BB86FC'
                          : 'rgba(255, 255, 255, 0.7)',
                        fontWeight: isSelected ? 600 : 400,
                        fontSize: '0.875rem',
                        fontFamily: 'Roboto, sans-serif',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          backgroundColor: isSelected
                            ? 'rgba(124, 58, 237, 0.4)'
                            : 'rgba(255, 255, 255, 0.15)',
                        },
                      }}
                    >
                      {min}
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Seconds */}
            <Box sx={{ px: 1.5, py: 0.5 }}>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '11px',
                  mb: 0.5,
                  display: 'block',
                }}
              >
                Секунды
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((sec) => {
                  const isSelected = skipManager.getSeconds() === sec;
                  return (
                    <Box
                      key={sec}
                      onClick={(e) => {
                        e.stopPropagation();
                        skipManager.setSeconds(sec);
                        handleSkipTimeChange(skipManager.getSkipTime());
                      }}
                      sx={{
                        flex: '0 0 calc(25% - 4px)',
                        textAlign: 'center',
                        py: 0.75,
                        px: 0.5,
                        borderRadius: 1,
                        cursor: 'pointer',
                        backgroundColor: isSelected
                          ? 'rgba(124, 58, 237, 0.3)'
                          : 'rgba(255, 255, 255, 0.1)',
                        border: isSelected
                          ? '1px solid #BB86FC'
                          : '1px solid transparent',
                        color: isSelected
                          ? '#BB86FC'
                          : 'rgba(255, 255, 255, 0.7)',
                        fontWeight: isSelected ? 600 : 400,
                        fontSize: '0.875rem',
                        fontFamily: 'Roboto, sans-serif',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          backgroundColor: isSelected
                            ? 'rgba(124, 58, 237, 0.4)'
                            : 'rgba(255, 255, 255, 0.15)',
                        },
                      }}
                    >
                      {sec}
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Current value */}
            <Box
              sx={{
                mx: 1.5,
                mb: 1,
                backgroundColor: 'rgba(124, 58, 237, 0.2)',
                borderRadius: 1,
                px: 1.5,
                py: 1,
                textAlign: 'center',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: '#BB86FC',
                  fontWeight: 600,
                  fontFamily: 'Roboto, sans-serif',
                }}
              >
                {skipManager.formatSkipTime()}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Auto Skip Page */}
        {currentPage === 'autoSkip' && (
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 1.5,
                py: 0.75,
                borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleBackToMain();
                }}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  padding: 0.25,
                  mr: 0.75,
                  minWidth: 'auto',
                  width: 24,
                  height: 24,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                }}
              >
                <ArrowBackRounded sx={{ fontSize: 16 }} />
              </IconButton>
              <Typography
                variant="subtitle2"
                sx={{
                  color: 'white',
                  fontFamily: 'Roboto, sans-serif',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                Автоматический пропуск
              </Typography>
            </Box>

            {/* Skip Openings */}
            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                onAutoSkipChange?.({
                  ...autoSkipSettings,
                  skipOpenings: !autoSkipSettings.skipOpenings,
                });
              }}
              sx={{
                color: 'white',
                fontFamily: 'Roboto, sans-serif',
                fontSize: '0.875rem',
                py: 0.75,
                px: 1.5,
                minHeight: 'auto',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  gap: 1,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Пропускать опенинги
                  </Typography>
                </Box>
                <Switch
                  checked={autoSkipSettings.skipOpenings}
                  onChange={(e) => {
                    e.stopPropagation();
                    onAutoSkipChange?.({
                      ...autoSkipSettings,
                      skipOpenings: e.target.checked,
                    });
                  }}
                  sx={{
                    '& .MuiSwitch-switchBase': {
                      color: '#BDBDBD',
                      '&.Mui-checked': {
                        color: '#C084FC',
                        '& + .MuiSwitch-track': {
                          backgroundColor: 'rgba(192, 132, 252, 0.3)',
                          border: '1px solid #C084FC',
                        },
                      },
                    },
                    '& .MuiSwitch-track': {
                      backgroundColor: 'rgba(189, 189, 189, 0.3)',
                      border: '1px solid #BDBDBD',
                    },
                    '& .MuiSwitch-thumb': {
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    },
                  }}
                  size="small"
                />
              </Box>
            </MenuItem>

            {/* Skip Endings */}
            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                onAutoSkipChange?.({
                  ...autoSkipSettings,
                  skipEndings: !autoSkipSettings.skipEndings,
                });
              }}
              sx={{
                color: 'white',
                fontFamily: 'Roboto, sans-serif',
                fontSize: '0.875rem',
                py: 0.75,
                px: 1.5,
                minHeight: 'auto',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  gap: 1,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Пропускать эндинги
                  </Typography>
                </Box>
                <Switch
                  checked={autoSkipSettings.skipEndings}
                  onChange={(e) => {
                    e.stopPropagation();
                    onAutoSkipChange?.({
                      ...autoSkipSettings,
                      skipEndings: e.target.checked,
                    });
                  }}
                  sx={{
                    '& .MuiSwitch-switchBase': {
                      color: '#BDBDBD',
                      '&.Mui-checked': {
                        color: '#C084FC',
                        '& + .MuiSwitch-track': {
                          backgroundColor: 'rgba(192, 132, 252, 0.3)',
                          border: '1px solid #C084FC',
                        },
                      },
                    },
                    '& .MuiSwitch-track': {
                      backgroundColor: 'rgba(189, 189, 189, 0.3)',
                      border: '1px solid #BDBDBD',
                    },
                    '& .MuiSwitch-thumb': {
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    },
                  }}
                  size="small"
                />
              </Box>
            </MenuItem>

            {/* Skip Compilations */}
            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                onAutoSkipChange?.({
                  ...autoSkipSettings,
                  skipCompilations: !autoSkipSettings.skipCompilations,
                });
              }}
              sx={{
                color: 'white',
                fontFamily: 'Roboto, sans-serif',
                fontSize: '0.875rem',
                py: 0.75,
                px: 1.5,
                minHeight: 'auto',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  gap: 1,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Пропускать компиляции
                  </Typography>
                </Box>
                <Switch
                  checked={autoSkipSettings.skipCompilations}
                  onChange={(e) => {
                    e.stopPropagation();
                    onAutoSkipChange?.({
                      ...autoSkipSettings,
                      skipCompilations: e.target.checked,
                    });
                  }}
                  sx={{
                    '& .MuiSwitch-switchBase': {
                      color: '#BDBDBD',
                      '&.Mui-checked': {
                        color: '#C084FC',
                        '& + .MuiSwitch-track': {
                          backgroundColor: 'rgba(192, 132, 252, 0.3)',
                          border: '1px solid #C084FC',
                        },
                      },
                    },
                    '& .MuiSwitch-track': {
                      backgroundColor: 'rgba(189, 189, 189, 0.3)',
                      border: '1px solid #BDBDBD',
                    },
                    '& .MuiSwitch-thumb': {
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    },
                  }}
                  size="small"
                />
              </Box>
            </MenuItem>

            {/* Skip Splash Screens */}
            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                onAutoSkipChange?.({
                  ...autoSkipSettings,
                  skipSplashScreens: !autoSkipSettings.skipSplashScreens,
                });
              }}
              sx={{
                color: 'white',
                fontFamily: 'Roboto, sans-serif',
                fontSize: '0.875rem',
                py: 0.75,
                px: 1.5,
                minHeight: 'auto',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  gap: 1,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Пропускать заставки
                  </Typography>
                </Box>
                <Switch
                  checked={autoSkipSettings.skipSplashScreens}
                  onChange={(e) => {
                    e.stopPropagation();
                    onAutoSkipChange?.({
                      ...autoSkipSettings,
                      skipSplashScreens: e.target.checked,
                    });
                  }}
                  sx={{
                    '& .MuiSwitch-switchBase': {
                      color: '#BDBDBD',
                      '&.Mui-checked': {
                        color: '#C084FC',
                        '& + .MuiSwitch-track': {
                          backgroundColor: 'rgba(192, 132, 252, 0.3)',
                          border: '1px solid #C084FC',
                        },
                      },
                    },
                    '& .MuiSwitch-track': {
                      backgroundColor: 'rgba(189, 189, 189, 0.3)',
                      border: '1px solid #BDBDBD',
                    },
                    '& .MuiSwitch-thumb': {
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    },
                  }}
                  size="small"
                />
              </Box>
            </MenuItem>
          </Box>
        )}
      </Box>
    </>
  );
}

SettingsMenu.defaultProps = {
  onAutoplayChange: undefined,
  onAmbientLightChange: undefined,
  autoSkipSettings: {
    skipOpenings: false,
    skipEndings: false,
    skipCompilations: false,
    skipSplashScreens: false,
  },
  onAutoSkipChange: undefined,
};

export default SettingsMenu;

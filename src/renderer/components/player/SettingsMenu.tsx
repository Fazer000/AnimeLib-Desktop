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
  SpeedOutlined,
  FastForwardOutlined,
  SkipNextOutlined,
  SubtitlesOutlined,
} from '@mui/icons-material';
import {
  SkipManager,
  SubtitleTrack,
  SubtitlesSettings,
} from '../../services/player';
import { SubtitleStyleSettings } from '../../utils/subtitleHelpers';
import {
  getQualityTagColor,
  getQualityTagFromResolution,
} from '../../utils/videoHelpers';
import {
  SUBTITLES_DEFAULT_SETTINGS,
  SUBTITLES_FONT_SCALES,
  SUBTITLES_OFFSETS,
  SUBTITLES_OUTLINE_MODES,
} from '../../../constants';

const MENU_ICON_SIZE = 20;

const MENU_ICON_BOX_SX = (color: string) => ({
  width: 38,
  height: 38,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 1,
  border: `1px solid ${color}59`,
  color,
  fontFamily: 'Roboto, sans-serif',
  fontSize: '0.6875rem',
  fontWeight: 700,
  lineHeight: 1,
});

const QUALITY_TAG_SX = (color: string) => ({
  minWidth: 36,
  textAlign: 'center' as const,
  px: 0.75,
  py: '2px',
  borderRadius: 1,
  fontFamily: 'Roboto, sans-serif',
  fontSize: '0.625rem',
  fontWeight: 700,
  color,
  border: `1px solid ${color}59`,
});

const CHIP_SX = (isSelected: boolean) => ({
  flex: '1 1 auto',
  textAlign: 'center' as const,
  py: 0.75,
  px: 1,
  borderRadius: 1,
  cursor: 'pointer',
  backgroundColor: isSelected
    ? 'rgba(124, 58, 237, 0.3)'
    : 'rgba(255, 255, 255, 0.1)',
  border: isSelected ? '1px solid #BB86FC' : '1px solid transparent',
  color: isSelected ? '#BB86FC' : 'rgba(255, 255, 255, 0.7)',
  fontWeight: isSelected ? 600 : 400,
  fontSize: '0.8125rem',
  fontFamily: 'Roboto, sans-serif',
  transition: 'all 0.15s ease',
  '&:hover': {
    backgroundColor: isSelected
      ? 'rgba(124, 58, 237, 0.4)'
      : 'rgba(255, 255, 255, 0.15)',
  },
});

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
  subtitleTracks?: SubtitleTrack[];
  subtitleSettings?: SubtitlesSettings;
  onSubtitleTrackChange?: (trackName: string | null) => void;
  onSubtitleSettingsChange?: (patch: Partial<SubtitleStyleSettings>) => void;
}

type MenuPage =
  | 'main'
  | 'quality'
  | 'speed'
  | 'skip'
  | 'autoSkip'
  | 'subtitles';

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
  subtitleTracks = [],
  subtitleSettings = SUBTITLES_DEFAULT_SETTINGS,
  onSubtitleTrackChange,
  onSubtitleSettingsChange,
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

  if (!anchorEl) return null;

  return (
    <>
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
        {currentPage === 'main' && (
          <Box>
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
                {(() => {
                  const tag = getQualityTagFromResolution(selectedQuality);
                  const tagColor = tag ? getQualityTagColor(tag) : '#7C3AED';
                  return (
                    <Box sx={MENU_ICON_BOX_SX(tagColor)}>{tag || '—'}</Box>
                  );
                })()}
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
                <Box sx={MENU_ICON_BOX_SX('#A855F7')}>
                  <SpeedOutlined sx={{ fontSize: MENU_ICON_SIZE }} />
                </Box>
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
                <Box sx={MENU_ICON_BOX_SX('#BB86FC')}>
                  <FastForwardOutlined sx={{ fontSize: MENU_ICON_SIZE }} />
                </Box>
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
                <Box sx={MENU_ICON_BOX_SX('#C084FC')}>
                  <SkipNextOutlined sx={{ fontSize: MENU_ICON_SIZE }} />
                </Box>
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

            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPage('subtitles');
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
                <Box sx={MENU_ICON_BOX_SX('#9F7AEA')}>
                  <SubtitlesOutlined sx={{ fontSize: MENU_ICON_SIZE }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Субтитры
                  </Typography>
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '11px',
                      display: 'block',
                    }}
                  >
                    {(() => {
                      if (subtitleTracks.length === 0) return 'Недоступны';

                      const active = subtitleTracks.find(
                        (track) => track.name === subtitleSettings.trackName,
                      );
                      return active ? active.name : 'Выключены';
                    })()}
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
                  {(() => {
                    const tag = getQualityTagFromResolution(option.value);
                    const tagColor = getQualityTagColor(tag);
                    return <Box sx={QUALITY_TAG_SX(tagColor)}>{tag}</Box>;
                  })()}
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
                      fontSize: MENU_ICON_SIZE,
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

        {currentPage === 'subtitles' && (
          <Box sx={{ minWidth: 240 }}>
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
                Субтитры
              </Typography>
            </Box>

            {subtitleTracks.length === 0 && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  px: 1.5,
                  py: 1,
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '11px',
                }}
              >
                У выбранной озвучки нет субтитров
              </Typography>
            )}

            {[{ id: -1, name: '' }, ...subtitleTracks].map((track) => {
              const trackName = track.name || null;
              const isSelected = subtitleSettings.trackName === trackName;

              if (track.id === -1 && subtitleTracks.length === 0) return null;

              return (
                <MenuItem
                  key={track.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSubtitleTrackChange?.(trackName);
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
                  }}
                  selected={isSelected}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{ flex: 1, fontWeight: isSelected ? 600 : 500 }}
                    >
                      {trackName || 'Выключить'}
                    </Typography>
                    {isSelected && (
                      <CheckRounded sx={{ fontSize: 16, color: '#BB86FC' }} />
                    )}
                  </Box>
                </MenuItem>
              );
            })}

            <Divider />

            <Box sx={{ px: 1.5, py: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '11px',
                  mb: 0.5,
                  display: 'block',
                }}
              >
                Размер
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
                {SUBTITLES_FONT_SCALES.map((scale) => (
                  <Box
                    key={scale}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSubtitleSettingsChange?.({ fontScale: scale });
                    }}
                    sx={CHIP_SX(subtitleSettings.fontScale === scale)}
                  >
                    {`${scale}x`}
                  </Box>
                ))}
              </Box>

              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '11px',
                  mb: 0.5,
                  display: 'block',
                }}
              >
                Фон и обводка
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
                {SUBTITLES_OUTLINE_MODES.map((mode) => (
                  <Box
                    key={mode.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSubtitleSettingsChange?.({ outline: mode.value });
                    }}
                    sx={CHIP_SX(subtitleSettings.outline === mode.value)}
                  >
                    {mode.label}
                  </Box>
                ))}
              </Box>

              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '11px',
                  mb: 0.5,
                  display: 'block',
                }}
              >
                Смещение вверх
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {SUBTITLES_OFFSETS.map((offset) => (
                  <Box
                    key={offset}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSubtitleSettingsChange?.({ offsetY: offset });
                    }}
                    sx={CHIP_SX(subtitleSettings.offsetY === offset)}
                  >
                    {offset}
                  </Box>
                ))}
              </Box>
            </Box>
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
  subtitleTracks: [],
  subtitleSettings: SUBTITLES_DEFAULT_SETTINGS,
  onSubtitleTrackChange: undefined,
  onSubtitleSettingsChange: undefined,
};

export default SettingsMenu;

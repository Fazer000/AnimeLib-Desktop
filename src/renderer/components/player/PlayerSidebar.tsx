import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Typography,
  useTheme,
  Tabs,
  Tab,
} from '@mui/material';
import { KeyboardRounded } from '@mui/icons-material';
import { Player } from '../../api/animeApi';
import { PlayerSelectionManager } from '../../services/player/PlayerSelectionManager';
import { SIDEBAR_WIDTH_CSS, PLAYER_TYPE_KODIK } from '../../../constants';
import { getQualityTagColor } from '../../utils/videoHelpers';
import ControlTooltip from './ControlTooltip';
import HotkeysDialog from './HotkeysDialog';

interface PlayerSidebarProps {
  players: Player[];
  selectedPlayer: Player | null;
  selectedPlayerType: string;
  loading: boolean;
  onPlayerSelect: (player: Player) => void;
  onPlayerTypeSelect: (type: string) => void;
  isCollapsed?: boolean;
}

/**
 * Сайдбар выбора озвучки и плеера
 */
function PlayerSidebarRefactored({
  players,
  selectedPlayer,
  selectedPlayerType,
  loading,
  onPlayerSelect,
  onPlayerTypeSelect,
  isCollapsed = false,
}: PlayerSidebarProps) {
  const theme = useTheme();
  const [hotkeysOpen, setHotkeysOpen] = useState<boolean>(false);

  const groupedPlayers = PlayerSelectionManager.groupPlayersByType(players);
  const sortedPlayerTypes =
    PlayerSelectionManager.getSortedPlayerTypes(groupedPlayers);

  const currentTabIndex = sortedPlayerTypes.indexOf(selectedPlayerType);
  const tabValue = currentTabIndex >= 0 ? currentTabIndex : 0;

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    const newPlayerType = sortedPlayerTypes[newValue];
    if (newPlayerType) {
      onPlayerTypeSelect(newPlayerType);
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: isCollapsed ? '0px' : SIDEBAR_WIDTH_CSS,
        height: 'calc(100% - 16px)',
        margin: 1,
        marginLeft: isCollapsed ? 0 : 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isCollapsed ? 'none' : '0 0 10px 0 rgba(0, 0, 0, 0.4)',
        borderRadius: 2,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <Box
        sx={{
          backgroundColor: theme.palette.customColors.dtPrimaryColor,
          mb: 1,
          borderRadius: 2,
          opacity: isCollapsed ? 0 : 1,
          visibility: isCollapsed ? 'hidden' : 'visible',
          transition: 'opacity 0.2s ease, visibility 0.2s ease',
        }}
      >
        <Box
          sx={{
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              color: theme.palette.customColors.dtPrimaryTextColor,
              fontWeight: 600,
            }}
          >
            Плеер
          </Typography>

          <ControlTooltip title="Горячие клавиши" placement="left">
            <IconButton
              size="small"
              aria-label="Горячие клавиши"
              onClick={() => setHotkeysOpen(true)}
              sx={{
                p: 0.5,
                color: theme.palette.customColors.dtPrimaryTextColor,
                opacity: 0.65,
                '&:hover': { opacity: 1 },
              }}
            >
              <KeyboardRounded sx={{ fontSize: 20 }} />
            </IconButton>
          </ControlTooltip>
        </Box>

        <Box
          sx={{
            height: '40px',
          }}
        >
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            TabIndicatorProps={{
              style: {
                display: 'flex',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                bottom: 3,
              },
              children: (
                <Box
                  sx={{
                    width: '70%',
                    height: 3,
                    backgroundColor:
                      theme.palette.customColors.dtSecondaryColor,
                    borderRadius: '8px',
                  }}
                />
              ),
            }}
            sx={{
              minHeight: 11,
              '& .MuiTabs-flexContainer': {
                gap: 0,
              },
            }}
          >
            {sortedPlayerTypes.map((playerType, index) => (
              <Tab
                key={playerType}
                disableRipple={false}
                TouchRippleProps={{
                  style: {
                    color: theme.palette.customColors.dtSecondaryColor,
                  },
                }}
                label={
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    <Typography
                      variant="body2"
                      className="tab-text"
                      sx={{
                        fontSize: '0.8125rem',
                        fontWeight: tabValue === index ? 600 : 500,
                        textTransform: 'none',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      {playerType}
                    </Typography>
                  </Box>
                }
                sx={{
                  minHeight: 40,
                  padding: '8px 12px',
                  color: theme.palette.customColors.dtPrimaryTextColor,
                  borderRadius: '8px',
                  margin: '0 4px',
                  position: 'relative',
                  overflow: 'hidden',
                  '&.Mui-selected': {
                    color: theme.palette.customColors.dtSecondaryColor,
                    '&::before': {
                      opacity: 1,
                      transform: 'scale(1)',
                    },
                  },
                  '&:hover': {
                    backgroundColor: `${theme.palette.customColors.dtSecondaryColor}08`,
                    transform: 'translateY(-1px)',
                    '&::before': {
                      opacity: 0.3,
                    },
                    '& .tab-text': {
                      '&::after': {
                        width: '60%',
                      },
                    },
                  },
                  '&:active': {
                    transform: 'scale(0.96)',
                    transition: 'all 0.1s ease',
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `linear-gradient(135deg, ${theme.palette.customColors.dtSecondaryColor}20, ${theme.palette.customColors.dtSecondaryColor}05)`,
                    borderRadius: '8px',
                    opacity: 0,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: -1,
                  },
                }}
              />
            ))}
          </Tabs>
        </Box>
      </Box>
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          position: 'relative',
          backgroundColor: theme.palette.customColors.dtPrimaryColor,
          borderRadius: 2,
          opacity: isCollapsed ? 0 : 1,
          visibility: isCollapsed ? 'hidden' : 'visible',
          transition: 'opacity 0.2s ease, visibility 0.2s ease',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: theme.palette.customColors.dtAlphaBorderColor,
            borderRadius: '4px',
            '&:hover': {
              background: theme.palette.customColors.dtBorderColor,
            },
          },
        }}
      >
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(28, 28, 28, 0.8)',
              zIndex: 10,
            }}
          >
            <CircularProgress
              size={24}
              sx={{
                color: theme.palette.customColors.dtSecondaryColor,
              }}
            />
          </Box>
        )}

        {selectedPlayerType && groupedPlayers[selectedPlayerType] && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
              mt: 0.25,
            }}
          >
            {groupedPlayers[selectedPlayerType].map((player) => {
              const maxQuality = PlayerSelectionManager.getMaxQuality(player);
              const qualityTag =
                PlayerSelectionManager.getQualityTag(maxQuality) ||
                (player.player === PLAYER_TYPE_KODIK ? 'HD' : '');
              const isSubtitlesOnly =
                PlayerSelectionManager.isSubtitlesOnly(player);
              const isSelected = selectedPlayer?.id === player.id;

              return (
                <Button
                  key={player.id}
                  onClick={() => onPlayerSelect(player)}
                  disableRipple={false}
                  TouchRippleProps={{
                    style: {
                      color: theme.palette.customColors.dtSecondaryColor,
                    },
                  }}
                  sx={{
                    width: '100%',
                    height: '40px',
                    gap: 1,
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    '&:active': {
                      transform: 'scale(0.96)',
                      transition: 'all 0.1s ease',
                    },
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      padding: '6px 12px',
                      borderRadius: 2,
                      width: '100%',
                      textAlign: 'left',
                      fontWeight: 500,
                      color: isSelected
                        ? theme.palette.customColors.dtSecondaryTextColor
                        : theme.palette.customColors.dtPrimaryTextColor,
                      fontSize: '0.8125rem',
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      backgroundColor: isSelected
                        ? 'rgba(116, 116, 128, .1)'
                        : 'transparent',
                      '&:hover': {
                        backgroundColor: 'rgba(116, 116, 128, .1)',
                      },
                    }}
                  >
                    {player.team.name}
                  </Typography>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      flexShrink: 0,
                    }}
                  >
                    {isSubtitlesOnly && (
                      <Box
                        sx={{
                          color: theme.palette.customColors.dtPrimaryTextColor,
                          backgroundColor: 'rgba(116, 116, 128, 0.24)',
                          padding: '2px 8px',
                          borderRadius: 2,
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          letterSpacing: '0.03em',
                        }}
                      >
                        SUB
                      </Box>
                    )}

                    {qualityTag && (
                      <Box
                        sx={{
                          color: getQualityTagColor(qualityTag),
                          padding: '2px 8px',
                          borderRadius: 2,
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          border: `1px solid ${getQualityTagColor(qualityTag)}59`,
                        }}
                      >
                        {qualityTag}
                      </Box>
                    )}
                  </Box>
                </Button>
              );
            })}
          </Box>
        )}

        {players.length === 0 && !loading && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              p: 3,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.customColors.dtAccentTextColor,
                textAlign: 'center',
              }}
            >
              Нет доступных озвучек
            </Typography>
          </Box>
        )}
      </Box>

      <HotkeysDialog open={hotkeysOpen} onClose={() => setHotkeysOpen(false)} />
    </Box>
  );
}

PlayerSidebarRefactored.defaultProps = {
  isCollapsed: false,
};

export default React.memo(PlayerSidebarRefactored);

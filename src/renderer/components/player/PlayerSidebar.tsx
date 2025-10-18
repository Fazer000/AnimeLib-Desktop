/* eslint-disable no-console */
import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  useTheme,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import { BookmarkAddRounded } from '@mui/icons-material';
import { Player } from '../../api/animeApi';
import { PlayerSelectionManager } from '../../services/player/PlayerSelectionManager';

interface PlayerSidebarProps {
  players: Player[];
  selectedPlayer: Player | null;
  selectedPlayerType: string;
  loading: boolean;
  onPlayerSelect: (player: Player) => void;
  onPlayerTypeSelect: (type: string) => void;
  onSaveBookmark?: () => void;
  hasBookmark?: boolean;
  isCollapsed?: boolean;
}

/**
 * PlayerSidebar - Redesigned Material Design sidebar
 *
 * Features:
 * - Clean Material Design interface
 * - Theme-based colors
 * - Smooth animations
 * - Better spacing and typography
 */
function PlayerSidebarRefactored({
  players,
  selectedPlayer,
  selectedPlayerType,
  loading,
  onPlayerSelect,
  onPlayerTypeSelect,
  onSaveBookmark,
  hasBookmark,
  isCollapsed = false,
}: PlayerSidebarProps) {
  const theme = useTheme();

  // Group players by type
  const groupedPlayers = PlayerSelectionManager.groupPlayersByType(players);
  const sortedPlayerTypes =
    PlayerSelectionManager.getSortedPlayerTypes(groupedPlayers);

  // Find current tab index
  const currentTabIndex = sortedPlayerTypes.indexOf(selectedPlayerType);
  const tabValue = currentTabIndex >= 0 ? currentTabIndex : 0;

  // Handle tab change
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
        width: isCollapsed ? '0px' : '260px',
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
        {/* Header */}
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
            Озвучка
          </Typography>

          {/* Save bookmark button */}
          {onSaveBookmark && (
            <Tooltip title="Сохранить закладку" placement="left">
              <IconButton
                onClick={onSaveBookmark}
                size="small"
                sx={{
                  color: hasBookmark
                    ? '#7C3AED'
                    : theme.palette.customColors.dtPrimaryTextColor,
                  '&:hover': {
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    color: '#7C3AED',
                  },
                }}
              >
                <BookmarkAddRounded fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Player type tabs */}
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
                bottom: 3, // Приподнят на 1px от низа
              },
              children: (
                <Box
                  sx={{
                    width: '70%', // 70% от ширины таба (подстраивается под текст)
                    height: 3,
                    backgroundColor:
                      theme.palette.customColors.dtSecondaryColor,
                    borderRadius: '8px', // Полностью скругленный
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
      {/* Player list */}
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
        {/* Loading indicator */}
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

        {/* Player list for selected type */}
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
                PlayerSelectionManager.getQualityTag(maxQuality);
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

                  {qualityTag && (
                    <Box
                      sx={{
                        color: theme.palette.customColors.dtSecondaryTextColor,
                        padding: '2px 8px',
                        borderRadius: 2,
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        border: `1px solid rgba(124, 58, 237, 0.3)`,
                      }}
                    >
                      {qualityTag}
                    </Box>
                  )}
                </Button>
              );
            })}
          </Box>
        )}

        {/* Empty state */}
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
    </Box>
  );
}

PlayerSidebarRefactored.defaultProps = {
  onSaveBookmark: undefined,
  hasBookmark: false,
  isCollapsed: false,
};

export default React.memo(PlayerSidebarRefactored);

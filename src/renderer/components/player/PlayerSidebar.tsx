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
        width: '260px',
        height: 'calc(100% - 16px)',
        borderRadius: 2,
        margin: 1,
        backgroundColor: theme.palette.customColors.dtPrimaryColor,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 1.5,
          borderBottom: `1px solid ${theme.palette.customColors.dtBorderColor}`,
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
          borderBottom: `1px solid ${theme.palette.customColors.dtBorderColor}`,
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
                  backgroundColor: theme.palette.customColors.dtSecondaryColor,
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
                    sx={{
                      fontSize: '0.8125rem',
                      fontWeight: tabValue === index ? 600 : 500,
                      textTransform: 'none',
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
                '&.Mui-selected': {
                  color: theme.palette.customColors.dtSecondaryColor,
                },
                '&:hover': {
                  backgroundColor:
                    theme.palette.customColors.dtAlphaPrimaryColor,
                },
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </Tabs>
      </Box>

      {/* Player list */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          position: 'relative',
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
                  sx={{
                    width: '100%',
                    height: '40px',
                    gap: 1,
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      padding: '6px 12px',
                      borderRadius: '8px',
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
                        borderRadius: '4px',
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        backgroundColor: 'rgba(124, 58, 237, 0.1)',
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
};

export default PlayerSidebarRefactored;

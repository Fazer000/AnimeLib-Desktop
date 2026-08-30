import React from 'react';
import {
  Box,
  Checkbox,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from '@mui/material';
import { DownloadDoneRounded } from '@mui/icons-material';
import { Episode, Player } from '../../api/animeApi';
import {
  OFFLINE_DOWNLOADABLE_PLAYER,
  OFFLINE_DOWNLOADABLE_PLAYERS,
  OFFLINE_FONT,
  OFFLINE_ICON,
} from '../../../constants';
import {
  ACCENT,
  DANGER,
  SUCCESS_MID,
  SURFACE_RAISED,
  WHITE,
} from '../../theme/palette';

export type KodikQualityMap = Record<number, string[]>;

interface EpisodeSelectionListProps {
  episodes: Episode[];
  selectedIds: number[];
  teams: string[];
  teamName: string;
  defaultQuality: string;
  defaultQualities: string[];
  playersByEpisode: Record<number, Player[]>;
  kodikQualities: KodikQualityMap;
  loadingIds: number[];
  qualityByEpisode: Record<number, string>;
  downloadedIds: number[];
  onToggle: (episodeId: number, extend: boolean) => void;
  onToggleAll: () => void;
  onTeamChange: (teamName: string) => void;
  onDefaultQualityChange: (quality: string) => void;
  onEpisodeQualityChange: (episodeId: number, quality: string) => void;
}

const SELECT_SX = {
  fontSize: OFFLINE_FONT.episode,
  color: WHITE,
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255,255,255,0.18)',
  },
  '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.6)' },
};

const LABEL_SX = {
  fontSize: OFFLINE_FONT.episode,
  color: 'rgba(255,255,255,0.55)',
  '&.Mui-focused': { color: ACCENT },
};

const CHECKBOX_SX = {
  color: 'rgba(255,255,255,0.45)',
  '&.Mui-checked': { color: ACCENT },
  '&.MuiCheckbox-indeterminate': { color: ACCENT },
};

const DOWNLOADED_CHECKBOX_SX = {
  '&.Mui-disabled': { color: SUCCESS_MID },
};

/**
 * Возвращает доступные качества серии для выбранной озвучки
 */
/**
 * Выбирает плеер команды с приоритетом прямого источника
 */
export const resolveTeamPlayer = (
  players: Player[] | undefined,
  teamName: string,
): Player | undefined => {
  const candidates = (players || []).filter(
    (item) =>
      OFFLINE_DOWNLOADABLE_PLAYERS.includes(item.player) &&
      item.team.name === teamName,
  );

  return (
    candidates.find((item) => item.player === OFFLINE_DOWNLOADABLE_PLAYER) ||
    candidates[0]
  );
};

/**
 * Возвращает доступные качества серии для выбранной озвучки
 */
export const getEpisodeQualities = (
  players: Player[] | undefined,
  teamName: string,
  kodikQualities: KodikQualityMap = {},
): string[] => {
  const player = resolveTeamPlayer(players, teamName);

  if (!player) {
    return [];
  }

  const list =
    player.player === OFFLINE_DOWNLOADABLE_PLAYER
      ? (player.video?.quality || []).map((item) => `${item.quality}p`)
      : kodikQualities[player.id] || [];

  return [...list].sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
};

/**
 * Подбирает качество серии по умолчанию: точное совпадение или ближайшее меньшее
 */
export const resolveEpisodeQuality = (
  qualities: string[],
  preferred: string,
): string => {
  if (qualities.length === 0) {
    return '';
  }

  if (qualities.includes(preferred)) {
    return preferred;
  }

  const target = parseInt(preferred, 10);

  if (!target) {
    return qualities[0];
  }

  return (
    qualities.find((item) => parseInt(item, 10) <= target) ||
    qualities[qualities.length - 1]
  );
};

/**
 * Выбор серий, озвучки и качества для загрузки
 */
function EpisodeSelectionList({
  episodes,
  selectedIds,
  teams,
  teamName,
  defaultQuality,
  defaultQualities,
  playersByEpisode,
  kodikQualities,
  loadingIds,
  qualityByEpisode,
  downloadedIds,
  onToggle,
  onToggleAll,
  onTeamChange,
  onDefaultQualityChange,
  onEpisodeQualityChange,
}: EpisodeSelectionListProps) {
  const selectableCount = episodes.filter(
    (item) => !downloadedIds.includes(item.id),
  ).length;
  const allSelected =
    selectableCount > 0 && selectedIds.length === selectableCount;

  return (
    <Box>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          mx: -3,
          px: 3,
          pt: 2,
          backgroundColor: SURFACE_RAISED,
        }}
      >
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, mt: 0.5 }}>
          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel id="offline-team-label" sx={LABEL_SX}>
              Озвучка
            </InputLabel>
            <Select
              labelId="offline-team-label"
              label="Озвучка"
              value={teams.includes(teamName) ? teamName : ''}
              onChange={(event) => onTeamChange(event.target.value)}
              displayEmpty
              sx={SELECT_SX}
            >
              {teams.length === 0 && (
                <MenuItem value="">Озвучки не найдены</MenuItem>
              )}
              {teams.map((team) => (
                <MenuItem key={team} value={team}>
                  {team}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ width: 200 }}>
            <InputLabel id="offline-quality-label" shrink sx={LABEL_SX}>
              Общее качество
            </InputLabel>
            <Select
              labelId="offline-quality-label"
              label="Общее качество"
              value={
                defaultQualities.includes(defaultQuality) ? defaultQuality : ''
              }
              onChange={(event) => onDefaultQualityChange(event.target.value)}
              displayEmpty
              notched
              sx={SELECT_SX}
            >
              {defaultQualities.length === 0 && <MenuItem value="">—</MenuItem>}
              {defaultQualities.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            pb: 0.5,
          }}
        >
          <Checkbox
            size="small"
            checked={allSelected}
            disabled={selectableCount === 0}
            indeterminate={selectedIds.length > 0 && !allSelected}
            onChange={onToggleAll}
            sx={CHECKBOX_SX}
          />
          <Typography sx={{ fontSize: OFFLINE_FONT.body }}>
            {`Выбрать все · выбрано ${selectedIds.length}`}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ pr: 1, pt: 0.5 }}>
        {episodes.map((episode) => {
          const isSelected = selectedIds.includes(episode.id);
          const isLoading = loadingIds.includes(episode.id);
          const qualities = getEpisodeQualities(
            playersByEpisode[episode.id],
            teamName,
            kodikQualities,
          );
          const isDownloaded = downloadedIds.includes(episode.id);
          const player = resolveTeamPlayer(
            playersByEpisode[episode.id],
            teamName,
          );
          const isHls = Boolean(player) && player?.player !== 'Animelib';

          return (
            <Box
              key={episode.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 0.25,
                gap: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 0,
                  flex: 1,
                }}
              >
                {isDownloaded ? (
                  <Tooltip title="Серия уже скачана" arrow>
                    <Box sx={{ display: 'flex' }}>
                      <Checkbox
                        size="small"
                        checked
                        disabled
                        checkedIcon={
                          <DownloadDoneRounded
                            sx={{ fontSize: OFFLINE_ICON.md }}
                          />
                        }
                        sx={DOWNLOADED_CHECKBOX_SX}
                      />
                    </Box>
                  </Tooltip>
                ) : (
                  <Checkbox
                    size="small"
                    checked={isSelected}
                    onChange={(event) =>
                      onToggle(
                        episode.id,
                        Boolean((event.nativeEvent as MouseEvent).shiftKey),
                      )
                    }
                    sx={CHECKBOX_SX}
                  />
                )}
                <Typography
                  sx={{
                    fontSize: OFFLINE_FONT.body,
                    color: isDownloaded ? 'rgba(255,255,255,0.55)' : 'inherit',
                  }}
                  noWrap
                >
                  {`${episode.number} серия${episode.name ? ` · ${episode.name}` : ''}`}
                </Typography>
                {isSelected && isHls && (
                  <Typography
                    sx={{
                      fontSize: OFFLINE_FONT.hint,
                      color: 'rgba(255,255,255,0.45)',
                      ml: 1.25,
                    }}
                  >
                    Kodik
                  </Typography>
                )}
              </Box>

              {isSelected && isLoading && (
                <CircularProgress size={17} sx={{ color: ACCENT, mr: 1 }} />
              )}

              {isSelected && !isLoading && qualities.length === 0 && (
                <Typography sx={{ fontSize: OFFLINE_FONT.hint, color: DANGER }}>
                  нет озвучки
                </Typography>
              )}

              {isSelected && !isLoading && qualities.length > 0 && (
                <FormControl size="small" sx={{ width: 132, flexShrink: 0 }}>
                  <Select
                    value={
                      qualities.includes(qualityByEpisode[episode.id])
                        ? qualityByEpisode[episode.id]
                        : resolveEpisodeQuality(qualities, defaultQuality)
                    }
                    onChange={(event) =>
                      onEpisodeQualityChange(episode.id, event.target.value)
                    }
                    sx={{ ...SELECT_SX, height: 34 }}
                  >
                    {qualities.map((item) => (
                      <MenuItem key={item} value={item}>
                        {item}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default EpisodeSelectionList;

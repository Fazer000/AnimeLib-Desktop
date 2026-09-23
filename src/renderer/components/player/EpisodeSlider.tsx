import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Button, IconButton, Typography, useTheme } from '@mui/material';
import type { CustomColors } from '@mui/material/styles';
import { Bookmark, ChevronLeft, ChevronRight } from '../icons';
import { Episode } from '../../api/animeApi';
import EpisodeJumpField from './EpisodeJumpField';
import EpisodeStatusBadge from './EpisodeStatusBadge';
import useHorizontalWheelScroll from '../../hooks/useHorizontalWheelScroll';
import { buildEdgeFadeMask } from '../../utils/edgeFade';
import { BLACK } from '../../theme/palette';
import {
  EPISODE_CHIP_FONT,
  EPISODE_CHIP_ICON_FONT,
  EPISODE_CHIP_MARGIN_BOTTOM,
  EPISODE_CHIP_MARGIN_TOP,
  EPISODE_CHIP_MIN_WIDTH,
  EPISODE_SEARCH_BLOCK_WIDTH,
  EPISODE_SLIDER_BUTTON_SIZE,
  EPISODE_SLIDER_EDGE_FADE,
  EPISODE_SLIDER_HEIGHT,
} from '../../../constants';

const sliderButtonSx = (colors: CustomColors) => ({
  flexShrink: 0,
  width: EPISODE_SLIDER_BUTTON_SIZE,
  height: EPISODE_SLIDER_BUTTON_SIZE,
  mt: EPISODE_CHIP_MARGIN_TOP,
  mb: EPISODE_CHIP_MARGIN_BOTTOM,
  color: colors.accentSoftColor,
  backgroundColor: colors.primaryColor,
  border: `1px solid ${colors.lineColor}`,
  '&:hover': { backgroundColor: colors.mutedColor },
});

interface EpisodeSliderProps {
  episodes: Episode[];
  currentEpisodeIndex: number;
  onEpisodeSelect: (index: number) => void;
  bookmarkedEpisodeId: number | null;
}

function EpisodeSliderRefactored({
  episodes,
  currentEpisodeIndex,
  onEpisodeSelect,
  bookmarkedEpisodeId = null,
}: EpisodeSliderProps) {
  const theme = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragMoved, setDragMoved] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; scrollLeft: number }>(
    {
      x: 0,
      scrollLeft: 0,
    },
  );

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const checkScrollState = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
      setIsOverflowing(scrollWidth > clientWidth + 1);
    }
  }, []);

  const scrollToEpisode = useCallback(
    // eslint-disable-next-line no-undef
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      if (!scrollRef.current) return;
      const container = scrollRef.current;
      const button =
        container.querySelectorAll<HTMLElement>('.episode-button')[index];
      if (!button) return;

      const targetScroll =
        button.offsetLeft - container.clientWidth / 2 + button.offsetWidth / 2;

      container.scrollTo({ left: targetScroll, behavior });
      setTimeout(checkScrollState, 300);
    },
    [checkScrollState],
  );

  const scrollToActiveEpisode = useCallback(
    // eslint-disable-next-line no-undef
    (behavior: ScrollBehavior = 'smooth') =>
      scrollToEpisode(currentEpisodeIndex, behavior),
    [currentEpisodeIndex, scrollToEpisode],
  );

  const handlePreview = useCallback(
    (index: number | null) => {
      setPreviewIndex(index);
      scrollToEpisode(index ?? currentEpisodeIndex);
    },
    [currentEpisodeIndex, scrollToEpisode],
  );

  const handleJump = useCallback(
    (index: number) => {
      setPreviewIndex(null);
      onEpisodeSelect(index);
    },
    [onEpisodeSelect],
  );

  const handleScroll = useCallback(
    (direction: 'left' | 'right') => {
      if (scrollRef.current) {
        const scrollAmount = 200;
        const currentScroll = scrollRef.current.scrollLeft;
        const newScroll =
          direction === 'left'
            ? currentScroll - scrollAmount
            : currentScroll + scrollAmount;

        scrollRef.current.scrollTo({
          left: newScroll,
          behavior: 'smooth',
        });

        setTimeout(checkScrollState, 300);
      }
    },
    [checkScrollState],
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragMoved(false);
    setDragStart({
      x: e.pageX,
      scrollLeft: e.currentTarget.scrollLeft,
    });
    (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
    (e.currentTarget as HTMLElement).style.userSelect = 'none';
    (e.currentTarget as HTMLElement).style.scrollBehavior = 'auto';
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX;
      const walk = (x - dragStart.x) * 1;
      e.currentTarget.scrollLeft = dragStart.scrollLeft - walk;

      if (Math.abs(walk) > 5) {
        setDragMoved(true);
      }
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    setIsDragging(false);
    (e.currentTarget as HTMLElement).style.cursor = 'grab';
    (e.currentTarget as HTMLElement).style.userSelect = 'auto';
    (e.currentTarget as HTMLElement).style.scrollBehavior = 'smooth';

    setTimeout(() => setDragMoved(false), 100);
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    setIsDragging(false);
    (e.currentTarget as HTMLElement).style.cursor = 'grab';
    (e.currentTarget as HTMLElement).style.userSelect = 'auto';
    (e.currentTarget as HTMLElement).style.scrollBehavior = 'smooth';

    setTimeout(() => setDragMoved(false), 100);
  }, []);

  const handleEpisodeClick = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (dragMoved) {
        return;
      }
      onEpisodeSelect(index);
    },
    [dragMoved, onEpisodeSelect],
  );

  useEffect(() => {
    if (episodes.length > 0) {
      setTimeout(() => scrollToActiveEpisode('instant'), 100);
    }
  }, [episodes, scrollToActiveEpisode]);

  useEffect(() => {
    scrollToActiveEpisode('smooth');
  }, [currentEpisodeIndex, scrollToActiveEpisode]);

  const anchorRef = useRef<number>(currentEpisodeIndex);
  anchorRef.current = previewIndex ?? currentEpisodeIndex;

  const scrollToEpisodeRef = useRef(scrollToEpisode);
  scrollToEpisodeRef.current = scrollToEpisode;

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return undefined;

    let lastWidth = element.clientWidth;

    const observer = new ResizeObserver(() => {
      checkScrollState();

      if (element.clientWidth !== lastWidth) {
        lastWidth = element.clientWidth;
        scrollToEpisodeRef.current(anchorRef.current, 'instant');
      }
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [checkScrollState, episodes.length]);

  useHorizontalWheelScroll(scrollRef, episodes.length > 0);

  if (episodes.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'relative',
        height: EPISODE_SLIDER_HEIGHT,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1,
        }}
      >
        {isOverflowing && (
          <EpisodeJumpField
            episodes={episodes}
            onPreview={handlePreview}
            onSelect={handleJump}
          />
        )}

        <IconButton
          onClick={() => handleScroll('left')}
          aria-label="Предыдущие эпизоды"
          sx={{
            ...sliderButtonSx(theme.palette.customColors),
            visibility: canScrollLeft ? 'visible' : 'hidden',
          }}
        >
          <ChevronLeft />
        </IconButton>

        <Box
          ref={scrollRef}
          sx={{
            position: 'relative',
            flex: 1,
            minWidth: 0,
            display: 'flex',
            gap: 1.25,
            overflowX: 'auto',
            overflowY: 'hidden',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollBehavior: 'smooth',
            maskImage: buildEdgeFadeMask(
              canScrollLeft,
              canScrollRight,
              EPISODE_SLIDER_EDGE_FADE,
              BLACK,
            ),
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onScroll={checkScrollState}
        >
          {episodes.map((episode, index) => {
            const isSelected = index === currentEpisodeIndex;
            const isPreview = index === previewIndex && !isSelected;
            const hasBookmark = episode.id === bookmarkedEpisodeId;

            return (
              <Button
                key={episode.id}
                className="episode-button"
                onClick={(e) => handleEpisodeClick(index, e)}
                disableRipple={dragMoved}
                TouchRippleProps={{
                  style: {
                    color: theme.palette.customColors.secondaryColor,
                  },
                }}
                sx={{
                  flex: episodes.length > 6 ? '1' : 'none',
                  minWidth: EPISODE_CHIP_MIN_WIDTH,
                  borderRadius: '6px',
                  backgroundColor: isSelected
                    ? theme.palette.customColors.secondaryColor
                    : theme.palette.primary.main,
                  border: isSelected
                    ? `1px solid ${theme.palette.customColors.secondaryColor}`
                    : `1px solid ${theme.palette.customColors.lineColor}`,
                  ...(isPreview
                    ? {
                        backgroundColor: `rgba(${theme.palette.customColors.accentRgb}, 0.22)`,
                        borderColor: theme.palette.customColors.accentSoftColor,
                      }
                    : {}),
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  mt: EPISODE_CHIP_MARGIN_TOP,
                  mb: EPISODE_CHIP_MARGIN_BOTTOM,
                  '&:hover': {
                    backgroundColor: isSelected
                      ? theme.palette.customColors.accentHoverColor
                      : `rgba(${theme.palette.customColors.onSurfaceRgb}, 0.08)`,
                  },
                  '&:active': {
                    transform: 'scale(0.96)',
                    transition: 'all 0.1s ease',
                  },
                }}
              >
                <Box
                  sx={{
                    padding: '4px !important',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    flexWrap: 'nowrap',
                    gap: 0.5,
                  }}
                >
                  {hasBookmark && (
                    <Bookmark
                      sx={{
                        fill: 'currentColor',
                        fontSize: EPISODE_CHIP_ICON_FONT,
                        color: isSelected
                          ? theme.palette.customColors.onAccentColor
                          : theme.palette.customColors.secondaryColor,
                      }}
                    />
                  )}
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 'bold',
                      color: isSelected
                        ? theme.palette.customColors.onAccentColor
                        : theme.palette.customColors.primaryTextColor,
                      textTransform: 'none',
                      fontSize: EPISODE_CHIP_FONT,
                      textWrap: 'nowrap',
                    }}
                  >
                    {episode.number}
                  </Typography>
                  <EpisodeStatusBadge status={episode.status} />
                </Box>
              </Button>
            );
          })}
        </Box>

        <IconButton
          onClick={() => handleScroll('right')}
          aria-label="Следующие эпизоды"
          sx={{
            ...sliderButtonSx(theme.palette.customColors),
            visibility: canScrollRight ? 'visible' : 'hidden',
          }}
        >
          <ChevronRight />
        </IconButton>

        {isOverflowing && (
          <Box sx={{ width: EPISODE_SEARCH_BLOCK_WIDTH, flexShrink: 0 }} />
        )}
      </Box>
    </Box>
  );
}

export default React.memo(EpisodeSliderRefactored);

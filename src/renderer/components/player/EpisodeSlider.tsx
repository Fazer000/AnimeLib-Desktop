/* eslint-disable no-console */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Button, IconButton, Typography, useTheme } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { Episode } from '../../api/animeApi';

interface EpisodeSliderProps {
  episodes: Episode[];
  currentEpisodeIndex: number;
  onEpisodeSelect: (index: number) => void;
}

/**
 * EpisodeSlider - Redesigned Material Design episode selector
 *
 * Features:
 * - Clean Material Design interface
 * - Theme-based colors
 * - Smooth animations and transitions
 * - Better visual hierarchy
 */
function EpisodeSliderRefactored({
  episodes,
  currentEpisodeIndex,
  onEpisodeSelect,
}: EpisodeSliderProps) {
  const theme = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Drag states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; scrollLeft: number }>(
    {
      x: 0,
      scrollLeft: 0,
    },
  );

  // Scroll states
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  /**
   * Check if scrolling is possible in either direction
   */
  const checkScrollState = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, []);

  /**
   * Scroll left or right by a fixed amount
   */
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

  /**
   * Drag-to-scroll handlers
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.pageX,
      scrollLeft: e.currentTarget.scrollLeft,
    });
    (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX;
      const walk = (x - dragStart.x) * 2;
      e.currentTarget.scrollLeft = dragStart.scrollLeft - walk;
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    setIsDragging(false);
    (e.currentTarget as HTMLElement).style.cursor = 'grab';
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    setIsDragging(false);
    (e.currentTarget as HTMLElement).style.cursor = 'grab';
  }, []);

  const handleEpisodeClick = useCallback(
    (index: number) => {
      if (!isDragging) {
        onEpisodeSelect(index);
      }
    },
    [isDragging, onEpisodeSelect],
  );

  /**
   * Check scroll state when episodes change
   */
  useEffect(() => {
    if (episodes.length > 0) {
      setTimeout(checkScrollState, 100);
    }
  }, [episodes, checkScrollState]);

  if (episodes.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        backgroundColor: theme.palette.primary.dark,
        position: 'relative',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          pt: 0.25,
          pb: 1.25,
        }}
      >
        {/* Left arrow */}
        {canScrollLeft && (
          <IconButton
            onClick={() => handleScroll('left')}
            sx={{
              position: 'absolute',
              left: 10,
              zIndex: 2,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: theme.palette.customColors.dtSecondaryColor,
              width: 32,
              height: 32,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
              },
            }}
          >
            <ChevronLeft />
          </IconButton>
        )}

        {/* Left gradient */}
        {canScrollLeft && (
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 40,
              background: `linear-gradient(to right, ${theme.palette.primary.dark}, transparent)`,
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Episodes container */}
        <Box
          ref={scrollRef}
          sx={{
            display: 'flex',
            width: '100%',
            gap: 1.25,
            px: 1,
            overflowX: 'auto',
            overflowY: 'hidden',
            cursor: 'grab',
            userSelect: 'none',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onScroll={checkScrollState}
        >
          {episodes.map((episode, index) => {
            const isSelected = index === currentEpisodeIndex;

            return (
              <Button
                key={episode.id}
                onClick={() => handleEpisodeClick(index)}
                sx={{
                  flex: episodes.length > 6 ? '1' : 'none',
                  minWidth: '100px',
                  borderRadius: 10,
                  backgroundColor: theme.palette.primary.main,
                  border: isSelected
                    ? `1px solid ${theme.palette.customColors.dtSecondaryColor}`
                    : 'none',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: isSelected
                      ? 'rgba(124, 58, 237, 0.3)'
                      : 'rgba(255, 255, 255, 0.05)',
                  },
                }}
              >
                <Box
                  sx={{
                    padding: '4px !important',
                    textAlign: 'center',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 'bold',
                      color: isSelected
                        ? theme.palette.customColors.dtSecondaryColor
                        : theme.palette.customColors.dtPrimaryTextColor,
                      textTransform: 'none',
                      fontSize: '0.84rem',
                    }}
                  >
                    {episode.number} эпизод
                  </Typography>
                </Box>
              </Button>
            );
          })}
        </Box>

        {/* Right gradient */}
        {canScrollRight && (
          <Box
            sx={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 40,
              background: `linear-gradient(to left, ${theme.palette.primary.dark}, transparent)`,
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Right arrow */}
        {canScrollRight && (
          <IconButton
            onClick={() => handleScroll('right')}
            sx={{
              position: 'absolute',
              right: 10,
              zIndex: 2,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: theme.palette.customColors.dtSecondaryColor,
              width: 32,
              height: 32,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
              },
            }}
          >
            <ChevronRight />
          </IconButton>
        )}
      </Box>
    </Box>
  );
}

export default EpisodeSliderRefactored;

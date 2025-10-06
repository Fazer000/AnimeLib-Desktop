/* eslint-disable no-console */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Button, IconButton, Typography, useTheme } from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  BookmarkRounded,
} from '@mui/icons-material';
import { Episode } from '../../api/animeApi';

interface EpisodeSliderProps {
  episodes: Episode[];
  currentEpisodeIndex: number;
  onEpisodeSelect: (index: number) => void;
  bookmarkedEpisodeId: number | null;
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
  bookmarkedEpisodeId = null,
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

  // Wheel scroll state
  const [isWheelScrolling, setIsWheelScrolling] = useState<boolean>(false);

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
    // Only start dragging if clicking on the container, not on buttons
    if (
      e.target === e.currentTarget ||
      (e.target as HTMLElement).closest('.episode-button')
    ) {
      return;
    }

    setIsDragging(true);
    setDragStart({
      x: e.pageX,
      scrollLeft: e.currentTarget.scrollLeft,
    });
    (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
    (e.currentTarget as HTMLElement).style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX;
      const walk = (x - dragStart.x) * 1.5; // Reduced sensitivity for smoother dragging
      e.currentTarget.scrollLeft = dragStart.scrollLeft - walk;
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    setIsDragging(false);
    (e.currentTarget as HTMLElement).style.cursor = 'grab';
    (e.currentTarget as HTMLElement).style.userSelect = 'auto';
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    setIsDragging(false);
    (e.currentTarget as HTMLElement).style.cursor = 'grab';
    (e.currentTarget as HTMLElement).style.userSelect = 'auto';
  }, []);

  const handleEpisodeClick = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
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

  /**
   * Add native wheel event listener to prevent page scroll
   */
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return undefined;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isWheelScrolling) return;

      setIsWheelScrolling(true);

      const scrollAmount = e.deltaY > 0 ? 150 : -150;
      const currentScroll = element.scrollLeft;
      const newScroll = currentScroll + scrollAmount;

      element.scrollTo({
        left: newScroll,
        behavior: 'smooth',
      });

      setTimeout(() => {
        setIsWheelScrolling(false);
        checkScrollState();
      }, 200);
    };

    element.addEventListener('wheel', handleNativeWheel, { passive: false });

    return () => {
      element.removeEventListener('wheel', handleNativeWheel);
    };
  }, [isWheelScrolling, checkScrollState]);

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
              mb: 0.85,
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
              mb: 0.85,
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
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            // Smooth scrolling
            scrollBehavior: 'smooth',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onScroll={checkScrollState}
        >
          {episodes.map((episode, index) => {
            const isSelected = index === currentEpisodeIndex;
            const hasBookmark = episode.id === bookmarkedEpisodeId;

            return (
              <Button
                key={episode.id}
                className="episode-button"
                onClick={(e) => handleEpisodeClick(index, e)}
                disableRipple={false}
                TouchRippleProps={{
                  style: {
                    color: theme.palette.customColors.dtSecondaryColor,
                  },
                }}
                sx={{
                  flex: episodes.length > 6 ? '1' : 'none',
                  minWidth: '100px',
                  borderRadius: 10,
                  backgroundColor: theme.palette.primary.main,
                  border: isSelected
                    ? `1px solid ${theme.palette.customColors.dtSecondaryColor}`
                    : '1px solid transparent',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.4)',
                  mt: 1.25,
                  mb: 2,
                  '&:hover': {
                    backgroundColor: isSelected
                      ? 'rgba(124, 58, 237, 0.2)'
                      : 'rgba(255, 255, 255, 0.08)',
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
                    background: isSelected
                      ? `linear-gradient(135deg, ${theme.palette.customColors.dtSecondaryColor}20, transparent)`
                      : 'transparent',
                    borderRadius: 10,
                    opacity: isSelected ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                    zIndex: -1,
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
                    <BookmarkRounded
                      sx={{
                        fontSize: '0.9rem',
                        color: theme.palette.customColors.dtSecondaryColor,
                      }}
                    />
                  )}
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 'bold',
                      color: isSelected
                        ? theme.palette.customColors.dtSecondaryColor
                        : theme.palette.customColors.dtPrimaryTextColor,
                      textTransform: 'none',
                      fontSize: '0.84rem',
                      textWrap: 'nowrap',
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
              mb: 0.85,
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
              mb: 0.85,
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

export default React.memo(EpisodeSliderRefactored);

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { BookmarkRounded } from '@mui/icons-material';

interface Episode {
  id: number;
  number: string;
  name: string;
}

interface EpisodeCarouselProps {
  episodes: Episode[];
  currentEpisodeIndex: number;
  showEpisodes: boolean;
  onEpisodeSelect: (index: number) => void;
  onMenuOpenChange: (isOpen: boolean) => void;
  bookmarkedEpisodeId?: number | null;
}

/**
 * Карусель эпизодов в fullscreen режиме
 */
function ControlsEpisodeSlider({
  episodes,
  currentEpisodeIndex,
  showEpisodes,
  onEpisodeSelect,
  onMenuOpenChange,
  bookmarkedEpisodeId = null,
}: EpisodeCarouselProps) {
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
      const walk = (x - dragStart.x) * 1.2; // Reduced sensitivity for smoother dragging
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
        onMenuOpenChange(false);
      }
    },
    [isDragging, onEpisodeSelect, onMenuOpenChange],
  );

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

      const scrollAmount = e.deltaY > 0 ? 120 : -120;
      const currentScroll = element.scrollLeft;
      const newScroll = currentScroll + scrollAmount;

      element.scrollTo({
        left: newScroll,
        behavior: 'smooth',
      });

      setTimeout(() => {
        setIsWheelScrolling(false);
      }, 150);
    };

    element.addEventListener('wheel', handleNativeWheel, { passive: false });

    return () => {
      element.removeEventListener('wheel', handleNativeWheel);
    };
  }, [isWheelScrolling]);

  if (!episodes || episodes.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        transform: showEpisodes ? 'translateY(0)' : 'translateY(100%)',
        opacity: showEpisodes ? 1 : 0,
        transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out',
        padding: '12px 0px',
        maxHeight: '80px',
        background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.7))',
        zIndex: 999,
      }}
    >
      <Box
        ref={scrollRef}
        sx={{
          display: 'flex',
          alignItems: 'center',
          overflowX: 'auto',
          overflowY: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          scrollBehavior: 'smooth',
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
      >
        {episodes.map((episode, index) => {
          const isSelected = index === currentEpisodeIndex;
          const hasBookmark = episode.id === bookmarkedEpisodeId;
          return (
            <Button
              key={episode.id}
              className="episode-button"
              onClick={(e) => handleEpisodeClick(index, e)}
              sx={{
                padding: '8px 12px',
                mx: 1.25,
                minWidth: '100px',
                borderRadius: 10,
                cursor: 'pointer',
                flex: episodes.length > 6 ? '1' : 'none',
                backgroundColor: 'rgba(20, 20, 20, 0.45)',
                border: isSelected
                  ? '1px solid #7C3AED'
                  : '1px solid rgba(116, 116, 128, 0.33)',
                color: isSelected
                  ? '#7C3AED'
                  : theme.palette.customColors.dtPrimaryTextColor,
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  backgroundColor: isSelected
                    ? 'rgba(124, 58, 237, 0.35)'
                    : 'rgba(116, 116, 128, 0.3)',
                },
                '&:active': {
                  transform: 'translateY(0px) scale(0.96)',
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
                    ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.2), transparent)'
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
                  display: 'flex',
                  alignItems: 'center',
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
                  variant="caption"
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
    </Box>
  );
}

ControlsEpisodeSlider.defaultProps = {
  bookmarkedEpisodeId: null,
};

export default React.memo(ControlsEpisodeSlider);

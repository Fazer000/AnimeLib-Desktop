import React, { useRef, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  useTheme,
  IconButton,
  ButtonBase,
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { RelatedAnime as RelatedAnimeType } from '../../api/animeApi';
import useImageWithReferer from '../../hooks/useImageWithReferer';

interface RelatedAnimeProps {
  relatedAnime: RelatedAnimeType[];
  onAnimeClick: (slugUrl: string, animeId: number) => void;
}

/**
 * Компонент карточки связанного аниме
 */
function RelatedAnimeCard({
  item,
  onClick,
  isDragMoving,
}: {
  item: RelatedAnimeType;
  onClick: () => void;
  isDragMoving: boolean;
}) {
  const theme = useTheme();
  const imageUrl = useImageWithReferer(item.media.cover.default);
  const isAnime = item.media.model === 'anime';

  const handleClick = (e: React.MouseEvent) => {
    // Не вызываем клик если был драг или если не аниме
    if (isDragMoving || !isAnime) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick();
  };

  return (
    <ButtonBase
      className="related-anime-card"
      onClick={handleClick}
      disableRipple={isDragMoving}
      sx={{
        minWidth: 400,
        maxWidth: 400,
        height: 140,
        display: 'flex',
        backgroundColor: theme.palette.customColors.dtPrimaryColor,
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        textAlign: 'left',
        justifyContent: 'flex-start',
        cursor: isAnime ? 'pointer' : 'not-allowed',
        opacity: isAnime ? 1 : 0.5,
        '&:hover': isAnime
          ? {}
          : {
              opacity: 0.5,
            },
      }}
    >
      {/* Обложка слева */}
      <Box
        sx={{
          width: 100,
          height: '100%',
          flexShrink: 0,
          position: 'relative',
          backgroundColor: '#1a1a1a',
        }}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt={item.media.rus_name || item.media.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
      </Box>

      {/* Информация справа */}
      <Box
        sx={{
          flex: 1,
          padding: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Верхняя часть */}
        <Box>
          {/* Тип связи */}
          <Typography
            sx={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: theme.palette.customColors.dtAccentTextColor,
              textTransform: 'uppercase',
              marginBottom: 0.5,
            }}
          >
            {item.related_type.label}
          </Typography>

          {/* Название */}
          <Typography
            sx={{
              fontSize: '1rem',
              fontWeight: 600,
              color: theme.palette.customColors.dtPrimaryTextColor,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.3,
              marginBottom: 1,
            }}
          >
            {item.media.rus_name || item.media.name}
          </Typography>
        </Box>

        {/* Нижняя часть */}
        <Box>
          {/* Тип и статус */}
          <Typography
            sx={{
              fontSize: '0.8rem',
              color: theme.palette.customColors.dtAccentTextColor,
            }}
          >
            {item.media.type.label} • {item.media.status.label}
          </Typography>
        </Box>
      </Box>
    </ButtonBase>
  );
}

/**
 * RelatedAnime - карусель связанного аниме
 */
function RelatedAnime({ relatedAnime, onAnimeClick }: RelatedAnimeProps) {
  const theme = useTheme();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Drag states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; scrollLeft: number }>(
    {
      x: 0,
      scrollLeft: 0,
    },
  );
  const [dragMoved, setDragMoved] = useState<boolean>(false);

  const updateScrollButtons = () => {
    if (!scrollContainerRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  // Initialize scroll buttons on mount
  useEffect(() => {
    updateScrollButtons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relatedAnime]);

  if (!relatedAnime || relatedAnime.length === 0) {
    return null;
  }

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = 420; // 400px card width + 20px gap
    const newScrollLeft =
      direction === 'left'
        ? scrollContainerRef.current.scrollLeft - scrollAmount
        : scrollContainerRef.current.scrollLeft + scrollAmount;

    scrollContainerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });

    // Update buttons after scroll animation
    setTimeout(updateScrollButtons, 300);
  };

  // Drag-to-scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragMoved(false);
    setDragStart({
      x: e.pageX,
      scrollLeft: scrollContainerRef.current?.scrollLeft || 0,
    });

    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grabbing';
      scrollContainerRef.current.style.userSelect = 'none';
      scrollContainerRef.current.style.scrollBehavior = 'auto';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;

    e.preventDefault();
    const x = e.pageX;
    const walk = (x - dragStart.x) * 1; // Чувствительность 1:1 для точного следования за курсором
    scrollContainerRef.current.scrollLeft = dragStart.scrollLeft - walk;

    // Если переместили больше чем на 5px, считаем что это драг
    if (Math.abs(walk) > 5) {
      setDragMoved(true);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);

    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
      scrollContainerRef.current.style.userSelect = 'auto';
      scrollContainerRef.current.style.scrollBehavior = 'smooth';
    }

    // Сбрасываем флаг движения через небольшую задержку
    setTimeout(() => setDragMoved(false), 100);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);

    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
      scrollContainerRef.current.style.userSelect = 'auto';
      scrollContainerRef.current.style.scrollBehavior = 'smooth';
    }

    setTimeout(() => setDragMoved(false), 100);
  };

  return (
    <Box
      sx={{
        width: '100%',
        marginTop: 4,
        marginBottom: 4,
        position: 'relative',
      }}
    >
      {/* Заголовок */}
      <Box
        sx={{
          marginBottom: 2,
          paddingLeft: 2,
        }}
      >
        <Typography
          sx={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: theme.palette.customColors.dtPrimaryTextColor,
            fontFamily: 'Open Sans, sans-serif',
          }}
        >
          Связанное
        </Typography>
      </Box>

      {/* Карусель */}
      <Box sx={{ position: 'relative' }}>
        {/* Кнопка влево */}
        {canScrollLeft && (
          <IconButton
            onClick={() => scroll('left')}
            sx={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              color: 'white',
              width: 48,
              height: 48,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
              },
            }}
          >
            <ChevronLeft sx={{ fontSize: 32 }} />
          </IconButton>
        )}

        {/* Контейнер с прокруткой */}
        <Box
          ref={scrollContainerRef}
          onScroll={updateScrollButtons}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          sx={{
            display: 'flex',
            gap: 2.5,
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            paddingLeft: 2,
            paddingRight: 2,
            paddingTop: 1,
            paddingBottom: 1,
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: isDragging ? 'none' : 'auto',
            scrollBehavior: 'smooth',
          }}
        >
          {relatedAnime
            .filter((item) => item && item.media && item.media.id)
            .map((item) => (
              <RelatedAnimeCard
                key={item.media.id}
                item={item}
                onClick={() => onAnimeClick(item.media.slug_url, item.media.id)}
                isDragMoving={dragMoved}
              />
            ))}
        </Box>

        {/* Кнопка вправо */}
        {canScrollRight && (
          <IconButton
            onClick={() => scroll('right')}
            sx={{
              position: 'absolute',
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              color: 'white',
              width: 48,
              height: 48,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
              },
            }}
          >
            <ChevronRight sx={{ fontSize: 32 }} />
          </IconButton>
        )}
      </Box>
    </Box>
  );
}

export default RelatedAnime;

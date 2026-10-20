import React, { ReactNode, useState } from 'react';
import { Box, ButtonBase, Typography, useTheme } from '@mui/material';
import { Bookmark, Check, ChevronLeft, ChevronRight } from '../icons';
import {
  LIB_SITES,
  LibSite,
  SIDE_FLYOUT_WIDTH,
  SIDE_RAIL_HIDDEN_STORAGE_KEY,
  SIDE_RAIL_ICON_SIZE,
  SIDE_RAIL_SITE_ICON_SIZE,
  SIDE_RAIL_TAB,
  SIDE_RAIL_WIDTH,
} from '../../../constants';
import { usePersistedFlag } from '../../hooks/usePersistedFlag';
import LibSiteIcon from './LibSiteIcon';
import RailButton from './RailButton';

type Flyout = 'sites' | 'bookmarks';

const MOTION = '0.2s ease';

interface SideRailProps {
  site: LibSite;
  onSelectSite: (site: LibSite) => void;
  renderBookmarks: (close: () => void) => ReactNode;
  downloads: ReactNode;
  report: ReactNode;
}

/**
 * Левая панель: переключение сайтов, закладки текущего сайта, загрузки
 * и обращение к разработчику. Сайты и закладки выдвигаются подменю,
 * которое закрывает клик в любом месте окна; панель прячется язычком
 */
function SideRail({
  site,
  onSelectSite,
  renderBookmarks,
  downloads,
  report,
}: SideRailProps) {
  const { customColors } = useTheme().palette;
  const [hidden, setHidden] = usePersistedFlag(
    SIDE_RAIL_HIDDEN_STORAGE_KEY,
    false,
  );
  const [open, setOpen] = useState<Flyout | null>(null);

  const close = () => setOpen(null);
  const toggle = (flyout: Flyout) =>
    setOpen((current) => (current === flyout ? null : flyout));

  const toggleHidden = () => {
    close();
    setHidden(!hidden);
  };

  const selectSite = (next: LibSite) => {
    close();
    onSelectSite(next);
  };

  return (
    <Box
      sx={{
        position: 'relative',
        zIndex: 3,
        width: hidden ? 0 : SIDE_RAIL_WIDTH,
        flexShrink: 0,
        transition: `width ${MOTION}`,
      }}
    >
      {open && (
        <Box onClick={close} sx={{ position: 'fixed', inset: 0, zIndex: 1 }} />
      )}

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 3,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.75,
          py: 1.25,
          backgroundColor: customColors.siteHeaderColor,
          borderRight: hidden ? 'none' : `1px solid ${customColors.lineColor}`,
        }}
      >
        <RailButton
          label="Сайты"
          active={open === 'sites'}
          onClick={() => toggle('sites')}
          icon={<LibSiteIcon site={site} size={SIDE_RAIL_SITE_ICON_SIZE} />}
        />
        <Box
          sx={{
            width: 26,
            height: '1px',
            my: 0.5,
            flexShrink: 0,
            backgroundColor: customColors.lineColor,
          }}
        />
        <RailButton
          label="Закладки"
          active={open === 'bookmarks'}
          onClick={() => toggle('bookmarks')}
          icon={<Bookmark sx={{ fontSize: SIDE_RAIL_ICON_SIZE }} />}
        />
        {downloads}
        <Box sx={{ flex: 1 }} />
        {report}
      </Box>

      <Box
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '100%',
          zIndex: 2,
          width: SIDE_FLYOUT_WIDTH,
          overflowY: 'auto',
          p: 1.5,
          backgroundColor: customColors.dialogColor,
          borderRight: `1px solid ${customColors.lineColor}`,
          boxShadow: `12px 0 30px rgba(${customColors.overlayRgb}, 0.45)`,
          transform: open ? 'none' : `translateX(-${SIDE_FLYOUT_WIDTH + 60}px)`,
          visibility: open ? 'visible' : 'hidden',
          transition: `transform ${MOTION}, visibility ${MOTION}`,
        }}
      >
        <Typography
          sx={{
            mb: 1.25,
            px: 0.5,
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: customColors.mutedTextColor,
          }}
        >
          {open === 'sites' ? 'Сайты' : 'Закладки'}
        </Typography>

        {open === 'sites' &&
          LIB_SITES.map((item) => {
            const current = item.siteId === site.siteId;
            return (
              <ButtonBase
                key={item.siteId}
                onClick={() => selectSite(item)}
                sx={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'flex-start',
                  gap: 1.5,
                  px: 1,
                  py: 1,
                  borderRadius: 2,
                  color: customColors.primaryTextColor,
                  backgroundColor: current
                    ? `rgba(${customColors.accentRgb}, 0.14)`
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: `rgba(${customColors.onSurfaceRgb}, 0.06)`,
                  },
                }}
              >
                <LibSiteIcon site={item} size={32} />
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  {item.name}
                </Typography>
                {current && (
                  <Check
                    sx={{
                      ml: 'auto',
                      fontSize: 18,
                      color: customColors.accentSoftColor,
                    }}
                  />
                )}
              </ButtonBase>
            );
          })}

        {open === 'bookmarks' && renderBookmarks(close)}
      </Box>

      <ButtonBase
        aria-label={hidden ? 'Показать панель' : 'Скрыть панель'}
        onClick={toggleHidden}
        sx={{
          position: 'absolute',
          top: '50%',
          left: '100%',
          zIndex: 2,
          transform: 'translateY(-50%)',
          width: SIDE_RAIL_TAB.width,
          height: SIDE_RAIL_TAB.height,
          display: open ? 'none' : 'grid',
          placeItems: 'center',
          color: customColors.mutedTextColor,
          backgroundColor: customColors.siteHeaderColor,
          border: `1px solid ${customColors.lineColor}`,
          borderLeft: 'none',
          borderRadius: '0 8px 8px 0',
          '&:hover': { color: customColors.primaryTextColor },
        }}
      >
        {hidden ? (
          <ChevronRight sx={{ fontSize: 14 }} />
        ) : (
          <ChevronLeft sx={{ fontSize: 14 }} />
        )}
      </ButtonBase>
    </Box>
  );
}

export default SideRail;

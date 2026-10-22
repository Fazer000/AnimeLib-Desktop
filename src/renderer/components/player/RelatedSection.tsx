import React, { useEffect, useMemo, useState } from 'react';
import { Box, ButtonBase, Modal, useTheme } from '@mui/material';
import {
  FRANCHISE_EXPANDED_PADDING,
  FRANCHISE_EXPANDED_Z_INDEX,
  TOOLBAR_HEIGHT,
  RELATED_ARROW_SIZE,
  RELATED_ROW_GAP,
  RELATED_ROW_PADDING,
  RELATED_TAB_STORAGE_KEY,
  RELATED_TABS,
  RELATED_WIDTH_CSS,
  RelatedTab,
} from '../../../constants';
import { RelatedAnime as RelatedAnimeType } from '../../api/animeApi';
import { usePersistedChoice } from '../../hooks/usePersistedChoice';
import { dedupeRelations } from '../../utils/franchiseGraph';
import RelatedAnime from './RelatedAnime';
import FranchiseTimeline from './FranchiseTimeline';
import { Maximize } from '../icons';

interface RelatedSectionProps {
  currentSlug: string;
  shikimoriId: number | null | undefined;
  relatedAnime: RelatedAnimeType[];
  onAnimeClick: (slugUrl: string) => void;
  onOpenUrl: (url: string) => void;
  /** Хронология раскрыта во всё окно или свёрнута */
  onExpandedChange?: (expanded: boolean) => void;
}

const TAB_LABELS: Record<RelatedTab, string> = {
  related: 'Связанное',
  chronology: 'Хронология',
};

const isRelatedTab = (value: unknown): value is RelatedTab =>
  RELATED_TABS.includes(value as RelatedTab);

const CONTENT_INSET =
  RELATED_ROW_PADDING + RELATED_ARROW_SIZE + RELATED_ROW_GAP;

/**
 * Блок под плеером: связанные тайтлы лентой или хронология франшизы
 */
function RelatedSection({
  currentSlug,
  shikimoriId,
  relatedAnime,
  onAnimeClick,
  onOpenUrl,
  onExpandedChange,
}: RelatedSectionProps) {
  const { customColors } = useTheme().palette;
  const [tab, setTab] = usePersistedChoice<RelatedTab>(
    RELATED_TAB_STORAGE_KEY,
    isRelatedTab,
    'related',
  );
  const uniqueRelated = useMemo(
    () => dedupeRelations(relatedAnime),
    [relatedAnime],
  );
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    onExpandedChange?.(expanded);
  }, [expanded, onExpandedChange]);

  // Раскрытая хронология закрывается вместе с блоком (смена тайтла)
  useEffect(() => () => onExpandedChange?.(false), [onExpandedChange]);

  return (
    <Box sx={{ width: '100%', marginBottom: 4, paddingY: 3 }}>
      <Box
        sx={{
          width: '100%',
          maxWidth: RELATED_WIDTH_CSS,
          marginX: 'auto',
          position: 'relative',
        }}
      >
        <Box
          role="tablist"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            marginBottom: 2,
            paddingX: `${CONTENT_INSET}px`,
          }}
        >
          {RELATED_TABS.map((item) => {
            const selected = item === tab;
            return (
              <ButtonBase
                key={item}
                role="tab"
                aria-selected={selected}
                disableRipple
                onClick={() => setTab(item)}
                sx={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  fontFamily: 'Open Sans, sans-serif',
                  color: selected
                    ? customColors.primaryTextColor
                    : customColors.mutedTextColor,
                  borderBottom: `2px solid ${
                    selected ? customColors.accentSoftColor : 'transparent'
                  }`,
                  transition: 'color 0.2s ease, border-color 0.2s ease',
                  '&:hover': { color: customColors.primaryTextColor },
                }}
              >
                {TAB_LABELS[item]}
              </ButtonBase>
            );
          })}
          {tab === 'chronology' && (
            <ButtonBase
              aria-label="Развернуть хронологию"
              onClick={() => setExpanded(true)}
              sx={{
                ml: 'auto',
                width: 32,
                height: 32,
                borderRadius: 1.5,
                color: customColors.mutedTextColor,
                border: `1px solid ${customColors.lineColor}`,
                '&:hover': {
                  color: customColors.primaryTextColor,
                  borderColor: customColors.accentSoftColor,
                },
              }}
            >
              <Maximize sx={{ fontSize: 16 }} />
            </ButtonBase>
          )}
        </Box>

        {tab === 'related' ? (
          <RelatedAnime
            relatedAnime={uniqueRelated}
            onAnimeClick={onAnimeClick}
            onOpenUrl={onOpenUrl}
          />
        ) : (
          <Box sx={{ px: `${CONTENT_INSET}px` }}>
            <FranchiseTimeline
              currentSlug={currentSlug}
              shikimoriId={shikimoriId}
              onAnimeClick={onAnimeClick}
            />
          </Box>
        )}
      </Box>

      {/* Без портала: хронология остаётся в слое плеера, и выезжающая
          карточка аниме из шапки ложится поверх неё */}
      <Modal
        open={expanded}
        onClose={() => setExpanded(false)}
        hideBackdrop
        disablePortal
        sx={{ top: TOOLBAR_HEIGHT, zIndex: FRANCHISE_EXPANDED_Z_INDEX }}
      >
        <Box
          sx={{
            height: '100%',
            outline: 'none',
            p: `${FRANCHISE_EXPANDED_PADDING}px`,
            backgroundColor: customColors.pageColor,
          }}
        >
          <FranchiseTimeline
            currentSlug={currentSlug}
            shikimoriId={shikimoriId}
            expanded
            onClose={() => setExpanded(false)}
            onAnimeClick={(slugUrl) => {
              setExpanded(false);
              onAnimeClick(slugUrl);
            }}
          />
        </Box>
      </Modal>
    </Box>
  );
}

RelatedSection.defaultProps = { onExpandedChange: undefined };

export default RelatedSection;

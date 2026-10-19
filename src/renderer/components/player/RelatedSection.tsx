import React, { useMemo } from 'react';
import { Box, ButtonBase, useTheme } from '@mui/material';
import {
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

interface RelatedSectionProps {
  currentSlug: string;
  relatedAnime: RelatedAnimeType[];
  onAnimeClick: (slugUrl: string) => void;
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
  relatedAnime,
  onAnimeClick,
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
            gap: 3,
            marginBottom: 2,
            paddingLeft: `${CONTENT_INSET}px`,
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
        </Box>

        {tab === 'related' ? (
          <RelatedAnime
            relatedAnime={uniqueRelated}
            onAnimeClick={onAnimeClick}
          />
        ) : (
          <Box sx={{ px: `${CONTENT_INSET}px` }}>
            <FranchiseTimeline
              currentSlug={currentSlug}
              onAnimeClick={onAnimeClick}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default RelatedSection;

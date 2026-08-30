import React, { memo, useState } from 'react';
import { Box } from '@mui/material';
import { Comment } from '../../../services/player';
import { ACCENT_SOFT, SURFACE_DIALOG } from '../../../theme/palette';

/** Ширина полоски в разметке; зона клика шире за счёт ::after. */
const RAIL_WIDTH = 6;

/** На сколько зона клика выходит за полоску влево и вправо. */
const RAIL_HIT_PADDING = 4;

/** Считает все вложенные ответы ветки. */
export function countReplies(comments: Comment[]): number {
  return comments.reduce(
    (total, comment) => total + 1 + countReplies(comment.replies || []),
    0,
  );
}

interface RepliesThreadProps {
  count: number;
  spacing: number;
  level: number;
  collapseFromLevel: number;
  children: React.ReactNode;
}

/** Сворачиваемая ветка ответов: полоска слева служит переключателем. */
const RepliesThread = memo(
  ({
    count,
    spacing,
    level,
    collapseFromLevel,
    children,
  }: RepliesThreadProps) => {
    const [collapsed, setCollapsed] = useState(level >= collapseFromLevel);
    const countLabel = count > 99 ? '99+' : String(count);
    const pillWidth = countLabel.length > 2 ? 28 : 20;

    return (
      <Box sx={{ display: 'flex', mt: spacing }}>
        <Box
          onClick={() => setCollapsed((current) => !current)}
          sx={{
            width: collapsed ? pillWidth : RAIL_WIDTH,
            flexShrink: 0,
            cursor: 'pointer',
            position: 'relative',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: collapsed ? 'flex-start' : 'stretch',
            pt: collapsed ? 1 : 0,
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: -RAIL_HIT_PADDING,
              right: -RAIL_HIT_PADDING,
            },
            '&:hover .thread-rail-line': { borderColor: ACCENT_SOFT },
            '&:hover .thread-rail-pill': {
              backgroundColor: ACCENT_SOFT,
              color: SURFACE_DIALOG,
            },
          }}
        >
          {collapsed ? (
            <Box
              key="thread-rail-pill"
              className="thread-rail-pill"
              sx={{
                width: pillWidth,
                height: 20,
                flexShrink: 0,
                boxSizing: 'border-box',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.14)',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                transition: 'background-color 0.15s ease, color 0.15s ease',
              }}
            >
              {countLabel}
            </Box>
          ) : (
            <Box
              key="thread-rail-line"
              className="thread-rail-line"
              sx={{
                width: 4,
                alignSelf: 'stretch',
                flexShrink: 0,
                boxSizing: 'border-box',
                borderLeft: '2px solid rgba(255, 255, 255, 0.08)',
                borderTopLeftRadius: 8,
                borderBottomLeftRadius: 8,
                transition: 'border-color 0.15s ease',
              }}
            />
          )}
        </Box>

        {!collapsed && <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>}
      </Box>
    );
  },
);

RepliesThread.displayName = 'RepliesThread';

export default RepliesThread;

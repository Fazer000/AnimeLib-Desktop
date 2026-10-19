import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  ButtonBase,
  CircularProgress,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import type { CustomColors } from '@mui/material/styles';
import {
  FRANCHISE_AXIS_HEIGHT,
  FRANCHISE_EMPTY_GAP_WIDTH,
  FRANCHISE_LEGEND_BAR_HEIGHT,
  FRANCHISE_LEGEND_WIDTH,
  FRANCHISE_MAX_HOPS,
  FRANCHISE_MIN_HEIGHT,
  FRANCHISE_MIN_YEAR_WIDTH,
  FRANCHISE_NODE_GAP,
  FRANCHISE_NODE_HEIGHT,
  FRANCHISE_NODE_WIDTH,
  FRANCHISE_ROW_HEIGHT,
  FRANCHISE_ROWS_ABOVE,
  FRANCHISE_ROWS_BELOW,
} from '../../../constants';
import useFranchiseGraph from '../../hooks/useFranchiseGraph';
import { resolveFranchiseTitle } from '../../services/franchise/franchiseLoader';
import useImageWithReferer from '../../hooks/useImageWithReferer';
import useStableSize from '../../hooks/useStableSize';
import {
  FranchiseEdge,
  FranchiseLayout,
  FranchiseSide,
  FranchiseTitle,
  findMainLine,
  formatReleaseMonth,
  franchiseRoot,
  laterEnd,
  layoutFranchise,
  linkedTitles,
  pruneDistantTitles,
  resolveSide,
  shortenTitle,
} from '../../utils/franchiseGraph';

const PADDING_X = 24;
const COVER_WIDTH = 38;
const DRAG_THRESHOLD = 5;
const BORDER = 2;

interface FranchiseTimelineProps {
  currentSlug: string;
  shikimoriId: number | null | undefined;
  onAnimeClick: (slugUrl: string) => void;
}

interface NodeBox {
  left: number;
  top: number;
}

type NodeState = 'normal' | 'focused' | 'dimmed';

const sideColor = (side: FranchiseSide, colors: CustomColors) => {
  if (side === 0) return colors.accentSoftColor;
  return side < 0 ? colors.blueColor : colors.mutedTextColor;
};

const LANE_LEGEND: Record<FranchiseSide, string> = {
  [-1]: 'Фильмы и компиляции',
  0: 'Основная история',
  1: 'Ответвления',
};

const CURRENT_LABEL = 'Вы здесь';
const MISSING_LABEL = 'Нет на AnimeLib';
const RESTRICTED_LABEL = 'Недоступно';

/**
 * Тайтл нельзя открыть: его нет на Animelib или он не найден без входа
 */
const isUnavailable = (title: FranchiseTitle) =>
  title.availability === 'missing' || title.availability === 'restricted';

/**
 * Положение узла в пикселях холста
 */
const nodeBox = (layout: FranchiseLayout, slugUrl: string): NodeBox => {
  const node = layout.nodes.get(slugUrl);
  const row = node?.row ?? 0;

  return {
    left: PADDING_X + (node?.x ?? 0),
    top:
      (row - layout.minRow) * FRANCHISE_ROW_HEIGHT +
      (FRANCHISE_ROW_HEIGHT - FRANCHISE_NODE_HEIGHT) / 2,
  };
};

/**
 * Линия связи: в одном ряду — от края к краю, между рядами — дугой
 * от нижнего или верхнего края к левой части узла
 */
const edgePath = (
  from: NodeBox,
  to: NodeBox,
): { d: string; start: [number, number]; end: [number, number] } => {
  if (from.top === to.top) {
    const forward = to.left >= from.left;
    const x1 = forward ? from.left + FRANCHISE_NODE_WIDTH : from.left;
    const x2 = forward ? to.left : to.left + FRANCHISE_NODE_WIDTH;
    const y = from.top + FRANCHISE_NODE_HEIGHT / 2;
    return { d: `M${x1},${y} L${x2},${y}`, start: [x1, y], end: [x2, y] };
  }

  const down = to.top > from.top;
  const x1 = from.left + FRANCHISE_NODE_WIDTH / 2;
  const y1 = down ? from.top + FRANCHISE_NODE_HEIGHT : from.top;
  const x2 = to.left + COVER_WIDTH / 2 + 4;
  const y2 = down ? to.top : to.top + FRANCHISE_NODE_HEIGHT;
  const midY = (y1 + y2) / 2;

  return {
    d: `M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`,
    start: [x1, y1],
    end: [x2, y2],
  };
};

/**
 * Вторая строка узла: тип и месяц выхода
 */
const metaLine = (title: FranchiseTitle): string =>
  [title.type, formatReleaseMonth(title.releaseDate)]
    .filter(Boolean)
    .join(' · ');

function FranchiseNode({
  title,
  label,
  box,
  side,
  isCurrent,
  state,
  onClick,
  onHover,
}: {
  title: FranchiseTitle;
  label: string;
  box: NodeBox;
  side: FranchiseSide;
  isCurrent: boolean;
  state: NodeState;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
}) {
  const { customColors } = useTheme().palette;
  const imageUrl = useImageWithReferer(title.cover || undefined);
  const meta = metaLine(title);
  const tint = `rgba(${customColors.accentRgb}, 0.14)`;
  const missing = isUnavailable(title);
  const tooltip = [
    title.name,
    meta,
    isCurrent ? CURRENT_LABEL : '',
    title.availability === 'missing' ? MISSING_LABEL : '',
    title.availability === 'restricted' ? RESTRICTED_LABEL : '',
  ]
    .filter(Boolean)
    .join('\n');
  const framed = isCurrent || state === 'focused';
  const textRef = useRef<HTMLDivElement>(null);
  const [clipped, setClipped] = useState(false);

  // Подсказка нужна, только если текст на узле обрезан или тайтла
  // нет на Animelib. Пиксель запаса — на дробную ширину текста
  const measureClipping = () => {
    const lines = textRef.current ? [...textRef.current.children] : [];
    setClipped(lines.some((line) => line.scrollWidth > line.clientWidth + 1));
  };

  // Шрифт может догрузиться позже, поэтому замер повторяется при наведении
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(measureClipping, [label, meta]);

  const needsTooltip = clipped || missing;

  let frameColor = customColors.lineColor;
  if (state === 'focused') frameColor = customColors.accentSoftColor;
  if (isCurrent) frameColor = customColors.warningColor;

  return (
    <Tooltip
      title={
        needsTooltip ? (
          <span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>
        ) : (
          ''
        )
      }
      enterDelay={400}
    >
      <ButtonBase
        onClick={onClick}
        onMouseEnter={() => {
          measureClipping();
          onHover(true);
        }}
        onMouseLeave={() => onHover(false)}
        disableRipple
        sx={{
          position: 'absolute',
          left: box.left,
          top: box.top,
          width: FRANCHISE_NODE_WIDTH,
          height: FRANCHISE_NODE_HEIGHT,
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          textAlign: 'left',
          overflow: 'hidden',
          borderRadius: 1.5,
          background:
            state === 'focused'
              ? `linear-gradient(${tint}, ${tint}), ${customColors.primaryColor}`
              : customColors.primaryColor,
          border: `${framed ? BORDER : 1}px ${missing ? 'dashed' : 'solid'} ${frameColor}`,
          borderLeft: `4px solid ${sideColor(side, customColors)}`,
          cursor: missing ? 'default' : 'pointer',
          transition: 'border-color 0.15s ease',
          '& > *': {
            opacity: state === 'dimmed' || missing ? 0.4 : 1,
            transition: 'opacity 0.15s ease',
          },
        }}
      >
        <Box
          sx={{
            width: COVER_WIDTH,
            flexShrink: 0,
            backgroundColor: customColors.panelColor,
          }}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
        </Box>
        <Box
          ref={textRef}
          sx={{
            minWidth: 0,
            flex: 1,
            px: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <Typography
            noWrap
            sx={{
              fontSize: '0.72rem',
              fontWeight: 600,
              color: customColors.primaryTextColor,
            }}
          >
            {label}
          </Typography>
          <Typography
            noWrap
            sx={{ fontSize: '0.66rem', color: customColors.mutedTextColor }}
          >
            {meta}
          </Typography>
          {isCurrent && (
            <Typography
              noWrap
              sx={{
                fontSize: '0.66rem',
                fontWeight: 600,
                color: customColors.warningColor,
              }}
            >
              {CURRENT_LABEL}
            </Typography>
          )}
        </Box>
      </ButtonBase>
    </Tooltip>
  );
}

/**
 * Хронология франшизы: тайтлы по дате выхода, основная линия продолжений
 * по центру, ответвления сверху и снизу
 */
function FranchiseTimeline({
  currentSlug,
  shikimoriId,
  onAnimeClick,
}: FranchiseTimelineProps) {
  const { customColors } = useTheme().palette;
  const { graph, progress, done, failed } = useFranchiseGraph(
    currentSlug,
    shikimoriId,
    true,
  );
  const frameRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const anchor = useRef<{ slug: string; box: NodeBox } | null>(null);
  const frameSize = useStableSize(frameRef);
  const drag = useRef({
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
    active: false,
    moved: false,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const frameWidth = frameSize?.width ?? 0;

  const view = useMemo(() => {
    if (!graph || frameWidth === 0) return null;

    const mainLine = findMainLine(graph, currentSlug);
    const shown = graph.curated
      ? graph
      : pruneDistantTitles(graph, mainLine, currentSlug, FRANCHISE_MAX_HOPS);
    const layout = layoutFranchise(shown, mainLine, {
      nodeWidth: FRANCHISE_NODE_WIDTH,
      gap: FRANCHISE_NODE_GAP,
      rowsAbove: FRANCHISE_ROWS_ABOVE,
      rowsBelow: FRANCHISE_ROWS_BELOW,
      minYearWidth: FRANCHISE_MIN_YEAR_WIDTH,
      emptyGapWidth: FRANCHISE_EMPTY_GAP_WIDTH,
      minWidth: frameWidth - FRANCHISE_LEGEND_WIDTH - PADDING_X * 2 - BORDER,
    });
    const sides = new Map(
      [...shown.titles.keys()].map((slug) => [
        slug,
        resolveSide(slug, shown, mainLine),
      ]),
    );

    return {
      shown,
      layout,
      sides,
      root: franchiseRoot(shown, mainLine),
    };
  }, [graph, currentSlug, frameWidth]);

  // Граф растёт по ходу загрузки: первый раз текущий тайтл ставится
  // в центр, дальше вид сдвигается вместе с ним, чтобы ничего не прыгало
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!view || !element || !view.layout.nodes.has(currentSlug)) return;

    const current = nodeBox(view.layout, currentSlug);
    const previous = anchor.current;
    anchor.current = { slug: currentSlug, box: current };

    if (previous?.slug === currentSlug) {
      element.scrollLeft += current.left - previous.box.left;
      element.scrollTop += current.top - previous.box.top;
      return;
    }

    const visibleWidth = element.clientWidth - FRANCHISE_LEGEND_WIDTH;
    const visibleHeight = element.clientHeight - FRANCHISE_AXIS_HEIGHT;
    element.scrollLeft =
      current.left - visibleWidth / 2 + FRANCHISE_NODE_WIDTH / 2;
    element.scrollTop =
      current.top - visibleHeight / 2 + FRANCHISE_NODE_HEIGHT / 2;
  }, [view, currentSlug]);

  const linked = useMemo(
    () => (view && hovered ? linkedTitles(view.shown.edges, hovered) : null),
    [view, hovered],
  );

  const renderStatus = () => {
    if (failed) {
      return <Typography>Не удалось собрать хронологию</Typography>;
    }

    const alone = view?.shown.titles.get(currentSlug);

    if (done && view && view.shown.titles.size < 2) {
      const dashed = `1.5px dashed rgba(${customColors.onSurfaceRgb}, 0.18)`;

      return (
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          {alone && (
            <Box sx={{ display: 'flex', alignItems: 'center', width: '70%' }}>
              <Box sx={{ flex: 1, borderTop: dashed }} />
              <Box
                sx={{
                  position: 'relative',
                  flexShrink: 0,
                  width: FRANCHISE_NODE_WIDTH,
                  height: FRANCHISE_NODE_HEIGHT,
                }}
              >
                <FranchiseNode
                  title={alone}
                  label={alone.name}
                  box={{ left: 0, top: 0 }}
                  side={0}
                  isCurrent
                  state="normal"
                  onClick={() => onAnimeClick(currentSlug)}
                  onHover={() => undefined}
                />
              </Box>
              <Box sx={{ flex: 1, borderTop: dashed }} />
            </Box>
          )}
          <Typography sx={{ fontSize: '0.85rem' }}>
            Других аниме во франшизе нет
          </Typography>
        </Box>
      );
    }

    return (
      <>
        <CircularProgress
          size={18}
          sx={{ color: customColors.accentSoftColor }}
        />
        <Typography>
          Собираю франшизу
          {progress ? `: ${progress.loaded} из ${progress.found}` : '…'}
        </Typography>
      </>
    );
  };

  const renderGraph = () => {
    if (!graph || !view) return null;

    const { shown, layout, sides, root } = view;
    const width = layout.width + PADDING_X * 2;
    const height = (layout.maxRow - layout.minRow + 1) * FRANCHISE_ROW_HEIGHT;
    const mainBandTop = -layout.minRow * FRANCHISE_ROW_HEIGHT;
    const lanes = (
      [
        [-1, -layout.minRow],
        [0, 1],
        [1, layout.maxRow],
      ] as Array<[FranchiseSide, number]>
    ).filter(([, rows]) => rows > 0);
    const stickyCell = {
      position: 'sticky',
      zIndex: 2,
      backgroundColor: customColors.panelColor,
    } as const;

    const isMainEdge = (edge: FranchiseEdge) =>
      edge.sequel && sides.get(edge.from) === 0 && sides.get(edge.to) === 0;

    const isFocusedEdge = (edge: FranchiseEdge) =>
      hovered !== null && (edge.from === hovered || edge.to === hovered);

    const edgeStroke = (edge: FranchiseEdge) => {
      if (isFocusedEdge(edge)) return customColors.accentSoftColor;
      if (!edge.sequel) return `rgba(${customColors.onSurfaceRgb}, 0.3)`;
      return sideColor(sides.get(edge.to) ?? 1, customColors);
    };

    const edgeOpacity = (edge: FranchiseEdge) => {
      if (hovered !== null) return isFocusedEdge(edge) ? 1 : 0.25;
      return edge.sequel && !isMainEdge(edge) ? 0.6 : 1;
    };

    const nodeState = (slugUrl: string): NodeState => {
      if (!hovered) return 'normal';
      return slugUrl === hovered || linked?.has(slugUrl) ? 'focused' : 'dimmed';
    };

    const handleMouseDown = (event: React.MouseEvent) => {
      drag.current = {
        startX: event.pageX,
        startY: event.pageY,
        scrollLeft: scrollRef.current?.scrollLeft ?? 0,
        scrollTop: scrollRef.current?.scrollTop ?? 0,
        active: true,
        moved: false,
      };
    };

    const handleMouseMove = (event: React.MouseEvent) => {
      const state = drag.current;
      if (!state.active || !scrollRef.current) return;

      const shiftX = event.pageX - state.startX;
      const shiftY = event.pageY - state.startY;

      if (Math.hypot(shiftX, shiftY) > DRAG_THRESHOLD && !state.moved) {
        state.moved = true;
        setIsDragging(true);
      }
      if (state.moved) {
        event.preventDefault();
        scrollRef.current.scrollLeft = state.scrollLeft - shiftX;
        scrollRef.current.scrollTop = state.scrollTop - shiftY;
      }
    };

    const stopDrag = () => {
      drag.current.active = false;
      setIsDragging(false);
    };

    const handleNodeClick = async (title: FranchiseTitle) => {
      if (drag.current.moved || isUnavailable(title)) return;

      if (title.link || title.shikimoriId === undefined) {
        onAnimeClick(title.link ?? title.slugUrl);
        return;
      }

      const slug = await resolveFranchiseTitle(title.shikimoriId);
      if (slug) onAnimeClick(slug);
    };

    return (
      <Box
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'auto',
          overflowY: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `${FRANCHISE_LEGEND_WIDTH}px ${width}px`,
            gridTemplateRows: `${FRANCHISE_AXIS_HEIGHT}px ${height}px`,
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              ...stickyCell,
              top: 0,
              left: 0,
              zIndex: 4,
              borderRight: `1px solid ${customColors.lineColor}`,
              borderBottom: `1px solid ${customColors.lineColor}`,
            }}
          />
          <Box
            sx={{
              ...stickyCell,
              top: 0,
              zIndex: 3,
              borderBottom: `1px solid ${customColors.lineColor}`,
            }}
          >
            {layout.segments.map((segment) => {
              const isGap = segment.year === null;
              return (
                <Typography
                  key={segment.label}
                  sx={{
                    position: 'absolute',
                    top: 7,
                    left:
                      PADDING_X +
                      segment.start +
                      (isGap ? segment.width / 2 : 6),
                    transform: isGap ? 'translateX(-50%)' : undefined,
                    fontSize: isGap ? '0.68rem' : '0.75rem',
                    color: customColors.mutedTextColor,
                    opacity: isGap ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {segment.label}
                </Typography>
              );
            })}
          </Box>
          <Box
            sx={{
              ...stickyCell,
              left: 0,
              borderRight: `1px solid ${customColors.lineColor}`,
            }}
          >
            {lanes.map(([side, rows]) => (
              <Box
                key={side}
                sx={{
                  height: rows * FRANCHISE_ROW_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 4,
                    height: 28,
                    flexShrink: 0,
                    borderRadius: 1,
                    backgroundColor: sideColor(side, customColors),
                  }}
                />
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: customColors.primaryTextColor,
                  }}
                >
                  {LANE_LEGEND[side]}
                </Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ position: 'relative', width, height }}>
            <svg
              width={width}
              height={height}
              style={{ position: 'absolute', left: 0, top: 0 }}
            >
              <rect
                x={0}
                y={mainBandTop}
                width={width}
                height={FRANCHISE_ROW_HEIGHT}
                fill={`rgba(${customColors.accentRgb}, 0.06)`}
              />
              {layout.segments.map((segment) => {
                const x = PADDING_X + segment.start;

                if (segment.year === null) {
                  return (
                    <g key={segment.label}>
                      <rect
                        x={x + 8}
                        y={0}
                        width={segment.width - 16}
                        height={height}
                        fill={`rgba(${customColors.onSurfaceRgb}, 0.03)`}
                      />
                    </g>
                  );
                }

                return (
                  <g key={segment.label}>
                    <line
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={height}
                      stroke={`rgba(${customColors.onSurfaceRgb}, 0.08)`}
                    />
                  </g>
                );
              })}
              {shown.edges.map((edge) => {
                const { d } = edgePath(
                  nodeBox(layout, edge.from),
                  nodeBox(layout, edge.to),
                );
                const focused = isFocusedEdge(edge);
                return (
                  <g key={`${edge.from}|${edge.to}`}>
                    <path
                      d={d}
                      fill="none"
                      stroke={edgeStroke(edge)}
                      strokeWidth={isMainEdge(edge) || focused ? 2.5 : 1.2}
                      strokeOpacity={edgeOpacity(edge)}
                      strokeDasharray={edge.sequel ? undefined : '4 4'}
                    />
                    <path
                      d={d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={10}
                    >
                      <title>{edge.label}</title>
                    </path>
                  </g>
                );
              })}
            </svg>

            {[...shown.titles.values()].map((title) => (
              <FranchiseNode
                key={title.slugUrl}
                title={title}
                label={shortenTitle(title.name, root)}
                box={nodeBox(layout, title.slugUrl)}
                side={sides.get(title.slugUrl) ?? 1}
                isCurrent={title.slugUrl === currentSlug}
                state={nodeState(title.slugUrl)}
                onClick={() => handleNodeClick(title)}
                onHover={(isHovered) =>
                  setHovered((prev) => {
                    if (isHovered) return title.slugUrl;
                    return prev === title.slugUrl ? null : prev;
                  })
                }
              />
            ))}

            {hovered && (
              <svg
                width={width}
                height={height}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  pointerEvents: 'none',
                }}
              >
                {shown.edges.filter(isFocusedEdge).map((edge) => {
                  const { start, end } = edgePath(
                    nodeBox(layout, edge.from),
                    nodeBox(layout, edge.to),
                  );
                  const [cx, cy] =
                    laterEnd(edge, shown.titles) === edge.to ? end : start;
                  return (
                    <circle
                      key={`${edge.from}|${edge.to}`}
                      cx={cx}
                      cy={cy}
                      r={4.5}
                      fill={customColors.panelColor}
                      stroke={customColors.accentSoftColor}
                      strokeWidth={2}
                    />
                  );
                })}
              </svg>
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  const ready = view !== null && view.shown.titles.size > 1;

  const legendItems: Array<[React.ReactNode, string]> = [
    [
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {([0, -1, 1] as FranchiseSide[]).map((side) => (
          <Box
            key={side}
            sx={{
              width: 14,
              borderTop: `2px solid ${sideColor(side, customColors)}`,
            }}
          />
        ))}
      </Box>,
      'продолжение',
    ],
    [
      <Box
        sx={{
          width: 22,
          borderTop: `2px dashed rgba(${customColors.onSurfaceRgb}, 0.45)`,
        }}
      />,
      'ответвление',
    ],
    [
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box
          sx={{
            width: 16,
            borderTop: `2px solid ${customColors.accentSoftColor}`,
          }}
        />
        <Box
          sx={{
            width: 10,
            height: 10,
            ml: '-1px',
            borderRadius: '50%',
            backgroundColor: customColors.panelColor,
            border: `2px solid ${customColors.accentSoftColor}`,
          }}
        />
      </Box>,
      'порядок просмотра',
    ],
    [
      <Box
        sx={{
          width: 18,
          height: 12,
          borderRadius: 0.5,
          border: `2px solid ${customColors.warningColor}`,
        }}
      />,
      CURRENT_LABEL.toLowerCase(),
    ],
  ];

  const frame = (
    <Box
      ref={frameRef}
      sx={{
        display: 'flex',
        minHeight: FRANCHISE_MIN_HEIGHT - FRANCHISE_LEGEND_BAR_HEIGHT,
        overflow: 'hidden',
        borderRadius: 2,
        border: `1px solid ${customColors.lineColor}`,
        backgroundColor: customColors.panelColor,
      }}
    >
      {ready ? (
        renderGraph()
      ) : (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            color: customColors.mutedTextColor,
          }}
        >
          {renderStatus()}
        </Box>
      )}
    </Box>
  );

  return (
    <Box>
      {frame}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 3,
          px: 0.5,
          height: FRANCHISE_LEGEND_BAR_HEIGHT,
          visibility: ready ? 'visible' : 'hidden',
        }}
      >
        {legendItems.map(([mark, text]) => (
          <Box
            key={text}
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            {mark}
            <Typography
              sx={{ fontSize: '0.72rem', color: customColors.mutedTextColor }}
            >
              {text}
            </Typography>
          </Box>
        ))}
        {!done && progress && (
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}
          >
            <CircularProgress
              size={12}
              sx={{ color: customColors.accentSoftColor }}
            />
            <Typography
              sx={{ fontSize: '0.72rem', color: customColors.mutedTextColor }}
            >
              Загружаю франшизу: {progress.loaded} из {progress.found}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default FranchiseTimeline;

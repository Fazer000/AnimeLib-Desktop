/**
 * Граф франшизы для хронологии: тайтлы, связи между ними и раскладка по датам
 */

/**
 * Есть ли тайтл на Animelib: ещё неизвестно, есть, нет, или не найден без
 * входа на сайт — тогда он может быть скрыт по возрасту
 */
export type FranchiseAvailability =
  | 'pending'
  | 'available'
  | 'missing'
  | 'restricted';

/**
 * Тайтл франшизы. slugUrl — ключ узла; у тайтлов из Shikimori, пока они
 * не сопоставлены с Animelib, это не slug Animelib. Куда вести по клику,
 * говорит link, а без него — сам slugUrl
 */
export interface FranchiseTitle {
  slugUrl: string;
  name: string;
  type: string;
  cover: string | null;
  releaseDate: string | null;
  link?: string | null;
  availability?: FranchiseAvailability;
  lookupSlug?: string | null;
  shikimoriId?: number;
}

export interface FranchiseEdge {
  from: string;
  to: string;
  label: string;
  sequel: boolean;
}

/**
 * Граф франшизы. curated — состав уже выверен источником (Shikimori)
 * и обрезать дальние тайтлы не нужно
 */
export interface FranchiseGraph {
  titles: Map<string, FranchiseTitle>;
  edges: FranchiseEdge[];
  curated?: boolean;
}

export interface RelationLike {
  related_type: { label: string };
  media: {
    slug_url: string;
    model: string;
    name: string;
    rus_name?: string;
    cover?: { default?: string; thumbnail?: string } | null;
    type?: { label: string } | null;
    releaseDate?: string | null;
  };
}

/** Сторона от основной линии: сверху, на ней или снизу */
export type FranchiseSide = -1 | 0 | 1;

export interface FranchiseNodePlacement {
  slugUrl: string;
  x: number;
  row: number;
}

export interface FranchiseLayoutOptions {
  nodeWidth: number;
  gap: number;
  rowsAbove: number;
  rowsBelow: number;
  minYearWidth: number;
  emptyGapWidth: number;
  minWidth: number;
}

/** Отрезок шкалы: год с тайтлами или схлопнутые пустые годы (year = null) */
export interface TimeSegment {
  year: number | null;
  label: string;
  start: number;
  width: number;
}

export interface FranchiseLayout {
  nodes: Map<string, FranchiseNodePlacement>;
  segments: TimeSegment[];
  width: number;
  minRow: number;
  maxRow: number;
}

const SEQUEL_LABEL = 'Продолжение';
const PREQUEL_LABEL = 'Предыстория';
const SUMMARY_LABEL = 'Обобщение';
const FILM_TYPE = 'Фильм';
const TV_TYPE = 'TV Сериал';
const CROSSOVER_LABEL = 'Кроссовер';

/**
 * Связь продолжения или предыстории: шаг по ней не уводит от сюжета
 */
export function isSequelLabel(label: string): boolean {
  return label === SEQUEL_LABEL || label === PREQUEL_LABEL;
}

/**
 * Идёт ли обход дальше по связи. Кроссовер ведёт в чужую франшизу:
 * сам тайтл показывается, его связи — нет
 */
export function isFranchiseLink(label: string): boolean {
  return label !== CROSSOVER_LABEL;
}

/**
 * Связи без повторов: API присылает одну и ту же связь дважды
 */
export function dedupeRelations<T extends RelationLike>(relations: T[]): T[] {
  const seen = new Set<string>();

  return relations.filter((item) => {
    const key = `${item.related_type.label}:${item.media.slug_url}`;
    if (!item.media.slug_url || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Тайтл франшизы из связи
 */
export function titleFromRelation(
  media: RelationLike['media'],
): FranchiseTitle {
  return {
    slugUrl: media.slug_url,
    name: media.rus_name || media.name,
    type: media.type?.label || '',
    cover: media.cover?.thumbnail || media.cover?.default || null,
    releaseDate: media.releaseDate || null,
  };
}

/**
 * Связь в едином направлении: продолжение всегда идёт от раннего к позднему
 */
export function normalizeEdge(
  from: string,
  to: string,
  label: string,
): FranchiseEdge {
  if (label === PREQUEL_LABEL) {
    return { from: to, to: from, label: SEQUEL_LABEL, sequel: true };
  }

  return { from, to, label, sequel: label === SEQUEL_LABEL };
}

/**
 * Одна связь на пару тайтлов. Продолжение важнее прочих подписей,
 * среди прочих остаётся первая встреченная
 */
export function mergeEdges(edges: FranchiseEdge[]): FranchiseEdge[] {
  const byPair = new Map<string, FranchiseEdge>();

  edges.forEach((edge) => {
    if (edge.from === edge.to) return;

    const key = [edge.from, edge.to].sort().join('|');
    const existing = byPair.get(key);

    if (!existing || (edge.sequel && !existing.sequel)) {
      byPair.set(key, edge);
    }
  });

  return [...byPair.values()];
}

/**
 * Связи только между аниме: манга и ранобе в граф не входят
 */
export function animeRelationEdges(
  from: string,
  relations: RelationLike[],
): FranchiseEdge[] {
  return dedupeRelations(relations)
    .filter((item) => item.media.model === 'anime')
    .map((item) =>
      normalizeEdge(from, item.media.slug_url, item.related_type.label),
    );
}

/**
 * Основная линия — группа тайтлов, связанных продолжениями, где больше всего
 * TV-сериалов; затем та, где есть текущий тайтл; затем та, у которой больше
 * связей с остальной франшизой
 */
export function findMainLine(
  graph: FranchiseGraph,
  currentSlug: string,
): Set<string> {
  const neighbours = new Map<string, string[]>();

  graph.edges
    .filter((edge) => edge.sequel)
    .forEach(({ from, to }) => {
      neighbours.set(from, [...(neighbours.get(from) || []), to]);
      neighbours.set(to, [...(neighbours.get(to) || []), from]);
    });

  const visited = new Set<string>();
  const degree = (group: Set<string>) =>
    graph.edges.filter((edge) => group.has(edge.from) || group.has(edge.to))
      .length;
  const tvCount = (group: Set<string>) =>
    [...group].filter((slug) => graph.titles.get(slug)?.type === TV_TYPE)
      .length;
  let best = new Set<string>([currentSlug]);

  [...graph.titles.keys()].forEach((start) => {
    if (visited.has(start)) return;

    const group = new Set<string>([start]);
    const queue = [start];
    visited.add(start);

    while (queue.length > 0) {
      const slug = queue.shift() as string;
      (neighbours.get(slug) || []).forEach((next) => {
        if (visited.has(next)) return;
        visited.add(next);
        group.add(next);
        queue.push(next);
      });
    }

    const rank = (item: Set<string>) => [
      tvCount(item),
      item.has(currentSlug) ? 1 : 0,
      degree(item),
    ];
    const score = rank(group);
    const bestScore = rank(best);
    const index = score.findIndex((value, i) => value !== bestScore[i]);

    if (index >= 0 && score[index] > bestScore[index]) best = group;
  });

  return best;
}

/**
 * Оставляет тайтлы не дальше заданного числа шагов от основной линии.
 * Шаги по продолжениям не считаются; текущий тайтл остаётся всегда
 */
export function pruneDistantTitles(
  graph: FranchiseGraph,
  mainLine: Set<string>,
  keep: string,
  maxHops: number,
): FranchiseGraph {
  const distance = new Map<string, number>();
  const queue: string[] = [];

  mainLine.forEach((slug) => {
    distance.set(slug, 0);
    queue.push(slug);
  });

  while (queue.length > 0) {
    const slug = queue.shift() as string;
    const base = distance.get(slug) as number;

    graph.edges.forEach((edge) => {
      let next: string | null = null;
      if (edge.from === slug) next = edge.to;
      else if (edge.to === slug) next = edge.from;
      if (next === null) return;

      const cost = base + (edge.sequel ? 0 : 1);
      if (cost > maxHops || cost >= (distance.get(next) ?? Infinity)) return;

      distance.set(next, cost);
      if (edge.sequel) queue.unshift(next);
      else queue.push(next);
    });
  }

  const titles = new Map(
    [...graph.titles].filter(([slug]) => slug === keep || distance.has(slug)),
  );

  return {
    titles,
    edges: graph.edges.filter(
      (edge) => titles.has(edge.from) && titles.has(edge.to),
    ),
  };
}

/**
 * Сторона тайтла: фильмы и пересказы — над основной линией, остальное — под ней
 */
export function resolveSide(
  slugUrl: string,
  graph: FranchiseGraph,
  mainLine: Set<string>,
): FranchiseSide {
  if (mainLine.has(slugUrl)) return 0;

  const title = graph.titles.get(slugUrl);
  const isSummary = graph.edges.some(
    (edge) => edge.label === SUMMARY_LABEL && edge.to === slugUrl,
  );

  return title?.type === FILM_TYPE || isSummary ? -1 : 1;
}

/**
 * Дата как дробный год; null — даты нет или она не читается
 */
export function toYearFraction(date: string | null): number | null {
  if (!date) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return null;

  const [, year, month, day] = match.map(Number);
  return year + (month - 1) / 12 + (day - 1) / 365;
}

/**
 * Название без общего начала франшизы: «Атака титанов: Хроника» → «Хроника».
 * Тайтл, чьё название и есть начало, не меняется
 */
export function shortenTitle(name: string, root: string): string {
  if (!root || !name.startsWith(root)) return name;

  const match = /^\s*[:—–-]\s*(.+)$/.exec(name.slice(root.length));

  return match ? match[1].trim() : name;
}

/**
 * Общее начало названий — название самого раннего тайтла основной линии
 */
export function franchiseRoot(
  graph: FranchiseGraph,
  mainLine: Set<string>,
): string {
  const first = [...mainLine]
    .map((slug) => graph.titles.get(slug))
    .filter((title): title is FranchiseTitle => Boolean(title))
    .sort(
      (a, b) =>
        (toYearFraction(a.releaseDate) ?? Infinity) -
        (toYearFraction(b.releaseDate) ?? Infinity),
    )[0];

  return first?.name ?? '';
}

const MONTHS = [
  'янв.',
  'февр.',
  'март',
  'апр.',
  'май',
  'июнь',
  'июль',
  'авг.',
  'сент.',
  'окт.',
  'нояб.',
  'дек.',
];

/**
 * Месяц и год выхода, например «июль 2018»; без даты — пустая строка
 */
export function formatReleaseMonth(date: string | null): string {
  const match = date ? /^(\d{4})-(\d{2})/.exec(date) : null;
  if (!match) return '';

  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${month} ${match[1]}` : match[1];
}

/**
 * Год для раскладки: у тайтла без даты — год связанного с ним тайтла,
 * иначе — после самого позднего
 */
function resolveYears(graph: FranchiseGraph): Map<string, number> {
  const years = new Map<string, number>();

  graph.titles.forEach((title) => {
    const year = toYearFraction(title.releaseDate);
    if (year !== null) years.set(title.slugUrl, year);
  });

  const latest = years.size > 0 ? Math.max(...years.values()) : 0;

  graph.titles.forEach((title) => {
    if (years.has(title.slugUrl)) return;

    const neighbour = graph.edges
      .map((edge) => {
        if (edge.from === title.slugUrl) return years.get(edge.to);
        if (edge.to === title.slugUrl) return years.get(edge.from);
        return undefined;
      })
      .find((year) => year !== undefined);

    years.set(title.slugUrl, neighbour ?? latest);
  });

  return years;
}

/**
 * Шкала времени: у каждого года с тайтлами своя ширина, подряд идущие
 * пустые годы схлопываются в узкий разрыв. Если шкала уже области,
 * годы растягиваются до её ширины
 */
export function buildTimeScale(
  yearWidths: Map<number, number>,
  emptyGapWidth: number,
  minWidth: number,
): TimeSegment[] {
  const years = [...yearWidths.keys()].sort((a, b) => a - b);
  const gaps = years
    .slice(1)
    .filter((year, index) => year - years[index] > 1).length;
  const occupied = years.reduce(
    (sum, year) => sum + (yearWidths.get(year) as number),
    0,
  );
  const free = minWidth - gaps * emptyGapWidth;
  const stretch = occupied > 0 && free > occupied ? free / occupied : 1;

  const segments: TimeSegment[] = [];
  let start = 0;

  years.forEach((year, index) => {
    const previous = years[index - 1];

    if (previous !== undefined && year - previous > 1) {
      const from = previous + 1;
      const to = year - 1;
      segments.push({
        year: null,
        label: from === to ? `${from}` : `${from}–${to}`,
        start,
        width: emptyGapWidth,
      });
      start += emptyGapWidth;
    }

    const width = (yearWidths.get(year) as number) * stretch;
    segments.push({ year, label: `${year}`, start, width });
    start += width;
  });

  return segments;
}

/**
 * Положение даты на шкале; год вне шкалы прижимается к ближнему краю
 */
export function timeToX(segments: TimeSegment[], yearFraction: number): number {
  const year = Math.floor(yearFraction);
  const segment = segments.find((item) => item.year === year);

  if (segment) {
    return segment.start + (yearFraction - year) * segment.width;
  }

  const last = segments[segments.length - 1];
  return last && yearFraction > (last.year ?? 0) ? last.start + last.width : 0;
}

/**
 * Тайтлы, связанные с данным
 */
export function linkedTitles(
  edges: FranchiseEdge[],
  slugUrl: string,
): Set<string> {
  const linked = new Set<string>();

  edges.forEach(({ from, to }) => {
    if (from === slugUrl) linked.add(to);
    if (to === slugUrl) linked.add(from);
  });

  return linked;
}

const overlaps = (
  spans: Array<[number, number]>,
  x: number,
  width: number,
  gap: number,
) => spans.some(([start, end]) => x < end + gap && x + width > start - gap);

/**
 * Ширина года: столько узлов, сколько нужно уместить в самом плотном ряду
 */
function measureYears(
  graph: FranchiseGraph,
  mainLine: Set<string>,
  years: Map<string, number>,
  options: FranchiseLayoutOptions,
): Map<number, number> {
  const counts = new Map<number, Record<FranchiseSide, number>>();

  years.forEach((value, slug) => {
    const year = Math.floor(value);
    const side = resolveSide(slug, graph, mainLine);
    const count = counts.get(year) || { [-1]: 0, 0: 0, 1: 0 };
    count[side] += 1;
    counts.set(year, count);
  });

  const step = options.nodeWidth + options.gap;
  const widths = new Map<number, number>();

  counts.forEach((count, year) => {
    const perRow = Math.max(
      count[0],
      Math.ceil(count[-1] / options.rowsAbove),
      Math.ceil(count[1] / options.rowsBelow),
    );
    widths.set(year, Math.max(options.minYearWidth, perRow * step));
  });

  return widths;
}

/**
 * Раскладка: по горизонтали — дата выхода, основная линия в нулевом ряду.
 * Тайтлы одной стороны занимают первый свободный ряд; если места нет,
 * сдвигаются вправо в ближнем ряду
 */
export function layoutFranchise(
  graph: FranchiseGraph,
  mainLine: Set<string>,
  options: FranchiseLayoutOptions,
): FranchiseLayout {
  const { nodeWidth, gap, rowsAbove, rowsBelow } = options;
  const years = resolveYears(graph);
  const segments = buildTimeScale(
    measureYears(graph, mainLine, years, options),
    options.emptyGapWidth,
    options.minWidth,
  );

  const ordered = [...graph.titles.keys()].sort(
    (a, b) =>
      (years.get(a) as number) - (years.get(b) as number) || a.localeCompare(b),
  );

  const rows = new Map<number, Array<[number, number]>>();
  const nodes = new Map<string, FranchiseNodePlacement>();
  const xOf = (slug: string) => timeToX(segments, years.get(slug) as number);

  const place = (slugUrl: string, x: number, row: number) => {
    rows.set(row, [...(rows.get(row) || []), [x, x + nodeWidth]]);
    nodes.set(slugUrl, { slugUrl, x, row });
  };

  const rightmostFree = (row: number, x: number) => {
    const spans = [...(rows.get(row) || [])].sort((a, b) => a[0] - b[0]);

    return spans.reduce(
      (next, [start, end]) =>
        next < end + gap && next + nodeWidth > start - gap ? end + gap : next,
      x,
    );
  };

  ordered
    .filter((slug) => mainLine.has(slug))
    .forEach((slug) => place(slug, rightmostFree(0, xOf(slug)), 0));

  ordered
    .filter((slug) => !mainLine.has(slug))
    .forEach((slug) => {
      const side = resolveSide(slug, graph, mainLine);
      const limit = side < 0 ? rowsAbove : rowsBelow;
      const x = xOf(slug);

      for (let depth = 1; depth <= limit; depth += 1) {
        const row = side * depth;
        if (!overlaps(rows.get(row) || [], x, nodeWidth, gap)) {
          place(slug, x, row);
          return;
        }
      }

      let bestRow = side;
      let bestX = Infinity;
      for (let depth = 1; depth <= limit; depth += 1) {
        const candidate = rightmostFree(side * depth, x);
        if (candidate < bestX) {
          bestX = candidate;
          bestRow = side * depth;
        }
      }
      place(slug, bestX, bestRow);
    });

  const placed = [...nodes.values()];
  const last = segments[segments.length - 1];

  return {
    nodes,
    segments,
    width: Math.max(
      last ? last.start + last.width : 0,
      options.minWidth,
      ...placed.map((node) => node.x + nodeWidth),
    ),
    minRow: Math.min(0, ...placed.map((node) => node.row)),
    maxRow: Math.max(0, ...placed.map((node) => node.row)),
  };
}

/**
 * Конец связи, который смотреть позже. У продолжения это само продолжение,
 * у прочих связей — тайтл, вышедший позже; невышедший тайтл без даты —
 * всегда позже. При равных датах — конец связи
 */
export function laterEnd(
  edge: FranchiseEdge,
  titles: Map<string, FranchiseTitle>,
): string {
  if (edge.sequel) return edge.to;

  const from = toYearFraction(titles.get(edge.from)?.releaseDate ?? null);
  const to = toYearFraction(titles.get(edge.to)?.releaseDate ?? null);

  if (to === null) return edge.to;
  if (from === null || from > to) return edge.from;
  return edge.to;
}

/**
 * Маска затухания горизонтальной ленты у краёв со скрытым содержимым
 */

/**
 * Собирает mask-image: затухает только тот край, за которым есть содержимое
 */
export function buildEdgeFadeMask(
  fadeStart: boolean,
  fadeEnd: boolean,
  size: number,
  solid: string,
): string {
  const startSize = fadeStart ? size : 0;
  const endSize = fadeEnd ? size : 0;
  const startColor = fadeStart ? 'transparent' : solid;
  const endColor = fadeEnd ? 'transparent' : solid;

  return `linear-gradient(to right, ${startColor} 0px, ${solid} ${startSize}px, ${solid} calc(100% - ${endSize}px), ${endColor} 100%)`;
}

export default buildEdgeFadeMask;

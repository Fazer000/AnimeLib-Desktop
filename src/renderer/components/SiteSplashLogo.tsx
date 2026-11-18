import React, { useEffect, useId, useRef } from 'react';
import { useTheme } from '@mui/material';
import type { LibSite } from '../../constants';
import { LIB_SITE_COLORS } from '../theme/palette';
import paths from './siteSplashPaths';

interface Props {
  site: LibSite;
  visible: boolean;
}

const traces = [
  'M6.4 43.2V9.4Q6.4 6.45 9.4 6.45H43.2',
  'M97.4 61V94.8Q97.4 97.75 94.4 97.75H60.6',
];
const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** Хореография мобильной эмблемы без перерисовок React на каждом кадре. */
export default function SiteSplashLogo({ site, visible }: Props) {
  const { customColors } = useTheme().palette;
  const id = useId();
  const root = useRef<SVGSVGElement>(null);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const letter = paths[`LETTER_${site.letter}` as keyof typeof paths];
  const letterTransform = { R: 'translate(3.5 0)', H: 'translate(5 0)' }[
    site.letter
  ];

  useEffect(() => {
    const svg = root.current;
    if (!svg) return undefined;
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const brackets = Array.from(svg.querySelectorAll<SVGGElement>('.bracket'));
    const pulses = Array.from(svg.querySelectorAll<SVGPathElement>('.pulse'));
    const sparks = Array.from(svg.querySelectorAll<SVGCircleElement>('.spark'));
    const letterGroup = svg.querySelector<SVGGElement>('.letter')!;
    const sheen = svg.querySelector<SVGRectElement>('.sheen')!;
    const lengths = pulses.map((path) => path.getTotalLength());
    const start = performance.now();
    let exitStart: number | null = null;
    let frozenBlend = 0;
    let frame = 0;
    const paint = (now: number) => {
      const elapsed = now - start;
      const blendT = clamp((elapsed - 280) / 260);
      let blend = blendT * blendT * (3 - 2 * blendT);
      if (!visibleRef.current && exitStart === null) {
        exitStart = now;
        frozenBlend = clamp((elapsed - 280) / 260);
      }
      const exit =
        exitStart === null ? 0 : 1 - (1 - clamp((now - exitStart) / 240)) ** 3;
      if (exitStart !== null) blend = frozenBlend * (1 - exit);
      const entry = reduced ? 1 : 1 - (1 - clamp(elapsed / 380)) ** 5;
      const cycle = (Math.max(0, elapsed - 280) % 1400) / 1400;
      const breath = reduced ? 0 : Math.sin(cycle * 2 * Math.PI) * blend;
      const offset = reduced
        ? 0
        : (1 - entry) * 18.5 + 1.35 * breath + 6.8 * exit;
      svg.style.opacity = String(reduced ? 1 : clamp(elapsed / 160));
      const scale = reduced
        ? 1
        : 0.9 + 0.1 * entry + 0.015 * breath + 0.042 * exit;
      letterGroup.setAttribute(
        'transform',
        `translate(51.9 52.1) scale(${scale}) translate(-51.9 -52.1)`,
      );
      const glint = (1 - Math.cos(clamp((cycle - 0.46) / 0.42) * Math.PI)) / 2;
      sheen.setAttribute('transform', `translate(${-15 + 134 * glint} 0)`);
      sheen.style.opacity = String(
        !reduced && cycle >= 0.46 && cycle <= 0.88 ? blend : 0,
      );
      brackets.forEach((bracket, index) => {
        const shift = index === 0 ? -offset : offset;
        bracket.setAttribute('transform', `translate(${shift} ${shift})`);
        const t = clamp(cycle / 0.72);
        const u = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        const length = lengths[index];
        const travel = u * length * 1.44;
        const tail = Math.max(0, travel - length * 0.44);
        const head = Math.min(length, travel);
        const alpha =
          reduced || cycle > 0.72
            ? 0
            : clamp(
                Math.min(
                  travel / (length * 0.44),
                  (length * 1.44 - travel) / (length * 0.44),
                ),
              ) * blend;
        const pulse = pulses[index];
        pulse.style.strokeDasharray = `${Math.max(0, head - tail)} ${length * 2}`;
        pulse.style.strokeDashoffset = String(-tail);
        pulse.style.opacity = String(alpha);
        const point = pulse.getPointAtLength(head);
        sparks[index].setAttribute('cx', String(point.x));
        sparks[index].setAttribute('cy', String(point.y));
        sparks[index].style.opacity = String(alpha * 0.49);
      });
      if (!reduced && exit < 1) frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame);
  }, [site.siteId]);

  return (
    <svg
      ref={root}
      width="112"
      height="112"
      viewBox="0 0 103.8 104.2"
      style={{ overflow: 'visible' }}
      aria-hidden
    >
      <defs>
        <clipPath id={`${id}-letter`}>
          <path d={letter} transform={letterTransform} fillRule="evenodd" />
        </clipPath>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0.42">
          <stop
            offset="0"
            stopColor={customColors.whiteColor}
            stopOpacity="0"
          />
          <stop
            offset="0.5"
            stopColor={customColors.whiteColor}
            stopOpacity="0.56"
          />
          <stop
            offset="1"
            stopColor={customColors.whiteColor}
            stopOpacity="0"
          />
        </linearGradient>
        {[paths.BRACKET_TL, paths.BRACKET_BR].map((path, index) => (
          <clipPath key={path} id={`${id}-bracket-${index}`}>
            <path d={path} />
          </clipPath>
        ))}
      </defs>
      <g className="letter">
        <path
          d={letter}
          transform={letterTransform}
          fill={customColors.dialogTextColor}
          fillRule="evenodd"
        />
        <g clipPath={`url(#${id}-letter)`}>
          <rect
            className="sheen"
            x="-24"
            width="48"
            height="105"
            fill={`url(#${id}-sheen)`}
          />
        </g>
      </g>
      {[paths.BRACKET_TL, paths.BRACKET_BR].map((path, index) => (
        <g key={path} className="bracket">
          <path d={path} fill={LIB_SITE_COLORS[site.siteId]} />
          <g clipPath={`url(#${id}-bracket-${index})`}>
            <path
              className="pulse"
              d={traces[index]}
              fill="none"
              stroke={customColors.whiteColor}
              strokeOpacity="0.43"
              strokeWidth="10.5"
              strokeLinecap="round"
              style={{ opacity: 0 }}
            />
            <circle
              className="spark"
              r="4.2"
              fill={customColors.whiteColor}
              style={{ opacity: 0 }}
            />
          </g>
        </g>
      ))}
    </svg>
  );
}

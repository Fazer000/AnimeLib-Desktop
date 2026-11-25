import React, { useEffect, useId, useRef } from 'react';
import { useTheme } from '@mui/material';
import type { LibSite } from '../../constants';
import { LIB_SITE_COLORS } from '../theme/palette';
import paths from './siteSplashPaths';
import { splashFrame, splashPulse } from '../utils/splashAnimation';

interface Props {
  site: LibSite;
  visible: boolean;
}

const traces = [
  'M6.4 43.2V9.4Q6.4 6.45 9.4 6.45H43.2',
  'M97.4 61V94.8Q97.4 97.75 94.4 97.75H60.6',
];
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
    let frame = 0;
    const paint = (now: number) => {
      const elapsed = now - start;
      if (!visibleRef.current && exitStart === null) {
        exitStart = now;
      }
      const {
        exit,
        offset,
        opacity,
        scale,
        cycle,
        blend,
        sheenX,
        sheenOpacity,
      } = splashFrame(
        elapsed,
        exitStart === null ? null : now - exitStart,
        reduced,
      );
      svg.style.opacity = String(opacity);
      letterGroup.setAttribute(
        'transform',
        `translate(51.9 52.1) scale(${scale}) translate(-51.9 -52.1)`,
      );
      sheen.setAttribute('transform', `translate(${sheenX} 0)`);
      sheen.style.opacity = String(sheenOpacity);
      brackets.forEach((bracket, index) => {
        const shift = index === 0 ? -offset : offset;
        bracket.setAttribute('transform', `translate(${shift} ${shift})`);
        const length = lengths[index];
        const { head, tail, alpha } = splashPulse(
          length,
          cycle,
          blend,
          reduced,
        );
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

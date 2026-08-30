import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { SubtitleCue } from '../../utils/subtitleHelpers';
import { SubtitlesSettings, PlaybackTimeStore } from '../../services/player';
import { SUBTITLES_BASE_FONT_CQH } from '../../../constants';

interface SubtitlesOverlayProps {
  cues: SubtitleCue[];
  timeStore: PlaybackTimeStore;
  settings: SubtitlesSettings;
}

/**
 * Оверлей субтитров форматов srt/vtt (ass рисует JASSUB).
 * Перерисовывается только при смене реплики, а не на каждом тике времени.
 */
function SubtitlesOverlay({
  cues,
  timeStore,
  settings,
}: SubtitlesOverlayProps) {
  const [activeCue, setActiveCue] = useState<SubtitleCue | null>(null);

  useEffect(() => {
    const pick = (time: number) => {
      const next =
        cues.find((cue) => time >= cue.from && time <= cue.to) ?? null;
      setActiveCue((prev) => (prev === next ? prev : next));
    };

    pick(timeStore.getCurrentTime());
    return timeStore.subscribe(pick);
  }, [cues, timeStore]);

  if (!activeCue) return null;

  const isBox = settings.outline === 'box';
  const isOutline = settings.outline === 'outline';

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        containerType: 'size',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 898,
      }}
    >
      <Box
        sx={{
          maxWidth: '86%',
          mb: `${48 + settings.offsetY}px`,
          px: isBox ? 1.5 : 0,
          py: isBox ? 0.5 : 0,
          borderRadius: isBox ? 1 : 0,
          backgroundColor: isBox ? 'rgba(0, 0, 0, 0.65)' : 'transparent',
          color: 'white',
          textAlign: 'center',
          whiteSpace: 'pre-line',
          fontFamily: 'Roboto, sans-serif',
          fontWeight: 500,
          lineHeight: 1.3,
          fontSize: `calc(${SUBTITLES_BASE_FONT_CQH}cqh * ${settings.fontScale})`,
          textShadow: isOutline
            ? '0 0 4px rgba(0,0,0,0.9), 1px 1px 2px rgba(0,0,0,0.9), -1px -1px 2px rgba(0,0,0,0.9)'
            : 'none',
        }}
      >
        {activeCue.text}
      </Box>
    </Box>
  );
}

export default SubtitlesOverlay;

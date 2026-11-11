import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { SubtitleCue, activeCues } from '../../utils/subtitleHelpers';
import { SubtitlesSettings, PlaybackTimeStore } from '../../services/player';
import { SUBTITLES_BASE_FONT_CQH, SUBTITLES_Z_INDEX } from '../../../constants';

interface SubtitlesOverlayProps {
  cues: SubtitleCue[];
  timeStore: PlaybackTimeStore;
  settings: SubtitlesSettings;
}

/** Оверлей субтитров форматов srt/vtt (ass рисует JASSUB) */
function SubtitlesOverlay({
  cues,
  timeStore,
  settings,
}: SubtitlesOverlayProps) {
  const [visible, setVisible] = useState<SubtitleCue[]>([]);

  useEffect(() => {
    const pick = (time: number) => {
      const next = activeCues(cues, time);
      setVisible((prev) =>
        prev.length === next.length &&
        prev.every((cue, index) => cue === next[index])
          ? prev
          : next,
      );
    };

    pick(timeStore.getCurrentTime());
    return timeStore.subscribe(pick);
  }, [cues, timeStore]);

  if (visible.length === 0) return null;

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
        zIndex: SUBTITLES_Z_INDEX,
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
        {visible.map((cue) => cue.text).join('\n')}
      </Box>
    </Box>
  );
}

export default SubtitlesOverlay;

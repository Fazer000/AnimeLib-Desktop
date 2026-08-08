import { Box } from '@mui/material';
import { SubtitleCue } from '../../utils/subtitleHelpers';
import { SubtitlesSettings } from './SubtitlesManager';
import { SUBTITLES_BASE_FONT_CQH } from '../../../constants';

interface SubtitlesOverlayProps {
  cues: SubtitleCue[];
  currentTime: number;
  settings: SubtitlesSettings;
}

/**
 * Оверлей субтитров форматов srt/vtt (ass рисует JASSUB)
 */
function SubtitlesOverlay({
  cues,
  currentTime,
  settings,
}: SubtitlesOverlayProps) {
  const activeCue = cues.find(
    (cue) => currentTime >= cue.from && currentTime <= cue.to,
  );

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

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
  useTheme,
} from '@mui/material';
import type { CustomColors } from '@mui/material/styles';
import DialogCloseButton from '../DialogCloseButton';
import {
  DIALOG_TITLE_RIGHT_INSET,
  SUBSCRIPTION_ANY_TEAM,
  TRANSLATION_TYPE_SUBTITLES,
  TRANSLATION_TYPE_VOICE,
} from '../../../constants';
import type { AnimeSubscription, AnimeTeam } from '../../api/animeApi';
import {
  buildSubscriptionItems,
  getSubscribedTeams,
  splitTeamsByBranch,
  toggleSubscriptionTeam,
} from '../../utils/animeSubscriptions';

const checkboxSx = (colors: CustomColors) => ({
  py: 0.5,
  color: `rgba(${colors.onSurfaceRgb}, 0.4)`,
  '&.Mui-checked': { color: colors.accentSoftColor },
  '&:hover': { backgroundColor: `rgba(${colors.accentRgb}, 0.08)` },
});

interface TeamGroupProps {
  title: string;
  anyLabel: string;
  teams: AnimeTeam[];
  selected: number[];
  onToggle: (teamId: number) => void;
}

/**
 * Группа команд одного типа перевода с пунктом «Любая»
 */
function TeamGroup({
  title,
  anyLabel,
  teams,
  selected,
  onToggle,
}: TeamGroupProps) {
  const { customColors } = useTheme().palette;
  const options = [{ id: SUBSCRIPTION_ANY_TEAM, name: anyLabel }, ...teams];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', mb: 1.5 }}>
      <Typography
        sx={{
          color: `rgba(${customColors.onSurfaceRgb}, 0.55)`,
          fontSize: '0.8125rem',
          mb: 0.25,
        }}
      >
        {title}
      </Typography>
      {options.map((team) => (
        <FormControlLabel
          key={team.id}
          control={
            <Checkbox
              checked={selected.includes(team.id)}
              onChange={() => onToggle(team.id)}
              sx={checkboxSx(customColors)}
            />
          }
          label={
            <Typography
              sx={{ color: `rgba(${customColors.onSurfaceRgb}, 0.85)` }}
            >
              {team.name}
            </Typography>
          }
        />
      ))}
    </Box>
  );
}

interface AnimeSubscriptionDialogProps {
  open: boolean;
  teams: AnimeTeam[];
  subscriptions: AnimeSubscription[];
  onSave: (items: AnimeSubscription[]) => Promise<boolean>;
  onClose: () => void;
}

/**
 * Выбор команд, о новых сериях которых приходят уведомления
 */
function AnimeSubscriptionDialog({
  open,
  teams,
  subscriptions,
  onSave,
  onClose,
}: AnimeSubscriptionDialogProps) {
  const { customColors } = useTheme().palette;
  const [voices, setVoices] = useState<number[]>([]);
  const [subtitles, setSubtitles] = useState<number[]>([]);
  const [saving, setSaving] = useState<boolean>(false);

  const groups = useMemo(() => splitTeamsByBranch(teams), [teams]);

  useEffect(() => {
    if (!open) return;
    setVoices(getSubscribedTeams(subscriptions, TRANSLATION_TYPE_VOICE));
    setSubtitles(getSubscribedTeams(subscriptions, TRANSLATION_TYPE_SUBTITLES));
  }, [open, subscriptions]);

  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave(buildSubscriptionItems(voices, subtitles));
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            backgroundColor: customColors.dialogColor,
            backgroundImage: 'none',
            border: `1px solid ${customColors.lineColor}`,
            borderRadius: 2,
            position: 'relative',
            width: 400,
          },
        },
      }}
    >
      <DialogCloseButton onClose={onClose} />

      <DialogTitle
        sx={{
          color: `rgba(${customColors.onSurfaceRgb}, 0.95)`,
          fontSize: '1.0625rem',
          fontWeight: 600,
          pr: `${DIALOG_TITLE_RIGHT_INSET}px`,
        }}
      >
        Уведомления о выходе серий
      </DialogTitle>

      <DialogContent sx={{ pb: 3 }}>
        <TeamGroup
          title="Озвучка"
          anyLabel="Любая"
          teams={groups.voices}
          selected={voices}
          onToggle={(id) =>
            setVoices((current) => toggleSubscriptionTeam(current, id))
          }
        />
        <TeamGroup
          title="Субтитры"
          anyLabel="Любые"
          teams={groups.subtitles}
          selected={subtitles}
          onToggle={(id) =>
            setSubtitles((current) => toggleSubscriptionTeam(current, id))
          }
        />

        <Button
          fullWidth
          disabled={saving}
          onClick={handleSave}
          sx={{
            mt: 0.5,
            height: 38,
            borderRadius: '6px',
            textTransform: 'none',
            fontWeight: 600,
            backgroundColor: customColors.secondaryColor,
            color: customColors.onAccentColor,
            '&:hover': { backgroundColor: customColors.accentHoverColor },
            '&.Mui-disabled': {
              color: customColors.onAccentColor,
              opacity: 0.7,
            },
          }}
        >
          {saving ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            'Сохранить'
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default AnimeSubscriptionDialog;

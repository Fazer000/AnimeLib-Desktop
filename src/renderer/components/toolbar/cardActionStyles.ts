/**
 * Стили кнопок действий в карточке аниме
 */
import type { CustomColors } from '@mui/material/styles';

/**
 * Базовая кнопка действия: нейтральная подложка и обводка
 */
export const cardActionButtonSx = (colors: CustomColors) => ({
  height: 32,
  minWidth: 0,
  px: 1.5,
  gap: 0.75,
  borderRadius: '6px',
  border: `1px solid ${colors.lineColor}`,
  backgroundColor: `rgba(${colors.onSurfaceRgb}, 0.06)`,
  color: colors.primaryTextColor,
  textTransform: 'none' as const,
  fontSize: '0.8125rem',
  fontWeight: 600,
  whiteSpace: 'nowrap' as const,
  transition: 'background-color 0.15s ease, color 0.15s ease',
  '&:hover': { backgroundColor: `rgba(${colors.onSurfaceRgb}, 0.12)` },
  '&.Mui-disabled': {
    color: `rgba(${colors.onSurfaceRgb}, 0.4)`,
  },
  '& svg': { fontSize: 16 },
});

/**
 * Акцентная кнопка действия: включённое состояние
 */
export const cardActionAccentSx = (colors: CustomColors) => ({
  backgroundColor: colors.secondaryColor,
  borderColor: colors.secondaryColor,
  color: colors.onAccentColor,
  '&:hover': { backgroundColor: colors.accentHoverColor },
});

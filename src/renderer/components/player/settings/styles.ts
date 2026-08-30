import type { SxProps, Theme } from '@mui/material';

export const MENU_ICON_SIZE = 20;

export const ROW_SX = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  gap: 1,
};

const MENU_ITEM_BASE = {
  color: 'white',
  fontFamily: 'Roboto, sans-serif',
  fontSize: '0.875rem',
  py: 0.75,
  px: 1.5,
  minHeight: 'auto',
};

/** Строка, ведущая на вложенную страницу или переключающая настройку. */
export const NAV_ITEM_SX = {
  ...MENU_ITEM_BASE,
  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
};

/** Строка выбора из списка с подсветкой выбранного. */
export const OPTION_ITEM_SX = {
  ...MENU_ITEM_BASE,
  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  '&.Mui-selected': {
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    color: '#BB86FC',
  },
};

/** То же, но без заливки выбранного пункта. */
export const OPTION_ITEM_PLAIN_SX = {
  ...MENU_ITEM_BASE,
  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
};

export const TITLE_SX = { fontWeight: 500 };

export const CAPTION_SX = {
  color: 'rgba(255, 255, 255, 0.6)',
  fontSize: '11px',
};

export const CAPTION_BLOCK_SX = {
  ...CAPTION_SX,
  display: 'block',
};

export const CHEVRON_SX = { color: 'rgba(255, 255, 255, 0.7)' };

export const CHECK_ICON_SX = { fontSize: 16, color: '#BB86FC' };

export const HEADER_SX = {
  display: 'flex',
  alignItems: 'center',
  px: 1.5,
  py: 0.75,
  borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
};

export const BACK_BUTTON_SX = {
  color: 'rgba(255, 255, 255, 0.7)',
  padding: 0.25,
  mr: 0.75,
  minWidth: 'auto',
  width: 24,
  height: 24,
  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
};

export const HEADER_TITLE_SX = {
  color: 'white',
  fontFamily: 'Roboto, sans-serif',
  fontWeight: 500,
  fontSize: '0.875rem',
};

export const SECTION_LABEL_SX = {
  color: 'rgba(255, 255, 255, 0.5)',
  fontSize: '11px',
  mb: 0.5,
  display: 'block',
};

const switchSx = (accent: string, trackColor: string) => ({
  '& .MuiSwitch-switchBase': {
    color: '#BDBDBD',
    '&.Mui-checked': {
      color: accent,
      '& + .MuiSwitch-track': {
        backgroundColor: trackColor,
        border: `1px solid ${accent}`,
      },
    },
  },
  '& .MuiSwitch-track': {
    backgroundColor: 'rgba(189, 189, 189, 0.3)',
    border: '1px solid #BDBDBD',
  },
  '& .MuiSwitch-thumb': {
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
});

export const SWITCH_SX = switchSx('#BB86FC', 'rgba(187, 134, 252, 0.3)');

export const SWITCH_SKIP_SX = switchSx('#C084FC', 'rgba(192, 132, 252, 0.3)');

/** Квадратная плашка с иконкой или тегом качества слева от строки. */
export const menuIconBoxSx = (color: string) => ({
  width: 38,
  height: 38,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 1,
  border: `1px solid ${color}59`,
  color,
  fontFamily: 'Roboto, sans-serif',
  fontSize: '0.6875rem',
  fontWeight: 700,
  lineHeight: 1,
});

export const qualityTagSx = (color: string) => ({
  minWidth: 36,
  textAlign: 'center' as const,
  px: 0.75,
  py: '2px',
  borderRadius: 1,
  fontFamily: 'Roboto, sans-serif',
  fontSize: '0.625rem',
  fontWeight: 700,
  color,
  border: `1px solid ${color}59`,
});

export type ChipSx = (isSelected: boolean) => SxProps<Theme>;

/** Собирает стиль чипа: различаются только ширина, отступы и кегль. */
const makeChipSx =
  (flex: string, px: number, fontSize: string): ChipSx =>
  (isSelected: boolean) => ({
    flex,
    textAlign: 'center' as const,
    py: 0.75,
    px,
    borderRadius: 1,
    cursor: 'pointer',
    backgroundColor: isSelected
      ? 'rgba(124, 58, 237, 0.3)'
      : 'rgba(255, 255, 255, 0.1)',
    border: isSelected ? '1px solid #BB86FC' : '1px solid transparent',
    color: isSelected ? '#BB86FC' : 'rgba(255, 255, 255, 0.7)',
    fontWeight: isSelected ? 600 : 400,
    fontSize,
    fontFamily: 'Roboto, sans-serif',
    transition: 'all 0.15s ease',
    '&:hover': {
      backgroundColor: isSelected
        ? 'rgba(124, 58, 237, 0.4)'
        : 'rgba(255, 255, 255, 0.15)',
    },
  });

export const CHIP_SX = makeChipSx('1 1 auto', 1, '0.8125rem');

export const CHIP_THIRD_SX = makeChipSx(
  '0 0 calc(33.333% - 4px)',
  1,
  '0.875rem',
);

export const CHIP_QUARTER_SX = makeChipSx(
  '0 0 calc(25% - 4px)',
  0.5,
  '0.875rem',
);

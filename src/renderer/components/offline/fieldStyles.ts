/**
 * Оформление и поведение выпадающих полей менеджера загрузок
 */
import type { CustomColors } from '@mui/material/styles';
import { OFFLINE_FONT } from '../../../constants';

/**
 * Рамка и текст выпадающего поля
 */
export const offlineSelectSx = (customColors: CustomColors) => ({
  fontSize: OFFLINE_FONT.episode,
  color: customColors.dialogTextColor,
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: customColors.borderColor,
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: customColors.accentSoftColor,
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: customColors.accentSoftColor,
    borderWidth: 1,
  },
  '& .MuiSvgIcon-root': {
    color: `rgba(${customColors.onSurfaceRgb}, 0.6)`,
  },
});

/**
 * Подпись над выпадающим полем
 */
export const offlineLabelSx = (customColors: CustomColors) => ({
  fontSize: OFFLINE_FONT.episode,
  color: `rgba(${customColors.onSurfaceRgb}, 0.55)`,
  '&.Mui-focused': { color: customColors.accentSoftColor },
});

/** Снимает фокус с поля после закрытия меню */
export const blurSelectOnClose = (): void => {
  setTimeout(() => {
    const active = document.activeElement;

    if (
      active instanceof HTMLElement &&
      active.getAttribute('role') === 'combobox'
    ) {
      active.blur();
    }
  });
};

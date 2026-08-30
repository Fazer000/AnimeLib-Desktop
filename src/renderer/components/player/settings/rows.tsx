import React from 'react';
import { Box, IconButton, MenuItem, Switch, Typography } from '@mui/material';
import { ArrowBackRounded, CheckRounded } from '@mui/icons-material';
import {
  BACK_BUTTON_SX,
  CAPTION_BLOCK_SX,
  CAPTION_SX,
  CHECK_ICON_SX,
  CHEVRON_SX,
  HEADER_SX,
  HEADER_TITLE_SX,
  NAV_ITEM_SX,
  OPTION_ITEM_PLAIN_SX,
  OPTION_ITEM_SX,
  ROW_SX,
  SECTION_LABEL_SX,
  SWITCH_SX,
  TITLE_SX,
  type ChipSx,
} from './styles';

const stop = (event: React.MouseEvent | React.ChangeEvent) => {
  event.stopPropagation();
};

interface PageHeaderProps {
  title: string;
  onBack: () => void;
}

/** Заголовок вложенной страницы с кнопкой возврата. */
export function PageHeader({ title, onBack }: PageHeaderProps) {
  return (
    <Box sx={HEADER_SX}>
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          onBack();
        }}
        sx={BACK_BUTTON_SX}
      >
        <ArrowBackRounded sx={{ fontSize: 16 }} />
      </IconButton>
      <Typography variant="subtitle2" sx={HEADER_TITLE_SX}>
        {title}
      </Typography>
    </Box>
  );
}

interface NavRowProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  onClick: () => void;
  noWrapValue?: boolean;
}

/** Строка главной страницы, ведущая на вложенную. */
export function NavRow({
  icon,
  title,
  value,
  onClick,
  noWrapValue = false,
}: NavRowProps) {
  return (
    <MenuItem
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      sx={NAV_ITEM_SX}
    >
      <Box sx={ROW_SX}>
        {icon}
        <Box sx={noWrapValue ? { flex: 1, minWidth: 0 } : { flex: 1 }}>
          <Typography variant="body2" sx={TITLE_SX}>
            {title}
          </Typography>
          <Typography
            variant="caption"
            noWrap={noWrapValue}
            sx={noWrapValue ? CAPTION_BLOCK_SX : CAPTION_SX}
          >
            {value}
          </Typography>
        </Box>
        <Typography variant="body2" sx={CHEVRON_SX}>
          ›
        </Typography>
      </Box>
    </MenuItem>
  );
}

NavRow.defaultProps = { noWrapValue: false };

interface ToggleRowProps {
  title: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  switchSx?: object;
}

/** Строка с переключателем. Клик по строке и по самому Switch даёт один тумблер. */
export function ToggleRow({
  title,
  checked,
  onChange,
  switchSx = SWITCH_SX,
}: ToggleRowProps) {
  return (
    <MenuItem
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      sx={NAV_ITEM_SX}
    >
      <Box sx={ROW_SX}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={TITLE_SX}>
            {title}
          </Typography>
        </Box>
        <Switch
          checked={checked}
          onClick={stop}
          onChange={(e) => {
            e.stopPropagation();
            onChange(e.target.checked);
          }}
          sx={switchSx}
          size="small"
        />
      </Box>
    </MenuItem>
  );
}

ToggleRow.defaultProps = { switchSx: SWITCH_SX };

interface OptionRowProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
  leading?: React.ReactNode;
  highlightSelected?: boolean;
  noWrapLabel?: boolean;
}

/** Пункт списка выбора с галочкой у активного. */
export function OptionRow({
  label,
  selected,
  onSelect,
  leading = null,
  highlightSelected = true,
  noWrapLabel = false,
}: OptionRowProps) {
  return (
    <MenuItem
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      sx={highlightSelected ? OPTION_ITEM_SX : OPTION_ITEM_PLAIN_SX}
      selected={selected}
    >
      <Box sx={ROW_SX}>
        {leading}
        <Typography
          variant="body2"
          noWrap={noWrapLabel}
          sx={{ flex: 1, fontWeight: selected ? 600 : 500 }}
        >
          {label}
        </Typography>
        {selected && <CheckRounded sx={CHECK_ICON_SX} />}
      </Box>
    </MenuItem>
  );
}

OptionRow.defaultProps = {
  leading: null,
  highlightSelected: true,
  noWrapLabel: false,
};

interface ChipGroupProps<T> {
  label: string;
  options: T[];
  getKey: (option: T) => string | number;
  getLabel: (option: T) => React.ReactNode;
  isSelected: (option: T) => boolean;
  onSelect: (option: T) => void;
  chipSx: ChipSx;
  wrap?: boolean;
  mb?: number;
}

/** Подпись и ряд чипов выбора. */
export function ChipGroup<T>({
  label,
  options,
  getKey,
  getLabel,
  isSelected,
  onSelect,
  chipSx,
  wrap = false,
  mb = 0,
}: ChipGroupProps<T>) {
  return (
    <>
      <Typography variant="caption" sx={SECTION_LABEL_SX}>
        {label}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          gap: 0.5,
          flexWrap: wrap ? 'wrap' : 'nowrap',
          mb,
        }}
      >
        {options.map((option) => (
          <Box
            key={getKey(option)}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(option);
            }}
            sx={chipSx(isSelected(option))}
          >
            {getLabel(option)}
          </Box>
        ))}
      </Box>
    </>
  );
}

ChipGroup.defaultProps = { wrap: false, mb: 0 };

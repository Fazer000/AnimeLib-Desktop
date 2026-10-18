import React from 'react';
import {
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Tooltip,
  useTheme,
} from '@mui/material';
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from '../icons';
import {
  OFFLINE_ICON,
  OFFLINE_LIBRARY_SORT_FIELDS,
  OFFLINE_LIBRARY_SORT_WIDTH,
  OfflineLibrarySort,
  OfflineLibrarySortField,
} from '../../../constants';
import {
  getSortDirectionLabel,
  getSortFieldLabel,
  splitLibrarySort,
  toggleSortDirection,
  withSortField,
} from '../../utils/librarySort';
import { offlineLabelSx, offlineSelectSx } from './fieldStyles';

interface LibrarySortFieldProps {
  value: OfflineLibrarySort;
  onChange: (value: OfflineLibrarySort) => void;
}

const LABEL_ID = 'offline-library-sort-label';

/**
 * Поле сортировки библиотеки: тип в списке, направление — кнопкой
 * у правого края того же поля
 */
function LibrarySortField({ value, onChange }: LibrarySortFieldProps) {
  const { customColors } = useTheme().palette;
  const { field, direction } = splitLibrarySort(value);
  const DirectionIcon =
    direction === 'desc' ? ArrowDownWideNarrow : ArrowUpNarrowWide;

  return (
    <FormControl
      size="small"
      sx={{ width: OFFLINE_LIBRARY_SORT_WIDTH, flexShrink: 0 }}
    >
      <InputLabel id={LABEL_ID} sx={offlineLabelSx(customColors)}>
        Сортировка
      </InputLabel>
      <Select
        labelId={LABEL_ID}
        value={field}
        onChange={(event) =>
          onChange(withSortField(event.target.value as OfflineLibrarySortField))
        }
        input={
          <OutlinedInput
            label="Сортировка"
            endAdornment={
              <InputAdornment
                position="end"
                sx={{
                  height: '100%',
                  maxHeight: 'none',
                  ml: 0,
                  borderLeft: `1px solid ${customColors.borderColor}`,
                }}
              >
                <Tooltip title={getSortDirectionLabel(value)} arrow>
                  <IconButton
                    size="small"
                    aria-label={getSortDirectionLabel(value)}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onChange(toggleSortDirection(value));
                    }}
                    sx={{
                      mx: 0.5,
                      color: customColors.dialogTextColor,
                    }}
                  >
                    <DirectionIcon sx={{ fontSize: OFFLINE_ICON.md }} />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            }
          />
        }
        sx={{
          ...offlineSelectSx(customColors),
          pr: 0,
          '& .MuiSelect-icon': { right: 48 },
          '& .MuiSelect-select': { pr: '32px !important' },
        }}
      >
        {OFFLINE_LIBRARY_SORT_FIELDS.map((item) => (
          <MenuItem key={item} value={item}>
            {getSortFieldLabel(item)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default LibrarySortField;

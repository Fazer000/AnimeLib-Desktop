import '@testing-library/jest-dom';
import { Dialog, ThemeProvider } from '@mui/material';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import OfflineLibraryTab from '../renderer/components/offline/OfflineLibraryTab';
import { createAppTheme } from '../renderer/theme/appTheme';

it('переводит фокус во вложенное окно и возвращает его после клика снаружи', async () => {
  render(
    <ThemeProvider theme={createAppTheme('dark')}>
      <Dialog open aria-label="Библиотека">
        <OfflineLibraryTab
          anime={[
            {
              animeId: 'test',
              title: 'Скачанное аниме',
              coverUrl: '',
              coverFileName: '',
              updatedAt: '',
              episodes: [],
            },
          ]}
        />
      </Dialog>
    </ThemeProvider>,
  );

  const trigger = screen.getByRole('button', { name: 'Удалить всё скачанное' });
  act(() => trigger.focus());
  fireEvent.click(trigger);
  const confirmation = screen.getByRole('dialog', {
    name: 'Подтверждение удаления',
  });
  const outside = confirmation.parentElement!;
  expect(outside).toHaveFocus();
  const close = within(confirmation).getByRole('button', { name: 'Закрыть' });
  act(() => close.focus());
  expect(close).toHaveFocus();
  fireEvent.mouseDown(outside);
  fireEvent.click(outside);
  expect(close).not.toHaveFocus();
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(trigger.closest('[aria-hidden="true"]')).toBeNull();
});

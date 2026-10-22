/**
 * Подписи диалога обновления для каждой стадии и причины сбоя
 */
import type { UpdateFailure } from '../../constants';

export type UpdateStatus =
  | 'idle'
  | 'available'
  | 'downloading'
  | 'installing'
  | 'restarting'
  | 'error';

/** Идёт ли обновление: повторный запуск и закрытие диалога недоступны */
export const isUpdateBusy = (status: UpdateStatus): boolean =>
  status === 'downloading' ||
  status === 'installing' ||
  status === 'restarting';

export interface UpdateCaption {
  text: string;
  hint?: string;
}

/** Подпись под полосой прогресса; null — полосы нет */
export function getUpdateCaption(
  status: UpdateStatus,
  progress: number,
): UpdateCaption | null {
  switch (status) {
    case 'downloading':
      return { text: `Загрузка обновления… ${progress}%` };
    case 'installing':
      return {
        text: 'Установка обновления… Введите пароль в системном окне',
        hint: 'После установки приложение перезапустится',
      };
    case 'restarting':
      return { text: 'Перезапуск…' };
    default:
      return null;
  }
}

/** Сообщение о сбое обновления */
export function getUpdateFailureText(failure: UpdateFailure | null): string {
  switch (failure) {
    case 'install':
      return 'Обновление не установлено. Пакет сохранён в «Загрузки». Нажмите «Повторить» или установите его командой в терминале:';
    case 'readonly':
      return 'Не удалось заменить файл приложения. Новая версия сохранена в «Загрузки» — запустите её оттуда.';
    default:
      return 'Не удалось загрузить обновление. Страница релиза открыта в браузере.';
  }
}

/** Надпись основной кнопки: после неудачной установки — повтор */
export function getUpdateConfirmLabel(failure: UpdateFailure | null): string {
  return failure === 'install' ? 'Повторить' : 'Обновить сейчас';
}

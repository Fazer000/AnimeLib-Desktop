import {
  getUpdateCaption,
  getUpdateConfirmLabel,
  getUpdateFailureText,
  isUpdateBusy,
} from '../renderer/utils/updateStatus';

describe('isUpdateBusy', () => {
  it('занято на загрузке, установке и перезапуске', () => {
    expect(isUpdateBusy('downloading')).toBe(true);
    expect(isUpdateBusy('installing')).toBe(true);
    expect(isUpdateBusy('restarting')).toBe(true);
  });

  it('свободно до начала и после сбоя', () => {
    expect(isUpdateBusy('idle')).toBe(false);
    expect(isUpdateBusy('available')).toBe(false);
    expect(isUpdateBusy('error')).toBe(false);
  });
});

describe('getUpdateCaption', () => {
  it('загрузка показывает проценты', () => {
    expect(getUpdateCaption('downloading', 62)).toEqual({
      text: 'Загрузка обновления… 62%',
    });
  });

  it('установка просит пароль и предупреждает о перезапуске', () => {
    const caption = getUpdateCaption('installing', 100);
    expect(caption?.text).toMatch(/пароль в системном окне/);
    expect(caption?.hint).toMatch(/перезапустится/);
  });

  it('перезапуск и состояния без полосы', () => {
    expect(getUpdateCaption('restarting', 100)?.text).toBe('Перезапуск…');
    expect(getUpdateCaption('available', 0)).toBeNull();
    expect(getUpdateCaption('error', 0)).toBeNull();
  });
});

describe('getUpdateFailureText', () => {
  it('у каждой причины своё сообщение', () => {
    expect(getUpdateFailureText('install')).toMatch(/командой в терминале/);
    expect(getUpdateFailureText('readonly')).toMatch(/«Загрузки»/);
    expect(getUpdateFailureText('download')).toMatch(/Страница релиза/);
    expect(getUpdateFailureText(null)).toMatch(/Страница релиза/);
  });
});

describe('getUpdateConfirmLabel', () => {
  it('после неудачной установки кнопка предлагает повтор', () => {
    expect(getUpdateConfirmLabel('install')).toBe('Повторить');
    expect(getUpdateConfirmLabel(null)).toBe('Обновить сейчас');
  });
});

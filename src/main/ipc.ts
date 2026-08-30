/**
 * Типизированные обёртки над ipcMain: канал задаёт тип нагрузки и ответа.
 */
import { ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import type {
  IpcInvokeChannel,
  IpcRequest,
  IpcResponse,
  IpcSendChannel,
  IpcSendMap,
} from '../shared/ipc';

/** Регистрирует обработчик канала «запрос — ответ». */
export const handleIpc = <C extends IpcInvokeChannel>(
  channel: C,
  handler: (
    event: IpcMainInvokeEvent,
    payload: IpcRequest<C>,
  ) => IpcResponse<C> | Promise<IpcResponse<C>>,
): void => {
  ipcMain.handle(channel, (event, payload) =>
    handler(event, payload as IpcRequest<C>),
  );
};

/** Регистрирует обработчик канала без ответа. */
export const onIpc = <C extends IpcSendChannel>(
  channel: C,
  handler: (event: IpcMainEvent, payload: IpcSendMap[C]) => void,
): void => {
  ipcMain.on(channel, (event, payload) =>
    handler(event, payload as IpcSendMap[C]),
  );
};

/**
 * Связь всплывающих меню и окон с карточкой аниме
 */
import { createContext, useContext } from 'react';

const CardPopupContext = createContext<() => void>(() => {});

export const CardPopupProvider = CardPopupContext.Provider;

/** Возвращает функцию, которую меню или окно вызывает при закрытии */
export function useCardPopupClose(): () => void {
  return useContext(CardPopupContext);
}

/**
 * Связь всплывающих меню и окон с карточкой аниме
 */
import { createContext, useContext } from 'react';

type CardPopupClose = (hideCard?: boolean) => void;

const CardPopupContext = createContext<CardPopupClose>(() => {});

export const CardPopupProvider = CardPopupContext.Provider;

/** Возвращает функцию, которую меню или окно вызывает при закрытии */
export function useCardPopupClose(): CardPopupClose {
  return useContext(CardPopupContext);
}

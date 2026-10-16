import { createContext, useContext, type ReactNode } from 'react';

/**
 * A footer a role's shell wants at the very end of every scrolling screen. It lives in
 * the screen's own scroller, so it only shows once the reader reaches the bottom.
 */
const ScreenFooterContext = createContext<ReactNode>(null);

export const ScreenFooterProvider = ScreenFooterContext.Provider;

export function useScreenFooter(): ReactNode {
  return useContext(ScreenFooterContext);
}

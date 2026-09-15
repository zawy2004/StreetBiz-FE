import { useWindowDimensions } from 'react-native';

const DESKTOP_MIN_WIDTH = 1024;

/** True when the viewport is wide enough for a fixed sidebar layout. */
export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return width >= DESKTOP_MIN_WIDTH;
}

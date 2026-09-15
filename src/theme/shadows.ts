import { Platform } from 'react-native';

/** Level-1 resting card elevation. */
export const cardShadow = Platform.select({
  web: { boxShadow: '0 2px 4px -1px rgba(26,34,56,0.08)' } as object,
  default: {
    shadowColor: '#1A2238',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
});

/** Level-3 modal / sheet elevation. */
export const sheetShadow = Platform.select({
  web: { boxShadow: '0 20px 25px -5px rgba(26,34,56,0.16)' } as object,
  default: {
    shadowColor: '#1A2238',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
});

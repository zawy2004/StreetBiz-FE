import type { IconName } from '@/components/common';
import type { StreetFeatureType, WardSlot } from '../../../ward-config-api';

/** Marker colours on the map; the map, its legend and the register read from this one table. */
export const SLOT_DOT_COLORS: Record<WardSlot['status'], string> = {
  AVAILABLE: '#0B7F43',
  PENDING_APPLICATION: '#C98A04',
  ACTIVE: '#111C2B',
  SUSPENDED: '#566173',
};

export const FEATURE_BLOCK_COLOR = '#B42318';
export const FEATURE_OTHER_COLOR = '#C98A04';

/** A suspended slot carries a white diagonal bar, so it is not told apart by grey alone. */
export const SUSPENDED_BAR =
  'linear-gradient(135deg, transparent 40%, #fff 40%, #fff 60%, transparent 60%)';

const FEATURE_ICONS: Record<StreetFeatureType, IconName> = {
  TRANSFORMER: 'transmission-tower',
  HYDRANT: 'fire-hydrant',
  TREE: 'tree-outline',
  LIGHT_POLE: 'lightbulb-outline',
  BUS_STOP: 'bus-stop',
  PARKING: 'parking',
};

export function featureIcon(type: StreetFeatureType): IconName {
  return FEATURE_ICONS[type];
}

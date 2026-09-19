import type { IconName } from '@/components/common/Icon';
import type { BusinessCategory, StreetFeatureType } from '@/core/api/side-api';
import { colors, tints } from '@/theme';
import type { SlotDisplayState } from './slot-stats';

/**
 * Slot colours for the corridor plan, keyed by what a slot looks like right now
 * (see slotDisplayState), not by its raw status: a held slot is AVAILABLE in the
 * database but must not read as free. The selected slot is indigo, not primary,
 * because primary already means "tạm ngưng".
 *
 * Deliberately not driven by statusLabel().tone (core/constants/status-labels.ts):
 * that maps ACTIVE -> 'ok' -> green, but on a slot plan green must mean
 * "còn trống", not "a contract is in good standing".
 */
export const SLOT_SELECTED_COLOR = colors.indigo;

export const DISPLAY_STATE_LABELS: Record<SlotDisplayState, string> = {
  AVAILABLE: 'Còn trống',
  HELD: 'Đang giữ chỗ',
  PENDING: 'Đang có đơn',
  ACTIVE: 'Đã cho thuê',
  SUSPENDED: 'Tạm ngưng',
};

export function slotDisplayColor(state: SlotDisplayState): string {
  switch (state) {
    case 'AVAILABLE':
      return colors.tertiary;
    case 'HELD':
    case 'PENDING':
      return colors.secondary;
    case 'SUSPENDED':
      return colors.primary;
    case 'ACTIVE':
      return colors.muted;
  }
}

export function slotDisplayTint(state: SlotDisplayState): string {
  switch (state) {
    case 'AVAILABLE':
      return tints.tertiary;
    case 'HELD':
    case 'PENDING':
      return tints.secondary;
    case 'SUSPENDED':
      return tints.primary;
    case 'ACTIVE':
      return tints.muted;
  }
}

export const CATEGORY_ICONS: Record<BusinessCategory, IconName> = {
  FOOD_BEVERAGE: 'silverware-fork-knife',
  RETAIL: 'storefront-outline',
  SERVICES: 'headset',
  CRAFTS: 'shape-outline',
  GENERAL: 'tag-outline',
};

export const FEATURE_ICONS: Record<StreetFeatureType, IconName> = {
  TRANSFORMER: 'transmission-tower',
  HYDRANT: 'fire-hydrant',
  TREE: 'tree-outline',
  LIGHT_POLE: 'lightbulb-outline',
  BUS_STOP: 'bus-stop',
  PARKING: 'parking',
};

export const FEATURE_LABELS: Record<StreetFeatureType, string> = {
  TRANSFORMER: 'Trạm biến áp',
  HYDRANT: 'Họng cứu hỏa',
  TREE: 'Cây xanh',
  LIGHT_POLE: 'Cột đèn',
  BUS_STOP: 'Trạm xe buýt',
  PARKING: 'Bãi giữ xe',
};

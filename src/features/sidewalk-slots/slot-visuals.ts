import { colors, tints } from '@/theme';

/**
 * Status -> color, shared by SlotMapView's pins and StreetStripDiagram's
 * squares so the two views can never disagree about what a color means.
 *
 * Not driven by statusLabel().tone (core/constants/status-labels.ts): that
 * maps ACTIVE -> 'ok' -> green, but on a slot map/diagram green must mean
 * "còn trống", not "a contract is in good standing".
 */
export function slotStatusColor(status: string): string {
  switch (status) {
    case 'AVAILABLE':
      return colors.tertiary;
    case 'PENDING_APPLICATION':
      return colors.secondary;
    case 'SUSPENDED':
      return colors.primary;
    case 'ACTIVE':
    default:
      return colors.muted;
  }
}

/** Matching low-alpha fill for slotStatusColor, for filling a shape instead of stroking it. */
export function slotStatusTint(status: string): string {
  switch (status) {
    case 'AVAILABLE':
      return tints.tertiary;
    case 'PENDING_APPLICATION':
      return tints.secondary;
    case 'SUSPENDED':
      return tints.primary;
    case 'ACTIVE':
    default:
      return tints.muted;
  }
}

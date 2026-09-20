import { describe, expect, it } from 'vitest';

import { getOrderHubUrl } from '@/features/orders/realtime/useOrderRealtime';

describe('order realtime configuration', () => {
  it('derives the SignalR hub URL from the configured API origin', () => {
    expect(getOrderHubUrl('https://localhost:7147/api')).toBe(
      'https://localhost:7147/hubs/orders',
    );
  });

  it('supports a deployed API path without hardcoding localhost', () => {
    expect(getOrderHubUrl('https://streetbiz.example.com/gateway/api/')).toBe(
      'https://streetbiz.example.com/gateway/hubs/orders',
    );
  });
});

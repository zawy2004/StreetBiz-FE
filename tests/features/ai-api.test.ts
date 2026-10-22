import { vi } from 'vitest';

const client = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock('@/core/api/client', () => client);

import { aiApi, wardVendorReportsApi } from '@/core/api/ai-api';

describe('AI API contracts (AIP-01..04, AIB-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.apiGet.mockResolvedValue({});
    client.apiPost.mockResolvedValue({});
  });

  it('sends the dish name and the photo address for a description', async () => {
    await aiApi.dishDescription('Bún chả', '/api/uploads/menu-images/7/a.jpg');
    await aiApi.dishDescription('Bún chả');

    expect(client.apiPost).toHaveBeenNthCalledWith(1, '/ai/dish-description', {
      name: 'Bún chả',
      imageUrl: '/api/uploads/menu-images/7/a.jpg',
    });
    expect(client.apiPost).toHaveBeenNthCalledWith(2, '/ai/dish-description', {
      name: 'Bún chả',
      imageUrl: null,
    });
  });

  it('asks for the recognition of a photo by its upload address, never by its bytes', async () => {
    await aiApi.dishRecognition('/api/uploads/menu-images/7/a.jpg');

    expect(client.apiPost).toHaveBeenCalledWith('/ai/dish-recognition', {
      imageUrl: '/api/uploads/menu-images/7/a.jpg',
    });
  });

  it('sends the typed sentence as text', async () => {
    await aiApi.searchIntent('bún chả dưới 50k');

    expect(client.apiPost).toHaveBeenCalledWith('/ai/search-intent', { text: 'bún chả dưới 50k' });
  });

  it('reads the summary of one storefront', async () => {
    await aiApi.reviewSummary(12);

    expect(client.apiGet).toHaveBeenCalledWith('/ai/storefronts/12/review-summary');
  });

  it('lists the ward reports with the status and page that are set and leaves the rest out', async () => {
    client.apiGet.mockResolvedValue([]);

    await wardVendorReportsApi.list();
    await wardVendorReportsApi.list('PENDING');
    await wardVendorReportsApi.list('REVIEWED', 3);

    expect(client.apiGet).toHaveBeenNthCalledWith(1, '/ward/vendor-reports');
    expect(client.apiGet).toHaveBeenNthCalledWith(2, '/ward/vendor-reports?status=PENDING');
    expect(client.apiGet).toHaveBeenNthCalledWith(3, '/ward/vendor-reports?status=REVIEWED&page=3');
  });

  it('opens one report and asks for its analysis again', async () => {
    await wardVendorReportsApi.get(10);
    await wardVendorReportsApi.assist(10);

    expect(client.apiGet).toHaveBeenCalledWith('/ward/vendor-reports/10');
    expect(client.apiPost).toHaveBeenCalledWith('/ward/vendor-reports/10/assist');
  });
});

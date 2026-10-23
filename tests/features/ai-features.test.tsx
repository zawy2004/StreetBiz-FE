import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  aiApi,
  wardVendorReportsApi,
  type DishRecognition,
  type ReviewSummary,
  type SearchIntent,
  type VendorReportAssist,
  type WardVendorReport,
} from '@/core/api/ai-api';
import { vendorRegistrationApi } from '@/core/api/vendor-registration-api';

vi.mock('@/core/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/env')>();
  return { ...actual, isLiveApi: true };
});

const { DishDescriptionAssist, DishRecognitionAssist } = await import(
  '@/features/storefronts/components/menu/DishAiAssist'
);
const { AiSearchAssist } = await import('@/features/buyer-discovery/components/search/AiSearchAssist');
const { ReviewSummaryCard } = await import(
  '@/features/buyer-discovery/components/storefront/ReviewSummaryCard'
);
const { VendorReportAssistPanel } = await import(
  '@/features/ward-administration/components/review/VendorReportAssistPanel'
);
const { LiveVendorReportReviewScreen } = await import(
  '@/features/ward-administration/screens/LiveVendorReportReviewScreen'
);
const { WardVendorReportsScreen } = await import(
  '@/features/ward-administration/screens/WardVendorReportsScreen'
);

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}</p>;
}

const withClient = (node: ReactNode, path = '/') =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>{node}</MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:evidence'), revokeObjectURL: vi.fn() }),
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AIP-01 dish description assist', () => {
  it('waits for a dish name before offering to suggest', () => {
    withClient(<DishDescriptionAssist name="" imageUrl={null} hasDescription={false} onUse={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Gợi ý mô tả bằng AI' })).toBeDisabled();
    expect(screen.getByText('Nhập tên món để nhận gợi ý.')).toBeInTheDocument();
  });

  it('shows the suggestion and only uses it when the vendor presses the button', async () => {
    const suggest = vi.spyOn(aiApi, 'dishDescription').mockResolvedValue({
      available: true,
      description: 'Bún chả nướng than thơm, ăn kèm rau sống.',
      message: 'Gợi ý do AI tạo, chỉ để tham khảo.',
      aiLogId: 4,
    });
    const onUse = vi.fn();
    const user = userEvent.setup();
    withClient(
      <DishDescriptionAssist name="Bún chả" imageUrl="/api/uploads/menu-images/7/a.jpg" hasDescription={false} onUse={onUse} />,
    );

    await user.click(screen.getByRole('button', { name: 'Gợi ý mô tả bằng AI' }));

    expect(await screen.findByText('Bún chả nướng than thơm, ăn kèm rau sống.')).toBeInTheDocument();
    expect(suggest).toHaveBeenCalledWith('Bún chả', '/api/uploads/menu-images/7/a.jpg');
    expect(onUse).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Dùng mô tả này' }));
    expect(onUse).toHaveBeenCalledWith('Bún chả nướng than thơm, ăn kèm rau sống.');
    expect(screen.queryByText('Bún chả nướng than thơm, ăn kèm rau sống.')).not.toBeInTheDocument();
  });

  it('says it will replace what the vendor already wrote', async () => {
    vi.spyOn(aiApi, 'dishDescription').mockResolvedValue({
      available: true, description: 'Mô tả mới thơm ngon.', message: '', aiLogId: 1,
    });
    const user = userEvent.setup();
    withClient(<DishDescriptionAssist name="Bún chả" imageUrl={null} hasDescription onUse={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Gợi ý mô tả bằng AI' }));

    expect(await screen.findByRole('button', { name: 'Thay mô tả hiện tại' })).toBeInTheDocument();
  });

  it('explains a switched-off feature without alarming the vendor', async () => {
    vi.spyOn(aiApi, 'dishDescription').mockResolvedValue({
      available: false, description: null, message: 'Tính năng gợi ý bằng AI đang tắt. Bạn vẫn có thể tự nhập.', aiLogId: null,
    });
    const user = userEvent.setup();
    withClient(<DishDescriptionAssist name="Bún chả" imageUrl={null} hasDescription={false} onUse={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Gợi ý mô tả bằng AI' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Bạn vẫn có thể tự nhập.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the form usable when the request fails', async () => {
    vi.spyOn(aiApi, 'dishDescription').mockRejectedValue(new Error('Hết thời gian chờ'));
    const user = userEvent.setup();
    withClient(<DishDescriptionAssist name="Bún chả" imageUrl={null} hasDescription={false} onUse={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Gợi ý mô tả bằng AI' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Bạn vẫn có thể tự viết mô tả.');
  });
});

describe('AIP-02 dish recognition assist', () => {
  const recognition = (patch: Partial<DishRecognition> = {}): DishRecognition => ({
    available: true,
    recognized: true,
    dishName: 'Bún chả',
    categoryId: 3,
    categoryName: 'Bún',
    confidence: 88,
    referencePrice: { dishCount: 5, lowest: 30000, median: 40000, highest: 55000 },
    message: '',
    aiLogId: 2,
    ...patch,
  });

  it('needs the photo to be uploaded first', () => {
    withClient(
      <DishRecognitionAssist imageUrl={null} onUseName={vi.fn()} onUseCategory={vi.fn()} onUsePrice={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Nhận diện món từ ảnh' })).toBeDisabled();
    expect(screen.getByText('Chọn ảnh món trước để dùng gợi ý này.')).toBeInTheDocument();
  });

  it('offers each part separately and applies only the one the vendor picks', async () => {
    const recognize = vi.spyOn(aiApi, 'dishRecognition').mockResolvedValue(recognition());
    const onUseName = vi.fn();
    const onUseCategory = vi.fn();
    const onUsePrice = vi.fn();
    const user = userEvent.setup();
    withClient(
      <DishRecognitionAssist
        imageUrl="/api/uploads/menu-images/7/a.jpg"
        onUseName={onUseName}
        onUseCategory={onUseCategory}
        onUsePrice={onUsePrice}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Nhận diện món từ ảnh' }));

    expect(await screen.findByText(/độ chắc 88%/)).toBeInTheDocument();
    expect(recognize).toHaveBeenCalledWith('/api/uploads/menu-images/7/a.jpg');
    expect(onUseName).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Dùng giá này' }));
    expect(onUsePrice).toHaveBeenCalledWith(40000);
    expect(onUseName).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Dùng danh mục' }));
    expect(onUseCategory).toHaveBeenCalledWith(3);
    await user.click(screen.getByRole('button', { name: 'Dùng tên' }));
    expect(onUseName).toHaveBeenCalledWith('Bún chả');
  });

  it('says there is too little data for a price instead of inventing one', async () => {
    vi.spyOn(aiApi, 'dishRecognition').mockResolvedValue(recognition({ referencePrice: null }));
    const user = userEvent.setup();
    withClient(
      <DishRecognitionAssist imageUrl="/api/uploads/menu-images/7/a.jpg" onUseName={vi.fn()} onUseCategory={vi.fn()} onUsePrice={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: 'Nhận diện món từ ảnh' }));

    expect(await screen.findByText('Chưa đủ món cùng danh mục để gợi ý giá.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dùng giá này' })).not.toBeInTheDocument();
  });

  it('tells the vendor when the photo is not food', async () => {
    vi.spyOn(aiApi, 'dishRecognition').mockResolvedValue(
      recognition({ recognized: false, dishName: null, categoryId: null, referencePrice: null, message: 'Ảnh này có vẻ không phải món ăn.' }),
    );
    const user = userEvent.setup();
    withClient(
      <DishRecognitionAssist imageUrl="/api/uploads/menu-images/7/a.jpg" onUseName={vi.fn()} onUseCategory={vi.fn()} onUsePrice={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: 'Nhận diện món từ ảnh' }));

    expect(await screen.findByText('Ảnh này có vẻ không phải món ăn.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dùng tên' })).not.toBeInTheDocument();
  });
});

/** The search screen puts the keywords back in its box when a reading is applied; this stands in for it. */
function Controlled({
  initial,
  hasPosition,
  onApply,
}: {
  initial: string;
  hasPosition: boolean;
  onApply: (application: { text: string }) => void;
}) {
  const [query, setQuery] = useState(initial);
  return (
    <AiSearchAssist
      query={query}
      hasPosition={hasPosition}
      onApply={(application) => {
        onApply(application);
        setQuery(application.text);
      }}
    />
  );
}

describe('AIP-03 natural-language search assist', () => {
  const reading = (patch: Partial<SearchIntent> = {}): SearchIntent => ({
    available: true,
    source: 'AI',
    query: 'bún chả',
    categoryId: null,
    categoryName: null,
    minPrice: null,
    maxPrice: 50000,
    openNow: null,
    minRating: null,
    nearMe: false,
    radiusMeters: null,
    sort: null,
    explanation: 'Bún chả dưới 50.000đ.',
    ...patch,
  });

  it('stays out of the way for a single word', () => {
    withClient(<AiSearchAssist query="bún" hasPosition={false} onApply={vi.fn()} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('reads a sentence, hands the filters to the screen and says what it understood', async () => {
    const read = vi.spyOn(aiApi, 'searchIntent').mockResolvedValue(reading());
    const onApply = vi.fn();
    const user = userEvent.setup();
    withClient(<Controlled initial="bún chả dưới 50k" hasPosition={false} onApply={onApply} />);

    await user.click(screen.getByRole('button', { name: /Hiểu câu này giúp tôi/ }));

    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    expect(read).toHaveBeenCalledWith('bún chả dưới 50k');
    expect(onApply.mock.calls[0]![0]).toMatchObject({ text: 'bún chả', filters: { maxPrice: 50000 } });
    expect(await screen.findByText('Bún chả dưới 50.000đ.')).toBeInTheDocument();
    expect(screen.getByText('Gợi ý AI:')).toBeInTheDocument();
  });

  it('labels the keyword rules as such when the model did not answer', async () => {
    vi.spyOn(aiApi, 'searchIntent').mockResolvedValue(reading({ source: 'RULES' }));
    const user = userEvent.setup();
    withClient(<Controlled initial="bún chả dưới 50k" hasPosition={false} onApply={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Hiểu câu này giúp tôi/ }));

    expect(await screen.findByText('Hiểu theo từ khoá:')).toBeInTheDocument();
  });

  it('asks for the position when the sentence says "near me" and none is known', async () => {
    vi.spyOn(aiApi, 'searchIntent').mockResolvedValue(reading({ nearMe: true, radiusMeters: 1000 }));
    const user = userEvent.setup();
    withClient(<Controlled initial="bún chả gần đây" hasPosition={false} onApply={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Hiểu câu này giúp tôi/ }));

    expect(await screen.findByText('Bật vị trí của bạn để lọc theo khoảng cách.')).toBeInTheDocument();
  });

  it('leaves the search as typed when the request fails', async () => {
    vi.spyOn(aiApi, 'searchIntent').mockRejectedValue(new Error('Quá nhiều yêu cầu'));
    const onApply = vi.fn();
    const user = userEvent.setup();
    withClient(<AiSearchAssist query="bún chả dưới 50k" hasPosition={false} onApply={onApply} />);

    await user.click(screen.getByRole('button', { name: /Hiểu câu này giúp tôi/ }));

    expect(await screen.findByRole('status')).toHaveTextContent('Tìm kiếm vẫn chạy theo chữ bạn gõ.');
    expect(onApply).not.toHaveBeenCalled();
  });
});

describe('AIP-04 review summary card', () => {
  const summary = (patch: Partial<ReviewSummary> = {}): ReviewSummary => ({
    available: true,
    reason: null,
    reviewCount: 12,
    requiredCount: 5,
    summary: 'Khách khen nước chấm đậm đà nhưng giờ cao điểm phải chờ lâu.',
    positives: ['Nước chấm ngon'],
    negatives: ['Chờ lâu'],
    generatedAt: '2026-10-20T03:00:00Z',
    disclaimer: 'Gợi ý do AI tạo, chỉ để tham khảo.',
    ...patch,
  });

  it('shows the summary with what is praised, what is not and where it came from', async () => {
    vi.spyOn(aiApi, 'reviewSummary').mockResolvedValue(summary());
    withClient(<ReviewSummaryCard storefrontId={4} />);

    expect(await screen.findByRole('heading', { name: 'Khách nói gì về quán' })).toBeInTheDocument();
    expect(screen.getByText(/nước chấm đậm đà/)).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Điểm được khen' })).getByText('Nước chấm ngon')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Điểm cần cải thiện' })).getByText('Chờ lâu')).toBeInTheDocument();
    expect(screen.getByText(/AI tóm tắt từ 12 đánh giá/)).toBeInTheDocument();
  });

  it.each(['NOT_ENOUGH_REVIEWS', 'UNAVAILABLE', 'DISABLED'] as const)(
    'takes no room when there is no summary (%s)',
    async (reason) => {
      const spy = vi.spyOn(aiApi, 'reviewSummary').mockResolvedValue(
        summary({ available: false, reason, summary: null, positives: [], negatives: [] }),
      );
      const { container } = withClient(<ReviewSummaryCard storefrontId={4} />);

      await waitFor(() => expect(spy).toHaveBeenCalled());
      await waitFor(() => expect(container).toBeEmptyDOMElement());
    },
  );

  it('shows nothing, not an error, when the request fails', async () => {
    const spy = vi.spyOn(aiApi, 'reviewSummary').mockRejectedValue(new Error('boom'));
    const { container } = withClient(<ReviewSummaryCard storefrontId={4} />);

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

const assist = (patch: Partial<VendorReportAssist> = {}): VendorReportAssist => ({
  aiAvailable: true,
  signageText: 'Bún chả Cô Lan',
  locationText: 'Số 12 Hàng Bài',
  permitVisible: 'NO',
  description: 'Quầy bún chả, bàn ghế lấn vỉa hè.',
  flags: ['NO_PERMIT_VISIBLE_IN_PHOTO', 'PERMIT_NOT_VALID'],
  permitCheck: { permitId: 55, permitStatus: 'SUSPENDED', contractStatus: 'ACTIVE', slotCode: 'A-01', validNow: false, slotMatchesReport: true },
  generatedAt: '2026-10-20T03:00:00Z',
  aiLogId: 9,
  disclaimer: 'Gợi ý của hệ thống chỉ để tham khảo. Cán bộ quyết định xử lý phản ánh.',
  ...patch,
});

const report = (patch: Partial<WardVendorReport> = {}): WardVendorReport => ({
  reportId: 10,
  reason: 'Bán lấn ra vỉa hè, không thấy giấy phép',
  evidenceUrl: '/api/uploads/evidence/8/0123456789abcdef0123456789abcdef.jpg',
  status: 'PENDING',
  createdAt: '2026-10-20T01:00:00Z',
  vendorName: 'Bún chả Cô Lan',
  slotCode: 'A-01',
  aiExtractedLocation: 'Số 12 Hàng Bài',
  assist: assist(),
  ...patch,
});

describe('AIB-01 report assist panel', () => {
  it('lays the flags, the permit check and the photo reading beside the report', () => {
    withClient(<VendorReportAssistPanel assist={assist()} hasPhoto running={false} error={null} onRun={vi.fn()} />);

    const flags = screen.getByRole('list', { name: 'Điểm cần lưu ý' });
    expect(within(flags).getByText('Không thấy giấy phép trong ảnh')).toBeInTheDocument();
    expect(within(flags).getByText('Giấy phép đã quét không còn hiệu lực')).toBeInTheDocument();
    expect(screen.getByText('Giấy phép #55 (ô A-01) không còn hiệu lực.')).toBeInTheDocument();
    expect(screen.getByText('Bún chả Cô Lan')).toBeInTheDocument();
    expect(screen.getByText('Không thấy giấy phép / mã QR trong ảnh')).toBeInTheDocument();
    expect(screen.getByText(/Cán bộ quyết định xử lý phản ánh/)).toBeInTheDocument();
  });

  it('has no accept, reject or close control: the notes are advice only', () => {
    withClient(<VendorReportAssistPanel assist={assist()} hasPhoto running={false} error={null} onRun={vi.fn()} />);

    const labels = screen.getAllByRole('button').map((b) => b.textContent);
    expect(labels).toEqual(['Đọc lại ảnh']);
  });

  it('offers to analyse a photo that has not been read and runs it on request', async () => {
    const onRun = vi.fn();
    const user = userEvent.setup();
    withClient(
      <VendorReportAssistPanel
        assist={assist({ aiAvailable: false, signageText: null, locationText: null, permitVisible: null, description: null, flags: [], permitCheck: null })}
        hasPhoto
        running={false}
        error={null}
        onRun={onRun}
      />,
    );

    expect(screen.getByText('Phản ánh này không kèm mã QR giấy phép nào đã quét.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Phân tích ảnh bằng AI' }));
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('says there is nothing to read when the report has no photo', () => {
    withClient(
      <VendorReportAssistPanel
        assist={assist({ aiAvailable: false, flags: ['NO_PHOTO'], permitCheck: null })}
        hasPhoto={false}
        running={false}
        error={null}
        onRun={vi.fn()}
      />,
    );

    expect(screen.getByText('Phản ánh không có ảnh nên chưa có gì để đọc.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('AIB-01 ward screens', () => {
  const mountDetail = () =>
    withClient(
      <Routes>
        <Route path="/ward/inbox/vendor-reports/:id" element={<LiveVendorReportReviewScreen />} />
        <Route path="*" element={<Where />} />
      </Routes>,
      '/ward/inbox/vendor-reports/10',
    );

  it('opens a report with its notes and shows the photo fetched through the evidence endpoint', async () => {
    vi.spyOn(wardVendorReportsApi, 'get').mockResolvedValue(report());
    const download = vi
      .spyOn(vendorRegistrationApi, 'downloadEvidenceFile')
      .mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }));
    mountDetail();

    expect(await screen.findByText('Bán lấn ra vỉa hè, không thấy giấy phép')).toBeInTheDocument();
    expect(screen.getByText('Giấy phép đã quét không còn hiệu lực')).toBeInTheDocument();
    await waitFor(() => expect(download).toHaveBeenCalledWith('/api/uploads/evidence/8/0123456789abcdef0123456789abcdef.jpg'));
    expect(await screen.findByRole('img')).toHaveAttribute('src', 'blob:evidence');
    expect(screen.getByText('Nơi nhận ra từ ảnh (gợi ý)')).toBeInTheDocument();
  });

  it('refreshes the notes when the officer asks for the photo to be read again', async () => {
    vi.spyOn(wardVendorReportsApi, 'get').mockResolvedValue(report());
    vi.spyOn(vendorRegistrationApi, 'downloadEvidenceFile').mockResolvedValue(new Blob(['x']));
    const run = vi
      .spyOn(wardVendorReportsApi, 'assist')
      .mockResolvedValue(report({ assist: assist({ signageText: 'Quán Cô Lan mới' }) }));
    const user = userEvent.setup();
    mountDetail();

    await user.click(await screen.findByRole('button', { name: 'Đọc lại ảnh' }));

    expect(run).toHaveBeenCalledWith(10);
    expect(await screen.findByText('Quán Cô Lan mới')).toBeInTheDocument();
  });

  it('shows a report without a photo and offers no analysis button', async () => {
    vi.spyOn(wardVendorReportsApi, 'get').mockResolvedValue(
      report({ evidenceUrl: null, assist: assist({ aiAvailable: false, flags: ['NO_PHOTO'], permitCheck: null }) }),
    );
    const download = vi.spyOn(vendorRegistrationApi, 'downloadEvidenceFile');
    mountDetail();

    expect(await screen.findByText('Phản ánh không kèm ảnh')).toBeInTheDocument();
    expect(download).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /ảnh/ })).not.toBeInTheDocument();
  });

  it('says so when the report is not in the officer\'s ward (not found)', async () => {
    vi.spyOn(wardVendorReportsApi, 'get').mockRejectedValue(new Error('Không tìm thấy phản ánh trong phường của bạn.'));
    mountDetail();

    expect(await screen.findByText('Không tìm thấy phản ánh trong phường của bạn.')).toBeInTheDocument();
  });

  it('lists the ward reports by status and opens one', async () => {
    const list = vi.spyOn(wardVendorReportsApi, 'list').mockResolvedValue([
      { reportId: 10, reason: 'Bán lấn ra vỉa hè', status: 'PENDING', createdAt: '2026-10-20T01:00:00Z', vendorName: 'Bún chả Cô Lan', slotCode: 'A-01', hasPhoto: true },
    ]);
    const user = userEvent.setup();
    withClient(
      <Routes>
        <Route path="/ward/inbox/vendor-reports" element={<WardVendorReportsScreen />} />
        <Route path="*" element={<Where />} />
      </Routes>,
      '/ward/inbox/vendor-reports',
    );

    await user.click(await screen.findByRole('button', { name: /Bún chả Cô Lan/ }));

    expect(list).toHaveBeenCalledWith('PENDING');
    expect(screen.getByTestId('where')).toHaveTextContent('/ward/inbox/vendor-reports/10');
  });

  it('switches the list to another status', async () => {
    const list = vi.spyOn(wardVendorReportsApi, 'list').mockResolvedValue([]);
    const user = userEvent.setup();
    withClient(<WardVendorReportsScreen />, '/ward/inbox/vendor-reports');

    expect(await screen.findByText('Không có phản ánh nào')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Đã xem xét' }));

    await waitFor(() => expect(list).toHaveBeenCalledWith('REVIEWED'));
  });
});

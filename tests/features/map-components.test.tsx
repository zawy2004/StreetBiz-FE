import { createContext, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SidewalkSlot } from '@/core/api/side-api';
import type { WardSlot, WardStreetFeature } from '@/features/ward-administration/ward-config-api';
import { makeSlot } from './slot-fixtures';

/**
 * The map library draws with WebGL, which jsdom has not got. These stand-ins render their
 * children and remember the props they were given, so a test can play the map's part: a click on
 * the map or on a raised slot, a drag of a marker, a viewport change, a tile error.
 */
type Props = Record<string, unknown>;
const map = vi.hoisted(() => ({
  last: {} as Record<string, unknown>,
  markers: [] as Record<string, unknown>[],
  layers: [] as Record<string, unknown>[],
}));
vi.mock('@goongmaps/goong-map-react', () => {
  const MapGL = (props: Props & { children?: ReactNode }) => {
    map.last = props;
    return <div data-testid="map">{props.children}</div>;
  };
  const Marker = (props: Props & { children?: ReactNode }) => {
    map.markers.push(props);
    return <>{props.children}</>;
  };
  const Layer = (props: Props) => {
    map.layers.push(props);
    return null;
  };
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
  return {
    default: MapGL,
    Marker,
    Layer,
    Source: Pass,
    Popup: Pass,
    NavigationControl: () => null,
    LinearInterpolator: class {},
    _MapContext: createContext({}),
  };
});

const { SlotGridMap } = await import('@/features/ward-administration/components/SlotGridMap');
const { SlotMapView } = await import('@/features/sidewalk-slots/components/SlotMapView');
const { LocationPicker } = await import('@/features/sidewalk-slots/components/LocationPicker');

beforeEach(() => {
  map.last = {};
  map.markers = [];
  map.layers = [];
});
afterEach(cleanup);

const call = (name: string, ...args: unknown[]) =>
  act(() => (map.last[name] as (...a: unknown[]) => void)(...args));

const wardSlot = (over: Partial<WardSlot>): WardSlot => ({
  slotId: 1,
  slotCode: 'NVL-01',
  zoneId: 1,
  zoneName: 'Nguyễn Văn Linh',
  latitude: 16.0609,
  longitude: 108.2177,
  widthMeters: 1.5,
  lengthMeters: 2,
  status: 'AVAILABLE',
  source: 'WARD_DEFINED',
  hasPower: false,
  hasWater: false,
  hasTrashBin: false,
  businessCategory: null,
  canHardDelete: true,
  canEditGeometry: true,
  versionToken: 'v1',
  imageUrls: [],
  bearingDegrees: null,
  ...over,
});

const feature: WardStreetFeature = {
  featureId: 1,
  zoneId: 1,
  featureType: 'HYDRANT',
  label: 'Trụ nước',
  latitude: 16.06095,
  longitude: 108.2178,
  blocksBusiness: true,
  note: null,
  clearanceMeters: 3,
  versionToken: 'f1',
};

const SLOTS = [
  wardSlot({ slotId: 1, slotCode: 'NVL-01' }),
  wardSlot({
    slotId: 2,
    slotCode: 'NVL-02',
    longitude: 108.21785,
    status: 'ACTIVE',
    canEditGeometry: false,
  }),
  wardSlot({ slotId: 3, slotCode: 'NVL-03', longitude: 108.218, status: 'SUSPENDED' }),
];

function renderGrid(over: Partial<Parameters<typeof SlotGridMap>[0]> = {}) {
  const handlers = {
    onMapClick: vi.fn(),
    onSelectSlot: vi.fn(),
    onMoveSlot: vi.fn(),
    onTurnSlot: vi.fn(),
  };
  const utils = render(
    <SlotGridMap
      slots={SLOTS}
      features={[feature]}
      selectedSlotId={null}
      pins={[]}
      candidates={[]}
      streetBearings={new Map([[1, 90]])}
      {...handlers}
      {...over}
    />,
  );
  return { ...utils, ...handlers };
}

describe('ward slot grid map', () => {
  it('draws a dot per slot and feature, and a tap on a dot selects that slot', () => {
    const { onSelectSlot } = renderGrid();

    expect(
      screen.getByRole('img', { name: 'Trụ nước chữa cháy: Trụ nước · cấm kinh doanh' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'NVL-02 · Đang cho thuê' }));
    expect(onSelectSlot).toHaveBeenCalledWith(SLOTS[1]);
    fireEvent.keyDown(screen.getByRole('button', { name: 'NVL-01 · Trống' }), { key: 'Enter' });
    expect(onSelectSlot).toHaveBeenCalledWith(SLOTS[0]);
  });

  it('turns a tap on the map into a rounded point, and a tap on a raised slot into a selection', () => {
    const { onMapClick, onSelectSlot } = renderGrid();

    call('onClick', { lngLat: [108.21771234567, 16.06091234567] });
    expect(onMapClick).toHaveBeenCalledWith({ latitude: 16.060912, longitude: 108.217712 });

    call('onClick', { lngLat: [108.2, 16.0], features: [{ properties: { slotId: 3 } }] });
    expect(onSelectSlot).toHaveBeenCalledWith(SLOTS[2]);
  });

  it('tilts into 3D and back, with the street across the screen and taps read from the blocks', () => {
    renderGrid();
    const rail = screen.getByRole('toolbar', { name: 'Công cụ bản đồ' });
    const threeD = within(rail).getByRole('button', { name: 'Xem 3D: dựng ô và nhà thành khối' });

    fireEvent.click(threeD);
    expect(within(rail).getByRole('button', { name: 'Về bản đồ phẳng (2D)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(map.last.pitch).toBe(60);
    // Street bearing 90: the camera faces at right angles to it.
    expect(map.last.bearing).toBe(180);
    expect(map.last.interactiveLayerIds).toEqual(['scene-slot-blocks', 'scene-slot-pins']);
    expect(typeof map.last.mapStyle).toBe('object');
    expect(within(rail).getByRole('button', { name: 'Bay dọc phố' })).toBeEnabled();

    fireEvent.click(within(rail).getByRole('button', { name: 'Về bản đồ phẳng (2D)' }));
    expect(map.last.pitch).toBe(0);
    expect(map.last.interactiveLayerIds).toBeUndefined();
  });

  it('switches to satellite, turns the heat on and zooms within the limits', () => {
    renderGrid();
    const rail = screen.getByRole('toolbar', { name: 'Công cụ bản đồ' });
    const zoom = map.last.zoom as number;

    fireEvent.click(within(rail).getByRole('button', { name: 'Xem ảnh vệ tinh' }));
    expect(within(rail).getByRole('button', { name: 'Về bản đồ đường phố' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(
      within(rail).getByRole('button', { name: 'Bản đồ nhiệt: chỗ đỏ là nhiều ô đang được thuê' }),
    );
    expect(within(rail).getByRole('button', { name: 'Tắt bản đồ nhiệt' })).toBeInTheDocument();
    expect(map.layers.some((l) => l.id === 'scene-heat-layer')).toBe(true);

    fireEvent.click(within(rail).getByRole('button', { name: 'Phóng to' }));
    expect(map.last.zoom).toBe(zoom + 1);
    fireEvent.click(within(rail).getByRole('button', { name: 'Thu nhỏ' }));
    fireEvent.click(within(rail).getByRole('button', { name: 'Thu nhỏ' }));
    expect(map.last.zoom).toBe(zoom - 1);
  });

  it('follows the map when the user pans it', () => {
    renderGrid();
    call('onViewportChange', { latitude: 16.1, longitude: 108.3, zoom: 17, pitch: 10, bearing: 5 });
    expect(map.last).toMatchObject({
      latitude: 16.1,
      longitude: 108.3,
      zoom: 17,
      pitch: 10,
      bearing: 5,
    });
  });

  it('lets the selected free slot be dragged and turned with its handle', () => {
    const { onMoveSlot, onTurnSlot } = renderGrid({ selectedSlotId: 1 });

    const slotMarker = map.markers.find(
      (m) => typeof m.onDragEnd === 'function' && m.draggable === true && !m.onDrag,
    );
    expect(slotMarker).toBeDefined();
    act(() => (slotMarker!.onDragEnd as (e: unknown) => void)({ lngLat: [108.2179, 16.061] }));
    expect(onMoveSlot).toHaveBeenCalledWith(SLOTS[0], { latitude: 16.061, longitude: 108.2179 });

    expect(
      screen.getByRole('img', { name: 'Tay cầm xoay ô: kéo vòng quanh ô để đổi hướng' }),
    ).toBeInTheDocument();
    const handle = map.markers.find((m) => typeof m.onDrag === 'function')!;
    // Dragged due north of the slot: bearing 0.
    act(() => (handle.onDrag as (e: unknown) => void)({ lngLat: [108.2177, 16.0612] }));
    expect(onTurnSlot).toHaveBeenLastCalledWith(SLOTS[0], 0);
    // Close to the street's 90 degrees: snapped onto it.
    act(() => (handle.onDragEnd as (e: unknown) => void)({ lngLat: [108.218, 16.06091] }));
    expect(onTurnSlot).toHaveBeenLastCalledWith(SLOTS[0], 90);
  });

  it('gives a rented slot no drag and no handle', () => {
    renderGrid({ selectedSlotId: 2 });
    expect(screen.queryByRole('img', { name: /Tay cầm xoay ô/ })).not.toBeInTheDocument();
    expect(map.markers.some((m) => m.draggable === true)).toBe(false);
  });

  it('draws pins, batch candidates, the GPS fix and the batch ruler', () => {
    renderGrid({
      pins: [
        { latitude: 16.0609, longitude: 108.2177 },
        { latitude: 16.0609, longitude: 108.2187 },
      ],
      candidates: [
        { index: 0, proposedCode: 'NVL-21', latitude: 16.0609, longitude: 108.218, issues: [] },
        {
          index: 1,
          proposedCode: 'NVL-22',
          latitude: 16.0609,
          longitude: 108.2182,
          issues: [
            {
              severity: 'BLOCK',
              code: 'x',
              message: 'm',
              featureId: null,
              slotId: null,
              distanceMeters: null,
            },
          ],
        },
      ] as never,
      myLocation: { latitude: 16.06, longitude: 108.21, accuracy: 30 },
      ruler: { meters: 105, slots: 7, tooShort: false },
    });

    expect(screen.getByRole('img', { name: 'NVL-21' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'NVL-22' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Vị trí của bạn' })).toBeInTheDocument();
    expect(map.layers.some((l) => l.id === 'ward-gps-accuracy-fill')).toBe(true);
    expect(map.layers.some((l) => l.id === 'ward-clearance-fill')).toBe(true);
  });

  it('says the base tiles failed only for a tile error, and the notice can be closed', async () => {
    renderGrid();
    call('onError', { error: new Error('style') });
    await act(async () => new Promise((r) => setTimeout(r, 5)));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    call('onError', { tile: {} });
    expect(await screen.findByRole('status')).toHaveTextContent('Không tải được nền bản đồ');
    fireEvent.click(screen.getByRole('button', { name: 'Ẩn thông báo nền bản đồ' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('moves the camera when a new focus arrives', () => {
    const { rerender } = renderGrid();
    rerender(
      <SlotGridMap
        slots={SLOTS}
        features={[]}
        selectedSlotId={null}
        pins={[]}
        candidates={[]}
        focus={{ point: { latitude: 16.07, longitude: 108.23 }, key: 1 }}
        onMapClick={vi.fn()}
        onSelectSlot={vi.fn()}
      />,
    );
    expect(map.last).toMatchObject({ latitude: 16.07, longitude: 108.23 });
  });
});

describe('vendor slot map (route view)', () => {
  const slots: SidewalkSlot[] = [
    makeSlot({
      slotId: 1,
      slotCode: 'A-01',
      latitude: 16.06,
      longitude: 108.21,
      zoneId: 1,
      zoneName: 'Nguyễn Văn Linh',
    }),
    makeSlot({
      slotId: 2,
      slotCode: 'A-02',
      latitude: 16.0602,
      longitude: 108.2102,
      zoneId: 1,
      zoneName: 'Nguyễn Văn Linh',
      slotStatus: 'ACTIVE',
    }),
  ];

  it('groups slots into a route sign; opening it offers the route diagram', () => {
    const onViewZoneDiagram = vi.fn();
    render(
      <SlotMapView
        slots={slots}
        onBoundsChange={vi.fn()}
        error={null}
        onRetry={vi.fn()}
        onViewZoneDiagram={onViewZoneDiagram}
        focus={{ latitude: 16.0601, longitude: 108.2101, key: 1 }}
      />,
    );

    expect(map.last).toMatchObject({ latitude: 16.0601, longitude: 108.2101 });
    fireEvent.click(screen.getByRole('button', { name: 'Nguyễn Văn Linh: 2 ô' }));
    expect(screen.getByText('2 ô · 1 còn trống')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xem sơ đồ' }));
    expect(onViewZoneDiagram).toHaveBeenCalledWith(1);
  });

  it('asks to pan when there is no route around, shows an error with retry, and zooms', () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <SlotMapView
        slots={[]}
        onBoundsChange={vi.fn()}
        error={null}
        onRetry={onRetry}
        onViewZoneDiagram={vi.fn()}
        empty
      />,
    );
    expect(screen.getByText('Kéo bản đồ tới khu vực có ô vỉa hè')).toBeInTheDocument();
    const zoom = map.last.zoom as number;
    fireEvent.click(screen.getByRole('button', { name: 'Phóng to' }));
    expect(map.last.zoom).toBe(zoom + 1);
    call('onViewportChange', { latitude: 16.2, longitude: 108.3, zoom: 14 });
    expect(map.last).toMatchObject({ latitude: 16.2, zoom: 14 });

    rerender(
      <SlotMapView
        slots={[]}
        onBoundsChange={vi.fn()}
        error={new Error('Mất mạng')}
        onRetry={onRetry}
        onViewZoneDiagram={vi.fn()}
      />,
    );
    expect(screen.getByText('Mất mạng')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('location picker', () => {
  it('places the pin where the map is tapped, rounded to 6 decimals, and zooms', () => {
    const onPick = vi.fn();
    render(<LocationPicker position={null} viewKey={0} onPick={onPick} />);

    call('onClick', { lngLat: [108.21234567, 16.06123456] });
    expect(onPick).toHaveBeenCalledWith({ latitude: 16.061235, longitude: 108.212346 });
    expect(map.last.zoom).toBe(16);
    fireEvent.click(screen.getByRole('button', { name: 'Thu nhỏ' }));
    expect(map.last.zoom).toBe(15);
    fireEvent.click(screen.getByRole('button', { name: 'Xem ảnh vệ tinh' }));
    expect(screen.getByRole('button', { name: 'Về bản đồ đường phố' })).toBeInTheDocument();
  });

  it('opens close on a known position and re-centres on a new view key', () => {
    const { rerender } = render(
      <LocationPicker
        position={{ latitude: 16.05, longitude: 108.2 }}
        viewKey={1}
        onPick={vi.fn()}
      />,
    );
    expect(map.last).toMatchObject({ latitude: 16.05, longitude: 108.2, zoom: 18 });
    call('onViewportChange', { latitude: 1, longitude: 2, zoom: 3 });
    rerender(
      <LocationPicker
        position={{ latitude: 16.07, longitude: 108.22 }}
        viewKey={2}
        onPick={vi.fn()}
      />,
    );
    expect(map.last).toMatchObject({ latitude: 16.07, longitude: 108.22, zoom: 18 });
  });
});

describe('vendor 3D slot preview', () => {
  it('draws the slot among its route neighbours, swings until touched, and zooms', async () => {
    const side = await import('@/core/api/side-api');
    vi.spyOn(side.sideApi, 'searchSlots').mockResolvedValue([
      makeSlot({ slotId: 1, slotCode: 'A-01', latitude: 16.06, longitude: 108.21, zoneId: 1 }),
      makeSlot({
        slotId: 2,
        slotCode: 'A-02',
        latitude: 16.06,
        longitude: 108.2103,
        zoneId: 1,
        slotStatus: 'ACTIVE',
      }),
    ]);
    const { Slot3DPreview } = await import('@/features/sidewalk-slots/components/Slot3DPreview');
    const slot = makeSlot({
      slotId: 1,
      slotCode: 'A-01',
      latitude: 16.06,
      longitude: 108.21,
      zoneId: 1,
    });

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <Slot3DPreview slot={slot} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(map.layers.some((l) => l.id === 'scene-slot-blocks')).toBe(true));
    expect(screen.getByText('A-01')).toBeInTheDocument();
    expect(map.last.pitch).toBe(60);

    const swing = screen.getByRole('button', { name: /camera/ });
    fireEvent.click(swing);
    expect(screen.getByRole('button', { name: /camera/ })).toBeInTheDocument();
    const zoom = map.last.zoom as number;
    fireEvent.click(screen.getByRole('button', { name: 'Phóng to' }));
    await waitFor(() => expect(map.last.zoom).toBe(zoom + 1));
    call('onViewportChange', {
      latitude: 16.06,
      longitude: 108.21,
      zoom: 18,
      pitch: 40,
      bearing: 20,
    });
    expect(map.last.pitch).toBe(40);
  });
});

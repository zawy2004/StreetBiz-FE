import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from 'react';
import { m } from 'motion/react';
import {
  PiArrowRight,
  PiArrowUpRight,
  PiForkKnife,
  PiMapPin,
  PiMapTrifold,
  PiStarFill,
  PiStorefront,
  PiX,
} from 'react-icons/pi';
import { storefrontPhotos } from '@/features/buyer-discovery/food-photos';
import { distanceLabel, distanceMeters, requestLocation } from './assistant-ux';
import type { AssistantAction, AssistantCard, AssistantLocation } from './types';

const AssistantMiniMap = lazy(() => import('./AssistantMiniMap'));

export type VendorResult = { card: AssistantCard; route: string; dishes: string[] };
type Sort = 'relevance' | 'open' | 'near' | 'price';
const value = (card: AssistantCard, label: string) =>
  card.fields.find((field) => field.label === label && field.value !== 'Chưa ghi nhận')?.value;
const publicImage = (url?: string | null) =>
  Boolean(url && /^\/api\/uploads\/menu-images\/[1-9][0-9]*\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(url));
const directions = (card: AssistantCard) =>
  card.place
    ? `https://www.google.com/maps/dir/?api=1&destination=${card.place.latitude},${card.place.longitude}`
    : undefined;

function VendorPhoto({ result }: { result: VendorResult }) {
  const { card } = result;
  const [failed, setFailed] = useState(0);
  // Display-only stock fallback, never evidence that this vendor sells a dish.
  const photos = storefrontPhotos({
    storefrontId: Number(result.route.split('/').at(-1)),
    storefrontName: card.title,
    description: value(card, 'Mô tả'),
    categories: result.dishes,
    imageUrl: publicImage(card.imageUrl) ? card.imageUrl : undefined,
  });
  const photo = photos[failed];
  return photo ? (
    <>
      <img
        src={photo.src}
        alt={
          photo.illustrative
            ? `Ảnh minh họa món ăn, không phải ảnh thực tế của ${card.title}`
            : `Ảnh niêm yết tại ${card.title}`
        }
        loading="lazy"
        decoding="async"
        onLoad={(e) => e.currentTarget.classList.add('is-loaded')}
        onError={() => setFailed((index) => index + 1)}
      />
      <span className={`sb-vendor-photo-label${photo.illustrative ? ' is-illustrative' : ''}`}>
        {photo.illustrative ? 'Ảnh minh họa' : 'Ảnh niêm yết'}
      </span>
    </>
  ) : (
    <span className="sb-vendor-photo-empty">
      <PiStorefront aria-hidden="true" />
      <span>Chưa có ảnh</span>
    </span>
  );
}

function OpenBadge({ card }: { card: AssistantCard }) {
  if (!card.place) return null;
  return (
    <span className={`sb-open ${card.place.isOpenNow ? 'is-open' : ''}`}>
      {card.place.isOpenNow ? 'Đang mở' : 'Ngoài giờ mở cửa'}
    </span>
  );
}

function VendorPreview({
  result,
  distance,
  trigger,
  onClose,
  onNavigate,
}: {
  result: VendorResult;
  distance?: string;
  trigger: HTMLButtonElement;
  onClose: () => void;
  onNavigate: (route: string) => void;
}) {
  const modal = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = modal.current!;
    dialog.showModal();
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      if (trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [trigger]);
  const route = directions(result.card);
  return (
    <dialog
      ref={modal}
      className="sb-vendor-preview"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') event.stopPropagation();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="sb-vendor-preview-inner">
        <div className="sb-vendor-preview-photo">
          <VendorPhoto key={result.card.imageUrl} result={result} />
          <button
            ref={closeButton}
            type="button"
            className="sb-vendor-close"
            aria-label="Đóng xem nhanh quầy"
            onClick={onClose}
          >
            <PiX />
          </button>
        </div>
        <div className="sb-vendor-preview-body">
          <span className="sb-eyebrow">[AI] Gợi ý từ dữ liệu công khai</span>
          <h2 id={titleId}>{result.card.title}</h2>
          <div className="sb-vendor-meta">
            <OpenBadge card={result.card} />
            {distance && (
              <span>
                <PiMapPin aria-hidden="true" /> {distance}
              </span>
            )}
            {result.card.place?.rating != null && (
              <span>
                <PiStarFill aria-hidden="true" className="sb-star" /> {result.card.place.rating.toFixed(1)} (
                {result.card.place.ratingCount})
              </span>
            )}
          </div>
          {result.dishes.length > 0 && (
            <p className="sb-vendor-dishes">
              <PiForkKnife aria-hidden="true" />
              {result.dishes.join(' · ')}
            </p>
          )}
          <dl className="sb-vendor-details">
            {result.card.fields
              .filter(
                (field) =>
                  !['Món niêm yết', 'Lưu ý', 'Giờ mở cửa', 'Khoảng cách', 'Cơ sở gợi ý'].includes(field.label) &&
                  field.value !== 'Chưa ghi nhận' &&
                  (result.dishes.length <= 1 || field.label !== 'Giá niêm yết'),
              )
              .map((field, index) => (
                <div key={`${field.label}-${index}`}>
                  <dt>{field.label}</dt>
                  <dd>{field.value}</dd>
                </div>
              ))}
          </dl>
          <p id={descriptionId} className="sb-vendor-disclaimer">
            Thông tin tại thời điểm tra cứu. Hãy mở quầy để kiểm tra thông tin mới nhất; chưa xác nhận quầy
            còn món hôm nay.
          </p>
          <div className="sb-vendor-preview-actions">
            {route ? (
              <a className="sb-btn is-ghost" href={route} target="_blank" rel="noopener noreferrer">
                Chỉ đường <PiArrowUpRight aria-hidden="true" />
              </a>
            ) : (
              <button type="button" className="sb-btn is-ghost" onClick={onClose}>
                Xem quầy khác
              </button>
            )}
            <button
              type="button"
              className="sb-btn is-primary"
              onClick={() => {
                onClose();
                onNavigate(result.route);
              }}
            >
              Mở trang quầy <PiArrowRight aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

/** Read-only discovery cards. Routes and photos must come from validated server actions, never Markdown. */
export function AssistantVendorResults({
  cards,
  actions,
  onNavigate,
  compact = false,
}: {
  cards: AssistantCard[];
  actions: AssistantAction[];
  onNavigate: (route: string) => void;
  /** A horizontal photo rail for tight spaces such as voice mode. */
  compact?: boolean;
}) {
  const [selected, setSelected] = useState<{ route: string; trigger: HTMLButtonElement }>();
  const [expanded, setExpanded] = useState(false);
  const [sort, setSort] = useState<Sort>('relevance');
  const [here, setHere] = useState<AssistantLocation>();
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState('');
  const [showMap, setShowMap] = useState(false);
  const grouped = new Map<string, VendorResult>();
  for (const card of cards) {
    const action = actions.find(
      (item) =>
        item.id === card.actionId &&
        item.kind === 'NAVIGATE' &&
        /^\/customer\/explore\/stores\/[1-9][0-9]*$/.test(item.route),
    );
    if (!action) continue;
    const dish = value(card, 'Món niêm yết');
    const existing = grouped.get(action.route);
    if (existing) {
      if (dish && !existing.dishes.includes(dish)) existing.dishes.push(dish);
      if (!publicImage(existing.card.imageUrl) && publicImage(card.imageUrl))
        existing.card = { ...existing.card, imageUrl: card.imageUrl };
    } else grouped.set(action.route, { card, route: action.route, dishes: dish ? [dish] : [] });
  }
  const base = [...grouped.values()];
  const distanceOf = (r: VendorResult) =>
    r.card.place
      ? here
        ? distanceMeters(here, r.card.place)
        : r.card.place.distanceMeters
      : null;
  const results = useMemo(() => {
    const list = [...base];
    if (sort === 'open') list.sort((a, b) => Number(b.card.place?.isOpenNow) - Number(a.card.place?.isOpenNow));
    if (sort === 'near') list.sort((a, b) => (distanceOf(a) ?? Infinity) - (distanceOf(b) ?? Infinity));
    if (sort === 'price')
      list.sort((a, b) => (a.card.place?.priceVnd ?? Infinity) - (b.card.place?.priceVnd ?? Infinity));
    return list;
  }, [cards, actions, sort, here]); // eslint-disable-line react-hooks/exhaustive-deps
  const preview = selected ? grouped.get(selected.route) : undefined;
  const hasPlaces = base.some((r) => r.card.place);
  if (!base.length) return null;

  const chooseSort = async (next: Sort) => {
    setNotice('');
    if (next === 'near' && !here && !base.some((r) => r.card.place?.distanceMeters != null)) {
      setLocating(true);
      try {
        setHere(await requestLocation());
      } catch (e) {
        setNotice(e instanceof Error ? e.message : 'Chưa lấy được vị trí.');
        setLocating(false);
        return;
      }
      setLocating(false);
    }
    setSort(next);
  };

  const previewDialog = preview && selected && (
    <VendorPreview
      key={preview.route}
      result={preview}
      distance={distanceLabel(distanceOf(preview))}
      trigger={selected.trigger}
      onClose={() => setSelected(undefined)}
      onNavigate={onNavigate}
    />
  );

  if (compact)
    return (
      <section className="sb-vendor-rail-wrap" aria-label="Gợi ý quầy phù hợp">
        <div className="sb-vendor-rail">
          {base.map((result) => {
            const price = value(result.card, 'Giá niêm yết');
            const distance = distanceLabel(distanceOf(result));
            return (
              <m.button
                key={result.route}
                type="button"
                className="sb-vendor-mini"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
                onClick={(event) => setSelected({ route: result.route, trigger: event.currentTarget })}
                aria-label={`Xem nhanh ${result.card.title}`}
                aria-haspopup="dialog"
              >
                <span className="sb-vendor-mini-photo">
                  <VendorPhoto key={result.card.imageUrl} result={result} />
                  {result.card.place && (
                    <span className={`sb-vendor-mini-open${result.card.place.isOpenNow ? ' is-open' : ''}`}>
                      {result.card.place.isOpenNow ? 'Đang mở' : 'Đã đóng'}
                    </span>
                  )}
                </span>
                <span className="sb-vendor-mini-body">
                  <strong>{result.card.title}</strong>
                  <span className="sb-vendor-mini-dish">{result.dishes.join(' · ') || 'Thông tin quầy liên quan'}</span>
                  <span className="sb-vendor-mini-foot">
                    {price && result.dishes.length === 1 && <span className="sb-price">{price.replace(' VND', ' ₫')}</span>}
                    {distance && <span>{distance}</span>}
                    {result.card.place?.rating != null && (
                      <span>
                        <PiStarFill aria-hidden="true" className="sb-star" /> {result.card.place.rating.toFixed(1)}
                      </span>
                    )}
                  </span>
                </span>
              </m.button>
            );
          })}
        </div>
        {previewDialog}
      </section>
    );

  const sorts: [Sort, string][] = [
    ['relevance', 'Phù hợp nhất'],
    ['open', 'Đang mở'],
    ['near', locating ? 'Đang định vị…' : 'Gần nhất'],
    ['price', 'Giá thấp'],
  ];
  return (
    <section className="sb-vendor-results" aria-label="Gợi ý quầy phù hợp">
      <div className="sb-vendor-results-heading">
        <span>
          <PiStorefront aria-hidden="true" /> Quầy phù hợp
        </span>
        <span>{base.length} kết quả</span>
      </div>
      {hasPlaces && base.length > 1 && (
        <div className="sb-sort" role="group" aria-label="Sắp xếp quầy">
          {sorts.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`sb-chip ${sort === key ? 'is-active' : ''}`}
              aria-pressed={sort === key}
              disabled={locating}
              onClick={() => void chooseSort(key)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {notice && (
        <p role="status" className="sb-vendor-results-hint">
          {notice}
        </p>
      )}
      <div className="sb-vendor-list">
        {(expanded ? results : results.slice(0, 3)).map((result) => {
          const location = value(result.card, 'Địa chỉ') ?? value(result.card, 'Khu vực');
          const price = value(result.card, 'Giá niêm yết');
          const distance = distanceLabel(distanceOf(result));
          return (
            <m.button
              layout="position"
              type="button"
              className="sb-vendor-tile"
              key={result.route}
              whileTap={{ scale: 0.98 }}
              onClick={(event) => setSelected({ route: result.route, trigger: event.currentTarget })}
              aria-label={`Xem nhanh ${result.card.title}`}
              aria-haspopup="dialog"
            >
              <span className="sb-vendor-tile-photo">
                <VendorPhoto key={result.card.imageUrl} result={result} />
              </span>
              <span className="sb-vendor-tile-copy">
                <strong>{result.card.title}</strong>
                <span className="sb-vendor-tile-dish">{result.dishes.join(' · ') || 'Thông tin quầy liên quan'}</span>
                {location && (
                  <span className="sb-vendor-location">
                    <PiMapPin aria-hidden="true" />
                    {location}
                  </span>
                )}
                <span className="sb-vendor-tile-footer">
                  {price && result.dishes.length === 1 ? <span className="sb-price">{price}</span> : <span>Thông tin niêm yết</span>}
                  <OpenBadge card={result.card} />
                  {distance && <span>{distance}</span>}
                  {result.card.place?.rating != null && (
                    <span>
                      <PiStarFill aria-hidden="true" className="sb-star" /> {result.card.place.rating.toFixed(1)}
                    </span>
                  )}
                </span>
              </span>
              <PiArrowRight className="sb-vendor-tile-arrow" aria-hidden="true" />
            </m.button>
          );
        })}
      </div>
      <div className="sb-vendor-foot">
        {results.length > 3 && (
          <button type="button" className="sb-link" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Thu gọn danh sách' : `Xem thêm ${results.length - 3} quầy`}
          </button>
        )}
        {hasPlaces && (
          <button type="button" className="sb-link" aria-expanded={showMap} onClick={() => setShowMap(!showMap)}>
            <PiMapTrifold aria-hidden="true" /> {showMap ? 'Ẩn bản đồ' : 'Xem trên bản đồ'}
          </button>
        )}
      </div>
      {showMap && (
        <Suspense fallback={<div className="sb-mini-map is-loading" role="status">Đang tải bản đồ…</div>}>
          <AssistantMiniMap
            results={results.filter((r) => r.card.place).slice(0, 8)}
            here={here}
            onSelect={(route, trigger) => setSelected({ route, trigger })}
          />
        </Suspense>
      )}
      {previewDialog}
    </section>
  );
}

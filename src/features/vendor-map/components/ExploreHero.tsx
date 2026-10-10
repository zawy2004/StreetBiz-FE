import type { CSSProperties } from 'react';

import { Icon } from '@/components/common';
import { ThemeSwitchButton } from '@/components/layout';
import { Steam } from '@/components/illustrations';
import { LocationBar } from '@/features/buyer-discovery/components/LocationBar';

const photo = (key: string) => `${import.meta.env.BASE_URL}images/food/${key}.jpg`;
const delay = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties;
const street = (w: number) => `${import.meta.env.BASE_URL}images/hero/hanoi-street-${w}.webp`;

type Props = {
  isDesktop: boolean;
  /** The area picker belongs to the storefront tab only. */
  showArea: boolean;
  onSearch: () => void;
};

/**
 * The cover of a street-food magazine: the question in the editorial face on
 * the left, the food answering it on the right. Stock photos are always
 * captioned as illustrations. The painted kerb under it (rendered by the
 * screen) is where the pavement — the listing — begins.
 */
export function ExploreHero({ isDesktop, showArea, onSearch }: Props) {
  return (
    <header className="relative isolate overflow-hidden bg-card">
      {/* The street itself: a busy pavement of stalls and stools behind the whole cover,
          kept sharp; only the words sit on frosted glass so they stay crisp. */}
      <img
        src={street(1440)}
        srcSet={`${street(960)} 960w, ${street(1440)} 1440w, ${street(1672)} 1672w`}
        sizes="100vw"
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 -z-10 h-full w-full object-cover object-center"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-card/[0.18] lg:bg-transparent lg:bg-gradient-to-r lg:from-card/[0.16] lg:to-transparent"
      />
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-16 bg-gradient-to-t from-card/45 to-transparent"
      />

      <div className="relative mx-auto grid max-w-[1320px] gap-xl px-md pb-lg pt-lg md:px-lg md:pb-xl md:pt-xl lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] lg:items-center lg:gap-2xl lg:px-xl lg:pb-[56px] lg:pt-[48px]">
        <div className="min-w-0">
          {/* Frosted glass: the photo shows through, blurred, only behind the words. */}
          <div className="relative rounded-[28px] border border-white/80 bg-[linear-gradient(140deg,rgb(255_255_255/0.86)_0%,rgb(255_244_234/0.74)_100%)] p-md shadow-sheet backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-none dark:bg-card/[0.6] md:p-lg lg:max-w-[640px] lg:rounded-[36px] lg:p-[40px]">
            {!isDesktop ? (
              <div className="absolute right-sm top-sm z-10">
                <ThemeSwitchButton />
              </div>
            ) : null}
            {/* Two set lines rather than a ch-based width: `ch` differs between the fallback face
                and Newsreader, so the break moved (and the page with it) when the font arrived. */}
            <h1 className="pr-12 font-editorial text-[38px] font-semibold leading-[1.02] tracking-[-0.025em] text-text [font-variation-settings:'opsz'_72] sm:text-[56px] lg:pr-0 lg:text-[72px]">
              <span className="block">Hôm nay ăn gì</span> <span className="block">trên phố?</span>
            </h1>
            <p className="mt-sm max-w-[46ch] text-body-md font-medium text-text/90 md:mt-md md:text-body-lg">
              Quán vỉa hè có giấy phép của phường, đang mở bán quanh bạn.
            </p>

            <button
              type="button"
              aria-label="Tìm kiếm"
              onClick={onSearch}
              className="group mt-md flex h-[56px] md:mt-lg md:h-[60px] w-full max-w-[600px] items-center gap-sm rounded-full border border-border bg-card pl-md pr-2 text-left text-body-lg text-muted shadow-sheet transition-[border-color,box-shadow] duration-200 hover:border-primary/40"
            >
              <Icon name="magnify" size={22} color="currentColor" />
              <span className="min-w-0 flex-1 truncate">Tìm món, quán hoặc tuyến phố</span>
              <span className="flex h-11 shrink-0 items-center rounded-full bg-primary px-lg text-label font-bold text-on-primary transition-colors duration-150 group-hover:bg-primary-pressed">
                Tìm
              </span>
            </button>

            <div className="mt-md">
              <LocationBar showArea={showArea} />
            </div>
          </div>

          {/* Phones and tablets still get the food, as a strip under the controls. */}
          <div aria-hidden="true" className="mt-md grid grid-cols-3 gap-xs md:mt-lg lg:hidden">
            {['bun-cha', 'banh-mi', 'pho'].map((key, i) => (
              <img
                key={key}
                src={photo(key)}
                alt=""
                decoding="async"
                style={delay(80 + i * 100)}
                className="sb-rise h-[84px] w-full rounded-[14px] object-cover sm:h-[150px]"
              />
            ))}
          </div>
        </div>

        <HeroPhotos />
      </div>
    </header>
  );
}

/** One tall dish and two small ones, revealed once in sequence; a slot plate pinned on top. */
function HeroPhotos() {
  return (
    <div className="relative hidden h-[460px] lg:block">
      <figure
        style={delay(120)}
        className="sb-rise absolute inset-y-0 left-0 w-[62%] overflow-hidden rounded-[28px] shadow-sheet ring-[6px] ring-card"
      >
        <img
          src={photo('bun-cha')}
          alt=""
          decoding="async"
          className="h-full w-full object-cover"
        />
        <Steam className="absolute left-[30%] top-[10%] h-[150px] w-[120px]" />
        <figcaption className="absolute left-sm top-sm rounded-full bg-black/45 px-2.5 py-1 text-body-xs text-white backdrop-blur-md">
          Bún chả, ảnh minh họa
        </figcaption>
      </figure>
      <figure
        style={delay(260)}
        className="sb-rise absolute right-0 top-0 h-[47%] w-[35%] overflow-hidden rounded-[20px] shadow-sheet ring-[5px] ring-card"
      >
        <img
          src={photo('banh-mi')}
          alt=""
          decoding="async"
          className="h-full w-full object-cover"
        />
        <figcaption className="absolute bottom-xs left-xs rounded-full bg-black/45 px-2 py-0.5 text-[11px] text-white backdrop-blur-md">
          Bánh mì, ảnh minh họa
        </figcaption>
      </figure>
      <figure
        style={delay(400)}
        className="sb-rise absolute bottom-0 right-0 h-[49%] w-[35%] overflow-hidden rounded-[20px] shadow-sheet ring-[5px] ring-card"
      >
        <img src={photo('pho')} alt="" decoding="async" className="h-full w-full object-cover" />
        <figcaption className="absolute bottom-xs left-xs rounded-full bg-black/45 px-2 py-0.5 text-[11px] text-white backdrop-blur-md">
          Phở, ảnh minh họa
        </figcaption>
      </figure>

      <div
        style={delay(560)}
        className="sb-rise absolute -left-8 bottom-10 w-[256px] overflow-hidden rounded-[16px] bg-card text-text shadow-sheet ring-1 ring-black/5"
      >
        <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
        <div className="flex items-start gap-sm p-sm">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-tint-tertiary text-tertiary"
          >
            <Icon name="shield-check-outline" size={20} color="currentColor" weight="fill" />
          </span>
          <p className="text-body-sm leading-[1.45] text-muted">
            <span className="block font-sign text-[15px] font-bold text-text [font-stretch:90%]">
              Mỗi quán, một ô vỉa hè
            </span>
            được phường cấp phép và kiểm tra bằng mã QR.
          </p>
        </div>
      </div>
    </div>
  );
}

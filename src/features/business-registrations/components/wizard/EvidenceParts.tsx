import { useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Icon } from '@/components/common';
import { Spinner } from '@/components/common/Spinner';
import type { Pipeline, ReviewItem, StageState } from './evidence-review';

/* -------------------------------------------------------------- envelope */

/**
 * The application envelope: a warm sheet with its flap drawn along the top,
 * the documents laid on it. Pieces that reach the server slide down into it.
 */
export function EvidenceEnvelope({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="relative overflow-hidden rounded-[28px] bg-[#FFF3E8] ring-1 ring-brand/25 dark:bg-[#2A2420]"
    >
      <h2 id={headingId} className="sr-only">
        {title}
      </h2>
      <svg
        viewBox="0 0 600 64"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="block h-11 w-full md:h-14"
      >
        <path
          d="M0 0 H600 L322 54 Q300 62 278 54 Z"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
          className="fill-card stroke-brand/70"
        />
        <circle cx="300" cy="40" r="9" className="fill-brand" />
        <circle cx="300" cy="40" r="4" className="fill-white/90" />
      </svg>
      <div className="grid grid-cols-2 gap-sm p-sm pt-xs md:gap-md md:p-lg md:pt-sm">
        {children}
      </div>
    </section>
  );
}

export function NeedChip({ need }: { need: 'required' | 'optional' | 'fromStep3' }) {
  const tone =
    need === 'required'
      ? 'bg-[#FFF3D1] text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]'
      : 'bg-[#EEF1F4] text-[#2B3640] dark:bg-[#1D2833] dark:text-[#C5D0DA]';
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center rounded-[6px] px-2 text-badge uppercase ${tone}`}
    >
      {need === 'required' ? 'Bắt buộc' : need === 'optional' ? 'Thêm nếu cần' : 'Từ bước 3'}
    </span>
  );
}

/** Status pill of a document once submitting has begun. */
export function DocProgressBadge({
  state,
}: {
  state: 'waiting' | 'uploading' | 'saved' | 'attached';
}) {
  const tone =
    state === 'attached' || state === 'saved'
      ? 'bg-[#E6F6EC] text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]'
      : 'bg-[#EEF1F4] text-[#2B3640] dark:bg-[#1D2833] dark:text-[#C5D0DA]';
  const text = {
    waiting: 'Chờ tải lên',
    uploading: 'Đang tải lên…',
    saved: 'Đã lưu',
    attached: 'Đã đính kèm',
  }[state];
  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-bold shadow-card ${tone}`}
    >
      {state === 'uploading' ? (
        <Spinner size={13} color="currentColor" />
      ) : (
        <Icon
          name={state === 'waiting' ? 'clock-outline' : 'check-circle'}
          size={15}
          color="currentColor"
        />
      )}
      {text}
    </span>
  );
}

/* ----------------------------------------------------------- review sheet */

/**
 * "Kiểm tra lại trước khi nộp": lined paper with every answer and a "Sửa" link
 * back to its step. Folds on screens without a side column (open at first).
 */
export function ReviewSheet({ items }: { items: ReviewItem[] }) {
  const [open, setOpen] = useState(true);
  const headingId = useId();
  const missingCount = items.filter((i) => i.missing).length;
  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-[20px] bg-card shadow-card ring-1 ring-border"
    >
      <div className="flex items-center justify-between gap-sm border-b border-border px-md py-sm">
        <h2 id={headingId} className="font-sign text-[19px] font-extrabold leading-6 text-text">
          Kiểm tra lại trước khi nộp
        </h2>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-11 shrink-0 items-center gap-1 rounded-[10px] px-xs text-label font-semibold text-primary hover:bg-tint-primary xl:hidden"
        >
          {open ? 'Thu gọn' : `Mở (${items.length} mục)`}
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} color="currentColor" />
        </button>
      </div>
      {missingCount > 0 ? (
        <p className="flex items-start gap-1.5 bg-[#FFF3D1] px-md py-xs text-body-sm font-medium text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
          <Icon
            name="information-outline"
            size={16}
            color="currentColor"
            className="mt-0.5 shrink-0"
          />
          {missingCount} mục chưa điền. Bạn vẫn bấm nộp được; Phường có thể yêu cầu bổ sung.
        </p>
      ) : null}
      <dl
        className={`${open ? 'block' : 'hidden xl:block'} px-md`}
        style={{
          backgroundImage:
            'repeating-linear-gradient(180deg, transparent 0 63px, rgb(var(--c-border) / 0.55) 63px 64px)',
        }}
      >
        {items.map((item) => (
          <div key={item.key} className="flex min-h-16 items-center justify-between gap-sm py-xs">
            <div className="min-w-0">
              <dt className="text-[13px] leading-[18px] text-muted">{item.label}</dt>
              <dd className="text-[16px] font-medium leading-6 text-text">
                {item.missing && !item.value ? (
                  <span className="inline-flex h-6 items-center rounded-[6px] bg-[#FFF3D1] px-2 text-badge uppercase text-[#6B4100] dark:bg-[#3A2A08] dark:text-[#FFD27A]">
                    Chưa điền
                  </span>
                ) : (
                  <span
                    className={`break-words ${item.missing ? 'text-[#6B4100] dark:text-[#FFD27A]' : ''}`}
                  >
                    {item.value}
                  </span>
                )}
              </dd>
            </div>
            <Link
              to={item.editPath}
              aria-label={`Sửa ${item.label.toLowerCase()}`}
              className={`flex h-11 shrink-0 items-center rounded-[10px] px-xs text-label font-semibold underline-offset-4 hover:underline ${
                item.missing ? 'text-primary underline' : 'text-primary'
              }`}
            >
              Sửa
            </Link>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* --------------------------------------------------------------- pipeline */

function StageDot({ state }: { state: StageState }) {
  if (state === 'running') return <Spinner size={16} color="currentColor" />;
  return (
    <Icon
      name={
        state === 'done'
          ? 'check-circle'
          : state === 'error'
            ? 'close-circle-outline'
            : 'circle-outline'
      }
      size={17}
      color="currentColor"
    />
  );
}

const STAGE_TONE: Record<StageState, string> = {
  todo: 'text-muted',
  running: 'text-text',
  done: 'text-[#0B5D33] dark:text-[#8BE3B0]',
  error: 'text-[#8F1717] dark:text-[#FF9A90]',
};

/**
 * Where the submission is, in its three real stages: upload the files, send
 * the application, attach the files. Fixed height so the bar never pushes the
 * page when it appears.
 */
export function SubmitPipeline({ pipeline }: { pipeline: Pipeline }) {
  const stages: { key: string; label: string; state: StageState; count?: string }[] = [
    {
      key: 'upload',
      label: 'Tải giấy tờ lên',
      state: pipeline.upload.state,
      count: `${pipeline.upload.done}/${pipeline.upload.total}`,
    },
    { key: 'create', label: 'Gửi hồ sơ', state: pipeline.create.state },
    {
      key: 'attach',
      label: 'Đính kèm giấy tờ',
      state: pipeline.attach.state,
      count: `${pipeline.attach.done}/${pipeline.attach.total}`,
    },
  ];
  const running = stages.find((s) => s.state === 'running');
  return (
    <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur">
      <div
        role="status"
        aria-live="polite"
        className="no-scrollbar mx-auto flex h-12 max-w-[1040px] items-center gap-xs overflow-x-auto px-md md:px-lg lg:justify-end lg:px-xl"
      >
        <span className="sr-only">
          {running
            ? `Đang ${running.label.toLowerCase()}${running.count ? `, ${running.count}` : ''}`
            : ''}
        </span>
        {stages.map((s, i) => (
          <span key={s.key} aria-hidden="true" className="flex shrink-0 items-center gap-xs">
            {i > 0 ? <span className="h-0.5 w-4 rounded-full bg-border md:w-8" /> : null}
            <span
              className={`flex items-center gap-1.5 text-[13.5px] font-semibold ${STAGE_TONE[s.state]}`}
            >
              <StageDot state={s.state} />
              {s.label}
              {s.count ? <span className="font-sign font-bold font-tabular">{s.count}</span> : null}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

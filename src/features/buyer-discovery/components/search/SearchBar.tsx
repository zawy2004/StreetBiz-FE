import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon } from '@/components/common';
import { colors } from '@/theme';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

/**
 * The head of the street's menu: back, then one large search field. The words
 * typed are set in the editorial face; the edge turns brand orange on focus.
 * Enter only folds the keyboard away (the search already runs as you type).
 */
export function SearchBar({ value, onChange }: Props) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const hasText = value.length > 0;

  return (
    <div className="flex items-center gap-xs md:gap-sm">
      <button
        type="button"
        aria-label="Quay lại"
        onClick={() => navigate(-1)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card text-text shadow-card ring-1 ring-border transition-colors hover:bg-sunken lg:h-12 lg:w-12"
      >
        <Icon name="arrow-left" size={20} color="currentColor" />
      </button>
      <div className="flex h-14 min-w-0 flex-1 items-center gap-sm rounded-full border-2 border-border bg-card pl-md pr-1.5 shadow-card transition-[border-color,box-shadow] duration-200 focus-within:border-brand focus-within:shadow-[0_0_0_4px_rgb(var(--c-brand)/0.14)] hover:border-text/20 lg:h-16 lg:pl-lg">
        <Icon name="magnify" size={22} color={colors.primary} />
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          placeholder="Tìm món ăn hoặc quán, VD: xôi gà giá rẻ"
          aria-label="Tìm món ăn hoặc quán"
          autoFocus
          className="h-full min-w-0 flex-1 bg-transparent font-editorial text-[20px] text-text outline-none placeholder:font-sans placeholder:text-body-lg placeholder:text-muted/80 lg:text-[24px] [&::-webkit-search-cancel-button]:appearance-none"
        />
        <button
          type="button"
          aria-label="Xoá chữ"
          aria-hidden={!hasText || undefined}
          tabIndex={hasText ? 0 : -1}
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          className={[
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-[opacity,background-color] duration-[120ms] hover:bg-sunken hover:text-text',
            hasText ? 'opacity-100' : 'pointer-events-none opacity-0',
          ].join(' ')}
        >
          <Icon name="close-circle-outline" size={22} color="currentColor" weight="fill" />
        </button>
      </div>
    </div>
  );
}

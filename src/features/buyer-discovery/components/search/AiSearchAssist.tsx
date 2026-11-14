import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { Icon } from '@/components/common';
import { errorMessage } from '@/core/api';
import { aiApi, type SearchIntent } from '@/core/api/ai-api';
import { applyIntent, looksLikeASentence, type IntentApplication } from '../../ai-search';

/**
 * AIP-03: "bún chả dưới 50k gần đây" typed as one sentence. The button reads it once, puts the
 * keywords back in the box and switches on the matching filters, then says in words what it understood
 * so the customer can correct it with the usual chips. Without the model, the keyword rules answer
 * (the server says which one did), and a failed request leaves the search exactly as typed.
 */
export function AiSearchAssist({
  query,
  hasPosition,
  onApply,
}: {
  query: string;
  hasPosition: boolean;
  onApply: (application: IntentApplication) => void;
}) {
  const [shown, setShown] = useState<{ intent: SearchIntent; notes: string[] } | null>(null);
  const read = useMutation({
    mutationFn: (text: string) => aiApi.searchIntent(text),
    onSuccess: (intent) => {
      const application = applyIntent(intent, hasPosition);
      onApply(application);
      setShown({ intent, notes: application.notes });
    },
  });

  // A new sentence makes the last reading stale.
  useEffect(() => {
    if (shown && query.trim() !== (shown.intent.query ?? '').trim()) setShown(null);
  }, [query, shown]);

  const ready = looksLikeASentence(query);
  if (!ready && !shown && !read.isError) return null;

  return (
    <div className="flex flex-col gap-xs">
      {ready && !shown ? (
        <button
          type="button"
          disabled={read.isPending}
          aria-busy={read.isPending || undefined}
          onClick={() => read.mutate(query.trim())}
          className="inline-flex min-h-11 w-fit items-center gap-xs rounded-full bg-secondary-bg px-md text-body-sm font-semibold text-on-secondary ring-1 ring-secondary/40 transition-colors hover:bg-secondary/25 disabled:opacity-60"
        >
          <Icon name="creation" size={16} color="currentColor" weight="fill" />
          {read.isPending ? 'Đang hiểu câu của bạn…' : 'Hiểu câu này giúp tôi (AI)'}
        </button>
      ) : null}
      {read.isError ? (
        <p role="status" className="text-body-sm text-muted">
          {errorMessage(read.error)} Tìm kiếm vẫn chạy theo chữ bạn gõ.
        </p>
      ) : null}
      {shown ? (
        <p
          role="status"
          className="flex flex-wrap items-center gap-x-xs gap-y-1 text-body-sm text-muted"
        >
          <Icon name="creation" size={15} color="currentColor" weight="fill" className="text-on-secondary" />
          <span className="font-semibold text-text">
            {shown.intent.source === 'AI' ? 'Gợi ý AI' : 'Hiểu theo từ khoá'}:
          </span>
          <span>{shown.intent.explanation}</span>
          {shown.notes.map((note) => (
            <span key={note} className="text-[#6B4100] dark:text-[#FFD27A]">
              {note}
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}

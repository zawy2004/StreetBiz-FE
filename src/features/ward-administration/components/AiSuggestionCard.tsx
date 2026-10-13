import { ReactNode, useState } from 'react';

import { Button } from '@/components/common';
import { showToast } from '@/components/feedback';
import { TextField } from '@/components/forms';
import { AiHint } from '@/components/status';
import { complianceApi } from '../ward-api';

type Props = {
  title: string;
  children?: ReactNode;
  /** The BR-41 log row this suggestion was recorded under. No accept/reject controls render
   * without one -- a cache hit, a rule-only fallback, or a legacy pre-envelope row never get one. */
  aiLogId?: number | null;
};

/**
 * Wraps AiHint with BR-41's accept/reject controls. Never doubles as the actual
 * approve/save action for whatever the suggestion is about -- it only records what
 * the officer thought of the AI's output (AiAssistanceLogs.accepted/reviewed_at).
 */
export function AiSuggestionCard({ title, children, aiLogId }: Props) {
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState<{ accepted: boolean; reviewedAt: string } | null>(null);
  const [submitting, setSubmitting] = useState<'accept' | 'reject' | null>(null);

  const submit = async (accepted: boolean) => {
    if (!aiLogId) return;
    setSubmitting(accepted ? 'accept' : 'reject');
    try {
      const result = await complianceApi.aiFeedback(aiLogId, accepted, note.trim() || undefined);
      setDecision({ accepted: result.accepted, reviewedAt: result.reviewedAt });
      showToast(accepted ? 'Đã ghi nhận chấp nhận gợi ý AI' : 'Đã ghi nhận không chấp nhận gợi ý AI');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không ghi được phản hồi về gợi ý AI');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <AiHint title={title}>
      {children}
      {aiLogId ? (
        <div className="mt-sm border-t border-border pt-sm">
          {decision ? (
            <p className="text-body-sm text-tertiary">
              {decision.accepted ? '✓ Đã chấp nhận' : '✗ Không chấp nhận'} gợi ý lúc{' '}
              {new Date(decision.reviewedAt).toLocaleString('vi-VN')}
              {' · '}
              <button
                type="button"
                className="text-indigo underline"
                onClick={() => setDecision(null)}
              >
                Đổi ý
              </button>
            </p>
          ) : (
            <>
              <TextField
                value={note}
                onChangeText={setNote}
                placeholder="Ghi chú (không bắt buộc)"
                maxLength={500}
              />
              <div className="mt-xs flex gap-sm">
                <div className="flex-1">
                  <Button
                    label={submitting === 'reject' ? 'Đang gửi...' : 'Không chấp nhận'}
                    variant="outline"
                    size="sm"
                    disabled={!!submitting}
                    onPress={() => void submit(false)}
                  />
                </div>
                <div className="flex-1">
                  <Button
                    label={submitting === 'accept' ? 'Đang gửi...' : 'Chấp nhận gợi ý'}
                    variant="approve"
                    size="sm"
                    disabled={!!submitting}
                    onPress={() => void submit(true)}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}
    </AiHint>
  );
}

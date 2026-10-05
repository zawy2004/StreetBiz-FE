import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { AppHeader, Screen } from '@/components/layout';
import { errorMessage } from '@/core/api';
import { env, isLiveApi } from '@/core/config/env';
import { MessageComposer } from '@/features/chat/components/MessageComposer';
import { assistantApi, MAX_CONTEXT_LENGTH, MAX_QUESTION_LENGTH } from '../assistant-api';

type Message = { id: number; from: 'BOT' | 'ME'; text: string; isAi?: boolean; isError?: boolean };

const QUICK_QUESTIONS = [
  'Tôi cần chuẩn bị những giấy tờ gì để đăng ký?',
  'Quy chuẩn chừa 1,5 m lối đi bộ trên vỉa hè là gì?',
  'Thủ tục xin cấp phép sử dụng hè phố gồm những bước nào?',
  'Mức phạt khi lấn chiếm hè phố là bao nhiêu?',
];

/** Offline demo answers, clearly marked as simulated so they are never mistaken for the real service. */
const MOCK_ANSWERS: Record<string, string> = {
  'giấy tờ':
    'Cần ảnh hai mặt CCCD; cửa hàng cố định cần thêm giấy phép kinh doanh. Ảnh JPG, PNG, WEBP hoặc PDF, tối đa 5 MB mỗi tệp.',
  '1,5':
    'Việc sử dụng tạm thời hè phố để kinh doanh chỉ được thực hiện khi vỉa hè còn chừa tối thiểu 1,5 mét thông thoáng cho người đi bộ.',
  'thủ tục':
    'Có hai bước: nộp hồ sơ đăng ký kinh doanh tại UBND phường, sau khi được duyệt thì chọn ô vỉa hè trên bản đồ và nộp đơn xin cấp phép.',
  'phạt':
    'Mức phạt phụ thuộc vào hành vi và khung phạt của từng phường. Hãy xem bảng phạt phường công bố hoặc hỏi bộ phận một cửa.',
};

/** The last few turns, so a follow-up like "còn cửa hàng cố định thì sao?" has something to refer to. */
function buildContext(messages: Message[], pageContext: string | undefined): string {
  const recent = messages
    .filter((m) => !m.isError)
    .slice(-6)
    .map((m) => `${m.from === 'ME' ? 'Hộ kinh doanh' : 'Trợ lý'}: ${m.text}`)
    .join('\n');
  return [pageContext, recent].filter(Boolean).join('\n').slice(-MAX_CONTEXT_LENGTH);
}

/** AIC-09: advisory onboarding chatbot. It never decides anything about a registration. */
export function VendorAssistantScreen() {
  // Switched off with VITE_ENABLE_AI_COMPLIANCE; nothing links here then, and a typed URL goes home.
  if (!env.enableAiCompliance) return <Navigate to="/vendor/home" replace />;
  return <Assistant />;
}

function Assistant() {
  const location = useLocation();
  const pageContext = (location.state as { context?: string } | null)?.context;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      from: 'BOT',
      text: 'Xin chào! Tôi là trợ lý AI của StreetBiz. Tôi có thể giải đáp về giấy tờ đăng ký, quy chuẩn vỉa hè và thủ tục cấp phép. Câu trả lời chỉ mang tính tham khảo.',
      isAi: true,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const nextId = useRef(1);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView?.({ block: 'end' });
  }, [messages, loading]);

  const add = (message: Omit<Message, 'id'>) =>
    setMessages((prev) => [...prev, { ...message, id: nextId.current++ }]);

  const ask = async (raw: string) => {
    const question = raw.trim();
    if (!question || loading) return;
    if (question.length > MAX_QUESTION_LENGTH) {
      setError(`Câu hỏi không quá ${MAX_QUESTION_LENGTH} ký tự.`);
      throw new Error('too long'); // keeps the draft in the composer
    }

    setError(undefined);
    const context = buildContext(messages, pageContext);
    add({ from: 'ME', text: question });
    setLoading(true);
    try {
      if (isLiveApi) {
        const res = await assistantApi.ask(question, context);
        add({ from: 'BOT', text: res.answer, isAi: res.isAiGenerated });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 400));
        const key = Object.keys(MOCK_ANSWERS).find((k) => question.toLowerCase().includes(k));
        add({
          from: 'BOT',
          text: `(Mô phỏng, không gọi AI thật) ${key ? MOCK_ANSWERS[key] : 'Bạn có thể liên hệ bộ phận một cửa UBND phường để được giải đáp cụ thể.'}`,
        });
      }
    } catch (err) {
      add({ from: 'BOT', text: `Không nhận được câu trả lời: ${errorMessage(err)}`, isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Screen>
          <AppHeader title="Trợ lý đăng ký" subtitle="Giải đáp giấy tờ, quy chuẩn vỉa hè và thủ tục" back />

          <div className="flex flex-col gap-xs">
            <span className="text-label text-muted">Gợi ý câu hỏi</span>
            <div className="flex flex-row flex-wrap gap-xs">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={loading}
                  onClick={() => ask(q)}
                  className="rounded-full border border-border bg-card px-sm py-xs text-left text-body-sm text-text hover:bg-bg disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* A polite live region: new answers are announced without stealing focus. */}
          <div role="log" aria-live="polite" aria-label="Cuộc trò chuyện" className="mt-sm flex flex-col gap-sm">
            {messages.map((m) => (
              <div
                key={m.id}
                className={[
                  'max-w-[90%] rounded-2xl p-sm',
                  m.from === 'ME'
                    ? 'self-end bg-primary-solid text-white'
                    : m.isError
                      ? 'self-start border border-error/40 bg-card text-error-ink'
                      : 'self-start border border-border bg-card text-text',
                ].join(' ')}
              >
                {m.isAi ? (
                  <span className="mb-1 block text-label text-primary-ink">Trợ lý AI · chỉ để tham khảo</span>
                ) : null}
                <span className="whitespace-pre-line text-body-md">{m.text}</span>
              </div>
            ))}
            {loading ? (
              <div className="self-start rounded-2xl border border-border bg-card p-sm text-body-sm text-muted">
                <span className="animate-pulse">Trợ lý đang soạn câu trả lời…</span>
              </div>
            ) : null}
            <div ref={bottom} />
          </div>

          <p className="mt-md text-center text-body-sm text-muted">
            Thẩm quyền xét duyệt hồ sơ và xử phạt thuộc UBND phường. Trợ lý không thể duyệt, từ chối hay thay đổi hồ sơ của bạn.
          </p>
        </Screen>
      </div>
      <MessageComposer
        sending={loading}
        error={error}
        placeholder="Nhập câu hỏi, ví dụ: tôi cần giấy tờ gì?"
        onSend={ask}
      />
    </div>
  );
}

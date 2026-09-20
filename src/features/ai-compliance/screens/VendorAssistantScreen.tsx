import { useState } from 'react';

import { Button } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { isLiveApi } from '@/core/config/env';
import { complianceApi } from '@/features/ward-administration/ward-api';

type Message = { id: string; from: 'BOT' | 'ME'; text: string; isAi?: boolean };

const QUICK_QUESTIONS = [
  'Quy chuẩn chừa 1.5m lối đi bộ vỉa hè là gì?',
  'Thủ tục cấp phép sử dụng tạm thời hè phố?',
  'Cách tính phí sử dụng hè phố theo Luật Phí 2015?',
  'Mức phạt vi phạm lấn chiếm theo Nghị định 168/2024?',
];

const MOCK_ANSWERS: Record<string, string> = {
  '1.5m':
    '[AI] Theo Điều 21 Nghị định 165/2024/NĐ-CP và Luật Đường bộ 2024, việc sử dụng tạm thời hè phố để kinh doanh chỉ được thực hiện khi chiều rộng vỉa hè đảm bảo chừa lại tối thiểu 1.5 mét thông thoáng, liên tục cho người đi bộ (bao gồm người khuyết tật). Phần diện tích còn lại mới được kẻ vạch sơn phân ô cấp phép.',
  'thủ tục':
    '[AI] Thủ tục xin cấp phép sử dụng tạm thời lòng đường, hè phố gồm 2 bước độc lập:\n1. Nộp hồ sơ Đăng ký điểm kinh doanh (có ảnh CCCD và giấy tờ liên quan) tại UBND Phường.\n2. Sau khi hồ sơ kinh doanh được phê duyệt (BR-16), bạn chọn ô vỉa hè phù hợp trên bản đồ và nộp Đơn xin cấp phép tạm thời. UBND Phường sẽ thẩm định và cấp Giấy phép số QR kèm Hợp đồng thuê.',
  'phí':
    '[AI] Mức thu phí sử dụng tạm thời lòng đường, hè phố được thực hiện theo Luật Phí và Lệ phí 2015 và Nghị quyết của HĐND thành phố Đà Nẵng. Phí được tính theo công thức: (Đơn giá ô/ngày) x (Số ngày thuê) x (Hệ số diện tích). Bạn có thể thanh toán trực tuyến qua MoMo, ZaloPay hoặc chuyển khoản ngân hàng.',
  'phạt':
    '[AI] Theo Nghị định 168/2024/NĐ-CP (Điều 12), hành vi lấn chiếm hè phố để kinh doanh dịch vụ ngoài phạm vi được cấp phép bị phạt tiền từ 2.000.000đ đến 3.000.000đ đối với cá nhân (trung bình 2.500.000đ), đồng thời buộc di dời toàn bộ vật dụng, hàng hóa vi phạm và khôi phục lại tình trạng ban đầu của hè phố.',
};

export function VendorAssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      from: 'BOT',
      text: 'Xin chào! Tôi là Trợ lý AI StreetBiz (hỗ trợ bởi Groq LLM). Tôi có thể giải đáp các thắc mắc về Luật Đường bộ 2024, Nghị định 165/2024/NĐ-CP, quy chuẩn hè phố 1.5m, thủ tục cấp phép và mức phạt. Bạn cần hỏi điều gì?',
      isAi: true,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendQuestion = async (q: string) => {
    const questionText = q.trim();
    if (!questionText || loading) return;

    const userMsgId = `${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, from: 'ME', text: questionText }]);
    setInput('');
    setLoading(true);

    try {
      if (isLiveApi) {
        const res = await complianceApi.askVendorAssistant(questionText);
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-bot`,
            from: 'BOT',
            text: res.answer,
            isAi: res.isAiGenerated,
          },
        ]);
      } else {
        // Mock response with fast simulation
        await new Promise((r) => setTimeout(r, 600));
        const matchedKey = Object.keys(MOCK_ANSWERS).find((k) =>
          questionText.toLowerCase().includes(k),
        );
        const answer = matchedKey
          ? MOCK_ANSWERS[matchedKey]!
          : `[AI] Trợ lý StreetBiz: Về vấn đề "${questionText}", căn cứ theo Luật Đường bộ 2024 và Nghị định 165/2024/NĐ-CP, hộ kinh doanh phải tuân thủ nghiêm ngặt ranh giới ô được cấp phép, đảm bảo vệ sinh môi trường và chừa lối đi bộ tối thiểu 1.5m. Bạn có thể liên hệ trực tiếp Bộ phận Một cửa UBND Phường để được giải đáp cụ thể.`;

        setMessages((prev) => [
          ...prev,
          { id: `${Date.now()}-bot`, from: 'BOT', text: answer, isAi: true },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-err`,
          from: 'BOT',
          text: 'Xin lỗi, không thể kết nối tới dịch vụ AI vào lúc này. Vui lòng thử lại sau ít phút.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col">
      <Screen
        footer={
          <StickyActions>
            <div className="flex-1">
              <TextField
                value={input}
                onChangeText={setInput}
                placeholder={loading ? 'Trợ lý AI đang suy nghĩ...' : 'Nhập câu hỏi pháp lý, thủ tục...'}
              />
            </div>
            <Button
              label={loading ? '...' : 'Gửi'}
              fullWidth={false}
              disabled={loading || !input.trim()}
              onPress={() => sendQuestion(input)}
            />
          </StickyActions>
        }
      >
        <AppHeader
          title="Trợ lý AI StreetBiz"
          subtitle="Tư vấn quy chuẩn vỉa hè & Pháp lý đô thị [AI · Groq LLM]"
          back
        />

        {/* Quick Question Chips */}
        <div className="flex flex-col gap-1.5">
          <span className="text-body-xs font-semibold text-muted">Gợi ý câu hỏi nhanh:</span>
          <div className="flex flex-row flex-wrap gap-1.5">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-left text-body-xs font-medium text-primary hover:bg-primary/15"
                onClick={() => sendQuestion(q)}
              >
                💬 {q}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="mt-sm flex flex-col gap-sm">
          {messages.map((m) => (
            <div
              key={m.id}
              className={[
                'max-w-[90%] rounded-2xl p-sm shadow-sm',
                m.from === 'ME'
                  ? 'self-end bg-primary text-white'
                  : 'self-start border border-border bg-card text-text',
              ].join(' ')}
            >
              {m.isAi ? (
                <span className="mb-1 block text-body-xs font-semibold text-primary dark:text-primary-light">
                  ✦ Trợ lý Groq AI
                </span>
              ) : null}
              <span className="whitespace-pre-line text-body-md">{m.text}</span>
            </div>
          ))}

          {loading ? (
            <div className="self-start rounded-2xl border border-border bg-card p-sm text-body-sm text-muted">
              <span className="animate-pulse">✦ Trợ lý Groq AI đang tra cứu quy định pháp luật...</span>
            </div>
          ) : null}
        </div>

        <p className="mt-4 text-center text-body-xs text-muted">
          * Ý kiến tư vấn của AI mang tính tham khảo. Thẩm quyền cấp phép và xử phạt thuộc UBND Phường theo Luật Đường bộ 2024.
        </p>
      </Screen>
    </div>
  );
}

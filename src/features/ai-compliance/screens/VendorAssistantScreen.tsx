import { useState } from 'react';

import { Button } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';

type Message = { id: string; from: 'BOT' | 'ME'; text: string };

const FAQ: Record<string, string> = {
  ô: 'Bạn vào tab "Ô thuê" để xem bản đồ ô còn trống, chọn ô rồi bấm "Nộp đơn thuê ô này".',
  phí: 'Phí thuê ô được tính theo tháng, xem và thanh toán tại tab "Tài chính".',
  'hồ sơ': 'Vào "Đăng ký kinh doanh" > "Đăng ký kinh doanh mới" để nộp hồ sơ mới.',
  default: 'Tôi có thể hỗ trợ về đăng ký kinh doanh, thuê ô vỉa hè và phí. Bạn cần hỏi điều gì?',
};

export function VendorAssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      from: 'BOT',
      text: 'Xin chào! Tôi là trợ lý StreetBiz. Bạn cần hỗ trợ gì về đăng ký hay thuê ô vỉa hè?',
    },
  ]);
  const [input, setInput] = useState('');

  const send = () => {
    if (!input.trim()) return;
    const question = input;
    const key = Object.keys(FAQ).find((k) => question.toLowerCase().includes(k)) ?? 'default';
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}`, from: 'ME', text: question },
      { id: `${Date.now()}-a`, from: 'BOT', text: FAQ[key]! },
    ]);
    setInput('');
  };

  return (
    <div className="flex h-full flex-1 flex-col">
      <Screen
        footer={
          <StickyActions>
            <div className="flex-1">
              <TextField value={input} onChangeText={setInput} placeholder="Nhập câu hỏi..." />
            </div>
            <Button label="Gửi" fullWidth={false} onPress={send} />
          </StickyActions>
        }
      >
        <AppHeader title="Trợ lý StreetBiz" subtitle="Hỗ trợ AI · chỉ mang tính tư vấn" back />
        {messages.map((m) => (
          <div
            key={m.id}
            className={[
              'max-w-[85%] rounded-md p-sm',
              m.from === 'ME' ? 'self-end bg-primary' : 'self-start border border-border bg-card',
            ].join(' ')}
          >
            <span className={`text-body-md ${m.from === 'ME' ? 'text-white' : 'text-text'}`}>
              {m.text}
            </span>
          </div>
        ))}
      </Screen>
    </div>
  );
}

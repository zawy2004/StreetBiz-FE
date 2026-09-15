import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { Button } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { colors, radius, spacing, typography } from '@/theme';

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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen
        footer={
          <StickyActions>
            <View style={{ flex: 1 }}>
              <TextField value={input} onChangeText={setInput} placeholder="Nhập câu hỏi..." />
            </View>
            <Button label="Gửi" fullWidth={false} onPress={send} />
          </StickyActions>
        }
      >
        <AppHeader title="Trợ lý StreetBiz" subtitle="Hỗ trợ AI · chỉ mang tính tư vấn" back />
        {messages.map((m) => (
          <View
            key={m.id}
            style={{
              alignSelf: m.from === 'ME' ? 'flex-end' : 'flex-start',
              backgroundColor: m.from === 'ME' ? colors.primary : colors.card,
              borderWidth: m.from === 'ME' ? 0 : 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.sm,
              maxWidth: '85%',
            }}
          >
            <Text
              style={[typography.bodyMd, { color: m.from === 'ME' ? colors.white : colors.text }]}
            >
              {m.text}
            </Text>
          </View>
        ))}
      </Screen>
    </KeyboardAvoidingView>
  );
}

import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyAssistantEvent,
  mergeMessages,
  optimistic,
} from '@/features/assistant/assistant-state';
import { pageContext, safeRoute, suggestions } from '@/features/assistant/assistant-context';
import type { AssistantEvent, AssistantMessage, AssistantRole } from '@/features/assistant/types';

vi.mock('@/core/config/env', () => ({
  isLiveApi: false,
  env: { apiBaseUrl: '', enableChatbot: true },
}));
const { AssistantPanel, MessageBubble } = await import('@/features/assistant/AssistantPanel');
afterEach(cleanup);

function answer(version = 1, status: AssistantMessage['status'] = 'GENERATING'): AssistantMessage {
  return {
    ...optimistic('', 'request-1', 2),
    id: 'answer-1',
    conversationId: 'conversation-1',
    sender: 'ASSISTANT',
    isAiGenerated: true,
    version,
    status,
  };
}
function event(type: 'delta', version: number, delta: string): AssistantEvent {
  return {
    eventId: `event-${version}`,
    conversationId: 'conversation-1',
    messageId: 'answer-1',
    clientRequestId: 'request-1',
    attempt: 1,
    sequence: version,
    version,
    occurredAt: '',
    type,
    payload: { delta },
  };
}

describe('assistant state recovery', () => {
  it('terminal snapshot wins over unsaved deltas and never regresses to generating', () => {
    const state = mergeMessages([answer(10)], [answer(3, 'CANCELLED')]);
    expect(state[0]?.status).toBe('CANCELLED');
    expect(mergeMessages(state, [answer(11)])[0]?.status).toBe('CANCELLED');
  });
  it('deduplicates optimistic retries by request and sender', () => {
    const local = optimistic('hello', 'same-key', 1);
    expect(mergeMessages([local], [{ ...local, id: 'server-id', version: 1 }])).toHaveLength(1);
  });
  it('ignores duplicated/out-of-order deltas and late deltas after cancellation', () => {
    const first = applyAssistantEvent([answer()], event('delta', 2, 'Xin '));
    expect(applyAssistantEvent(first, event('delta', 2, 'Xin '))[0]?.content).toBe('Xin ');
    expect(
      applyAssistantEvent([answer(3, 'CANCELLED')], event('delta', 4, 'late'))[0]?.content,
    ).toBe('');
  });
  it('restores missing text from authoritative snapshot and ignores old snapshots', () => {
    const partial = { ...answer(5), content: 'chào' };
    const snapshot = { ...answer(5), content: 'Xin chào' };
    expect(mergeMessages([partial], [snapshot])[0]?.content).toBe('Xin chào');
    expect(mergeMessages([snapshot], [answer(2)])[0]?.content).toBe('Xin chào');
  });
});

describe('role-safe navigation', () => {
  it.each([
    'https://evil.test',
    '//evil.test',
    '/vendor/../platform/accounts',
    '/vendor/%2e%2e/platform',
    '/accounting',
    '/vendor/slots?token=1',
    '/vendor/slots\\evil',
  ])('blocks unsafe route %s', (route) => {
    expect(safeRoute(route, 'VENDOR')).toBe(false);
  });
  it('blocks role crossing and extracts only own-role contexts', () => {
    expect(safeRoute('/ward/dashboard', 'PLATFORM_ADMIN')).toBe(false);
    expect(pageContext('/ward/inbox/registrations/5', 'VENDOR')).toBeUndefined();
    expect(pageContext('/vendor/slots/3', 'VENDOR')).toEqual({
      pageKey: 'vendor.slot',
      entityId: '3',
    });
  });
});

describe('assistant UI', () => {
  it.each<AssistantRole>(['GUEST', 'CUSTOMER', 'VENDOR', 'WARD_AUTHORITY', 'PLATFORM_ADMIN'])(
    'shows contextual suggestions for %s',
    (role) => {
      render(
        <MemoryRouter>
          <AssistantPanel accountKey={role} role={role} open fullPage={false} onClose={vi.fn()} />
        </MemoryRouter>,
      );
      expect(screen.getByRole('dialog')).toBeVisible();
      for (const q of suggestions(role, '/'))
        expect(screen.getByRole('button', { name: q })).toBeVisible();
    },
  );
  it('Enter sends, Shift+Enter preserves draft and Escape closes', async () => {
    const user = userEvent.setup();
    const close = vi.fn();
    render(
      <MemoryRouter>
        <AssistantPanel accountKey="guest" role="GUEST" open fullPage={false} onClose={close} />
      </MemoryRouter>,
    );
    const input = screen.getByRole('textbox');
    await user.type(input, 'Xin chào');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(input).toHaveValue('Xin chào\n');
    await user.keyboard('{Enter}');
    expect(await screen.findByText(/\[Mô phỏng\]/)).toBeVisible();
    expect(input).toHaveValue('');
    await user.keyboard('{Escape}');
    expect(close).toHaveBeenCalled();
  });
  it('does not render remote images, raw HTML or model-provided links', () => {
    const message: AssistantMessage = {
      ...answer(2, 'COMPLETED'),
      content:
        '<script>alert(1)</script>\n![bad](https://evil.test/track)\n[click](https://evil.test)',
      actions: [{ id: 'evil', label: 'bad action', kind: 'NAVIGATE', route: '//evil.test' }],
    };
    const { container } = render(
      <MessageBubble
        message={message}
        role="VENDOR"
        onNavigate={vi.fn()}
        onRetry={vi.fn()}
        onFeedback={vi.fn()}
        busy={false}
      />,
    );
    expect(container.querySelector('script,img,a')).toBeNull();
    expect(screen.queryByText('bad action')).not.toBeInTheDocument();
    expect(screen.getByText('[AI] Trợ lý StreetBiz')).toBeVisible();
  });
});

import { LogLevel } from '@microsoft/signalr';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { IconButton } from '@/components/common/IconButton';
import { QrCode } from '@/components/common/QrCode';
import { signalRLogger } from '@/core/realtime-logger';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SignalR logger', () => {
  it('drops the error SignalR logs when a connection is stopped on purpose while starting', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    signalRLogger.log(
      LogLevel.Error,
      'Failed to start the connection: Error: The connection was stopped during negotiation.',
    );
    expect(error).not.toHaveBeenCalled();
  });

  it('still reports real failures and warnings', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    signalRLogger.log(LogLevel.Error, 'Failed to complete negotiation with the server: 401');
    signalRLogger.log(LogLevel.Warning, 'Reconnecting');
    expect(error).toHaveBeenCalledWith(
      '[SignalR] Failed to complete negotiation with the server: 401',
    );
    expect(warn).toHaveBeenCalledWith('[SignalR] Reconnecting');
  });

  it('stays quiet below warning level, as the hubs were configured before', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    signalRLogger.log(LogLevel.Information, 'WebSocket connected');
    signalRLogger.log(LogLevel.Debug, 'Sending handshake');
    expect(info).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('labelled icon button', () => {
  it('shows the word beside the icon and keeps the full accessible name', () => {
    render(
      <IconButton
        icon="cog-outline"
        label="Giá & khung giờ"
        accessibilityLabel="Cấu hình giá và khung giờ"
      />,
    );
    const button = screen.getByRole('button', { name: 'Cấu hình giá và khung giờ' });
    expect(button).toHaveTextContent('Giá & khung giờ');
  });

  it('stays a round icon button without a label', () => {
    render(<IconButton icon="bell-outline" accessibilityLabel="Thông báo" />);
    expect(screen.getByRole('button', { name: 'Thông báo' }).className).toContain('w-11');
  });
});

describe('QR code', () => {
  it('is an image with a name for screen readers', () => {
    render(<QrCode value="SBP1.token" label="Mã QR giấy phép số" />);
    expect(screen.getByRole('img', { name: 'Mã QR giấy phép số' })).toBeInTheDocument();
  });

  it('falls back to a generic name', () => {
    render(<QrCode value="x" />);
    expect(screen.getByRole('img', { name: 'Mã QR' })).toBeInTheDocument();
  });
});

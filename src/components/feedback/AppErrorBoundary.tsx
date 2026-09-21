import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/common';

type Props = { children: ReactNode };
type State = { error: Error | null; componentStack: string | null };

/**
 * Last-resort crash screen. Without this, an uncaught render error anywhere
 * in the tree unmounts the whole app and leaves only the <body> background
 * showing - which in dark mode (--c-bg is near-black) reads as a plain black
 * screen with no error message and no way to recover except a hard refresh.
 *
 * Shows the component stack (which screen/component crashed), not just the
 * message - the message alone ("Cannot read properties of undefined...")
 * is rarely enough to find the actual site of the bug.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Pick<State, 'error'> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-md overflow-auto bg-bg px-lg py-xl text-center">
        <p className="text-headline-lg text-text">Đã xảy ra lỗi</p>
        <p className="max-w-sm text-body-md text-muted">
          Ứng dụng gặp sự cố không mong muốn. Vui lòng tải lại trang; nếu vẫn lỗi, hãy báo lại kèm
          nội dung bên dưới.
        </p>
        <pre className="max-w-2xl overflow-auto rounded-lg bg-sunken p-sm text-left text-body-sm text-error">
          {error.message}
          {error.stack ? `\n\n${error.stack}` : ''}
          {componentStack ? `\n\nComponent stack:${componentStack}` : ''}
        </pre>
        <Button label="Tải lại trang" onPress={() => window.location.reload()} />
      </div>
    );
  }
}

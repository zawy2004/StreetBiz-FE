import { ApiError } from '@/core/api/problem';

/**
 * A request that could not reach the server at all. The app's API clients each have their own error
 * class (ApiError, SideApiError, ...); all of them mark "no response" the same way, with status 0
 * (ApiError also with code `network_error`), so this reads that rather than naming one class.
 */
function isUnreachable(error: unknown): boolean {
  if (error instanceof ApiError) return error.code === 'network_error';
  return error instanceof Error && (error as { status?: unknown }).status === 0;
}

/**
 * Whether a query is waiting on, or failed for lack of, a connection. With no signal TanStack
 * Query does not fail a request: it pauses it (`fetchStatus: 'paused'`). A request that did go
 * out and could not reach the server fails with a status-0 error. Both mean "show what was
 * saved", unlike a real answer from the server (even an error), which must be shown as it is.
 */
export function isNoSignal(query: {
  fetchStatus: string;
  isError: boolean;
  error: unknown;
}): boolean {
  return query.fetchStatus === 'paused' || (query.isError && isUnreachable(query.error));
}

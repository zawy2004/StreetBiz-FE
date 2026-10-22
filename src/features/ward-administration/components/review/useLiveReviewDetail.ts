import { useCallback, useEffect, useState } from 'react';

import { ApiError } from '@/core/api';
import { isLiveApi } from '@/core/config/env';

export type LiveReviewFailure = {
  /** The record is gone or outside the officer's ward: retrying will not help. */
  notFound: boolean;
  message: string;
};

export type LiveReviewDetail<T> = {
  data: T | null;
  /**
   * Live mode only: the record could not be loaded. A review screen must then show
   * this failure and nothing else -- never mock or default values in its place, and
   * never the decision buttons, since an officer would be deciding on a record they
   * have not seen.
   */
  failure: LiveReviewFailure | null;
  /** True from the first render until the record arrives or fails (live mode only). */
  loading: boolean;
  retry: () => void;
  /** Replace the record with the server's answer to a decision. */
  setData: (next: T) => void;
};

/**
 * Loads the record a ward review screen decides on. Outside live mode it stays idle and
 * the screen keeps its mock data.
 */
export function useLiveReviewDetail<T>(
  id: string | undefined,
  load: (id: string) => Promise<T>,
): LiveReviewDetail<T> {
  const enabled = isLiveApi && !!id;
  const [data, setData] = useState<T | null>(null);
  const [failure, setFailure] = useState<LiveReviewFailure | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || !id) return;
    let cancelled = false;
    setLoading(true);
    setFailure(null);
    load(id)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const notFound = err instanceof ApiError && (err.status === 404 || err.status === 403);
        setFailure({
          notFound,
          message:
            err instanceof Error && err.message
              ? err.message
              : 'Kiểm tra kết nối mạng rồi tải lại.',
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, id, load, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { data, failure, loading, retry, setData };
}

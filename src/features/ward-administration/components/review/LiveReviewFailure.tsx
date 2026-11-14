import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common';
import { ErrorState } from '@/components/feedback';
import { Screen } from '@/components/layout';
import type { LiveReviewFailure as Failure } from './useLiveReviewDetail';

/**
 * Shown in place of a review when its record did not load. It offers a retry (unless the
 * record is not there to retry for) and a way back, and nothing to decide on.
 */
export function LiveReviewFailure({
  failure,
  notFoundMessage,
  onRetry,
}: {
  failure: Failure;
  notFoundMessage: string;
  onRetry: () => void;
}) {
  const navigate = useNavigate();
  return (
    <Screen>
      <ErrorState
        message={failure.notFound ? notFoundMessage : failure.message}
        onRetry={failure.notFound ? undefined : onRetry}
      />
      <div className="flex justify-center">
        <Button label="Quay lại" variant="outline" fullWidth={false} onPress={() => navigate(-1)} />
      </div>
    </Screen>
  );
}

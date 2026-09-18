import { type ReactNode, useEffect, useState } from 'react';

import { Icon, Spinner } from '@/components/common';
import { vendorRegistrationApi, type ApiEvidence } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { colors } from '@/theme';
import { EVIDENCE_LABELS } from '../new-registration-store';

type Props = { evidence: ApiEvidence };

const SIZE = 96;

/**
 * One uploaded document. Evidence files are served only to their owner and to
 * reviewers, so the file is fetched with the bearer token and shown through an
 * object URL rather than linked directly.
 */
export function EvidencePreview({ evidence }: Props) {
  const label = EVIDENCE_LABELS[evidence.evidenceType] ?? evidence.evidenceType;
  const [objectUrl, setObjectUrl] = useState<string>();
  const [isPdf, setIsPdf] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isLiveApi) {
      setObjectUrl(evidence.fileUrl || undefined);
      return;
    }

    let url: string | undefined;
    let cancelled = false;
    vendorRegistrationApi
      .downloadEvidenceFile(evidence.fileUrl)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setIsPdf(blob.type === 'application/pdf');
        setObjectUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [evidence.fileUrl]);

  const frame = (content: ReactNode) => (
    <div className="flex flex-col items-center gap-2xs" style={{ width: SIZE }}>
      <div
        style={{ width: SIZE, height: SIZE }}
        className="flex items-center justify-center overflow-hidden rounded-sm border border-border bg-bg"
      >
        {content}
      </div>
      <span className="line-clamp-2 text-center text-body-sm text-muted">{label}</span>
    </div>
  );

  if (failed) {
    return frame(<Icon name="alert-circle-outline" size={24} color={colors.error} />);
  }
  if (!objectUrl) return frame(<Spinner size={18} color={colors.muted} />);
  if (isPdf) {
    return frame(
      <a href={objectUrl} target="_blank" rel="noreferrer" className="text-label text-primary">
        Mở PDF
      </a>,
    );
  }

  return frame(
    <a href={objectUrl} target="_blank" rel="noreferrer" className="h-full w-full">
      <img src={objectUrl} alt={label} className="h-full w-full object-cover" />
    </a>,
  );
}

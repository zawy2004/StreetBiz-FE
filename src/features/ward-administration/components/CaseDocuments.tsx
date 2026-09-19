import { useEffect, useState } from 'react';
import { Card } from '@/components/common';
import { evidenceLabels, wardApi, type WardDocument } from '../ward-api';

/**
 * REG-02 evidence attached to a registration case. Files sit behind the bearer
 * token (PRI-02), so each one is fetched as a blob instead of linked directly.
 */
export function CaseDocuments({ documents }: { documents: WardDocument[] }) {
  if (documents.length === 0) return null;
  return (
    <Card>
      <h2 className="text-headline-sm">Giấy tờ minh chứng</h2>
      <ul className="mt-sm grid gap-sm">
        {documents.map((document) => (
          <DocumentRow key={document.fileUrl} document={document} />
        ))}
      </ul>
    </Card>
  );
}

function DocumentRow({ document }: { document: WardDocument }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let active = true;
    wardApi
      .document(document.fileUrl)
      .then((value) => {
        objectUrl = value;
        if (active) setUrl(value);
        else URL.revokeObjectURL(value);
      })
      .catch((cause: Error) => active && setError(cause.message));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [document.fileUrl]);

  const label = evidenceLabels[document.evidenceType] ?? document.evidenceType;
  const isPdf = document.fileUrl.toLowerCase().endsWith('.pdf');

  return (
    <li>
      <p className="text-body-sm text-muted">{label}</p>
      {error && <p role="alert">{error}</p>}
      {!error && !url && <p className="text-body-sm text-muted">Đang tải…</p>}
      {url &&
        (isPdf ? (
          <a href={url} target="_blank" rel="noreferrer" className="text-indigo underline">
            Mở file PDF
          </a>
        ) : (
          <a href={url} target="_blank" rel="noreferrer">
            <img src={url} alt={label} className="max-h-64 rounded-sm border border-border" />
          </a>
        ))}
    </li>
  );
}

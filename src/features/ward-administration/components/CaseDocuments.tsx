import { useEffect, useState } from 'react';
import { Icon } from '@/components/common';
import { evidenceLabels, wardApi, type WardDocument } from '../ward-api';

/**
 * REG-02 evidence attached to a registration case. Files sit behind the bearer
 * token (PRI-02), so each one is fetched as a blob instead of linked directly.
 */
export function CaseDocuments({ documents }: { documents: WardDocument[] }) {
  if (documents.length === 0) return null;
  return (
    <section aria-labelledby="case-documents-title" className="flex flex-col gap-sm">
      <h2 id="case-documents-title" className="font-sign text-[18px] font-bold text-text">
        Giấy tờ minh chứng ({documents.length})
      </h2>
      <ul className="grid grid-cols-2 gap-sm md:grid-cols-3">
        {documents.map((document) => (
          <DocumentRow key={document.fileUrl} document={document} />
        ))}
      </ul>
    </section>
  );
}

function DocumentRow({ document }: { document: WardDocument }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Display only: the blob loaded but the browser could not draw it.
  const [broken, setBroken] = useState(false);

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
  const tile =
    'relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[14px] bg-sunken ring-1 ring-border';
  const fallback = (
    <span className="flex flex-col items-center gap-1 px-sm text-center text-body-sm text-muted">
      <Icon name="file-document-outline" size={30} color="currentColor" weight="duotone" />
      {label}
    </span>
  );

  return (
    <li className="flex min-w-0 flex-col gap-1.5">
      {error && <div className={tile}>{fallback}</div>}
      {!error && !url && (
        <div className={`${tile} sb-shimmer`}>
          <p className="relative text-body-sm text-muted">Đang tải…</p>
        </div>
      )}
      {url &&
        (isPdf ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className={`${tile} group flex-col gap-xs bg-[#FFF3E8] text-[#8A3200] transition-colors hover:bg-tint-primary dark:bg-[#2A2420] dark:text-[#FFB98A]`}
          >
            <Icon name="file-document-outline" size={36} color="currentColor" weight="duotone" />
            <span className="text-[15px] font-semibold underline-offset-4 group-hover:underline">
              Mở file PDF
            </span>
          </a>
        ) : (
          <a href={url} target="_blank" rel="noreferrer" className={`${tile} group`}>
            {broken ? (
              fallback
            ) : (
              <img
                src={url}
                alt={label}
                loading="lazy"
                onError={() => setBroken(true)}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            )}
          </a>
        ))}
      <p className="truncate text-body-sm font-medium text-text" title={label}>
        {label}
      </p>
      {error && (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      )}
    </li>
  );
}

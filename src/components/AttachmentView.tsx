import { useEffect, useState } from 'react';
import type { Attachment } from '../types';
import { resolveAttachmentUrl } from '../firebase/attachments';
import { Icon } from './Icon';

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Resolves an attachment's storage reference into an openable URL (see
 * `resolveAttachmentUrl`) once per mount, so every render site can just show
 * a loading state instead of re-implementing the fetch. */
function useResolvedAttachmentUrl(url: string) {
  const [resolved, setResolved] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setResolved(null);
    resolveAttachmentUrl(url)
      .then((u) => {
        if (!cancelled) setResolved(u);
      })
      .catch(() => {
        if (!cancelled) setResolved('');
      });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return resolved;
}

/** Compact "paperclip + filename" download link, for chat/message bubbles. */
export function AttachmentChip({ attachment, style }: { attachment: Attachment; style?: React.CSSProperties }) {
  const resolved = useResolvedAttachmentUrl(attachment.url);
  const failed = resolved === '';
  return (
    <a
      href={resolved || undefined}
      download={attachment.name}
      target={resolved && !resolved.startsWith('data:') ? '_blank' : undefined}
      rel="noopener noreferrer"
      onClick={(e) => {
        if (!resolved) e.preventDefault();
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11.5,
        color: failed ? 'var(--color-danger)' : 'inherit',
        textDecoration: failed ? 'none' : 'underline',
        cursor: resolved ? 'pointer' : 'default',
        opacity: resolved === null ? 0.6 : 1,
        ...style,
      }}
    >
      <Icon name="paperclip" size={11} /> {failed ? `${attachment.name} (nedostupné)` : attachment.name}
    </a>
  );
}

/** Ticket-detail-style attachment: image thumbnail, or a bordered chip with
 * file size, for anything else. */
export function AttachmentThumb({ attachment }: { attachment: Attachment }) {
  const resolved = useResolvedAttachmentUrl(attachment.url);
  const failed = resolved === '';
  const isImage = attachment.contentType.startsWith('image/');

  const openProps = {
    href: resolved || undefined,
    download: attachment.name,
    target: resolved && !resolved.startsWith('data:') ? '_blank' : undefined,
    rel: 'noopener noreferrer',
    onClick: (e: React.MouseEvent) => {
      if (!resolved) e.preventDefault();
    },
  } as const;

  if (isImage) {
    return (
      <a {...openProps}>
        {resolved ? (
          <img
            src={resolved}
            alt={attachment.name}
            style={{ maxWidth: 160, maxHeight: 120, borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: 160,
              height: 90,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-surface-2)',
              fontSize: 11,
              color: failed ? 'var(--color-danger)' : 'var(--color-text-faint)',
            }}
          >
            {failed ? 'Obrázok nedostupný' : 'Načítavam…'}
          </div>
        )}
      </a>
    );
  }

  return (
    <a
      {...openProps}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        padding: '6px 10px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        color: failed ? 'var(--color-danger)' : 'var(--color-text)',
        cursor: resolved ? 'pointer' : 'default',
      }}
    >
      <Icon name="paperclip" size={12} /> {attachment.name}{' '}
      <span style={{ color: 'var(--color-text-faint)' }}>{failed ? '(nedostupné)' : `(${formatFileSize(attachment.size)})`}</span>
    </a>
  );
}

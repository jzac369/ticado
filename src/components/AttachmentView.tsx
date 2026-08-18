import { useEffect, useRef, useState } from 'react';
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

/** Small "Otvoriť / Uložiť" popover shown on click, so a click on an
 * attachment doesn't just silently force-download it - the visitor picks
 * whether to view it or save it. */
function AttachmentMenu({ resolved, name, open, onClose }: { resolved: string; name: string; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, onClose]);

  if (!open) return null;

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '7px 12px',
    fontSize: 12,
    fontWeight: 600,
    textDecoration: 'none',
    color: 'var(--color-text)',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: 4,
        zIndex: 30,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <a href={resolved} target="_blank" rel="noopener noreferrer" onClick={onClose} style={itemStyle}>
        <Icon name="monitor" size={12} /> Otvoriť
      </a>
      <a href={resolved} download={name} onClick={onClose} style={{ ...itemStyle, borderTop: '1px solid var(--color-border)' }}>
        <Icon name="download" size={12} /> Uložiť
      </a>
    </div>
  );
}

/** Compact "paperclip + filename" chip, for chat/message bubbles. Click
 * opens an Otvoriť/Uložiť menu instead of triggering an action directly. */
export function AttachmentChip({ attachment, style }: { attachment: Attachment; style?: React.CSSProperties }) {
  const resolved = useResolvedAttachmentUrl(attachment.url);
  const failed = resolved === '';
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => resolved && setMenuOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 11.5,
          color: failed ? 'var(--color-danger)' : 'inherit',
          textDecoration: failed ? 'none' : 'underline',
          cursor: resolved ? 'pointer' : 'default',
          opacity: resolved === null ? 0.6 : 1,
          background: 'none',
          border: 'none',
          padding: 0,
          font: 'inherit',
          ...style,
        }}
      >
        <Icon name="paperclip" size={11} /> {failed ? `${attachment.name} (nedostupné)` : attachment.name}
      </button>
      {resolved && <AttachmentMenu resolved={resolved} name={attachment.name} open={menuOpen} onClose={() => setMenuOpen(false)} />}
    </div>
  );
}

/** Ticket-detail-style attachment: image thumbnail, or a bordered chip with
 * file size, for anything else. Click opens an Otvoriť/Uložiť menu. */
export function AttachmentThumb({ attachment }: { attachment: Attachment }) {
  const resolved = useResolvedAttachmentUrl(attachment.url);
  const failed = resolved === '';
  const isImage = attachment.contentType.startsWith('image/');
  const [menuOpen, setMenuOpen] = useState(false);

  const menu = resolved && <AttachmentMenu resolved={resolved} name={attachment.name} open={menuOpen} onClose={() => setMenuOpen(false)} />;

  if (isImage) {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          type="button"
          onClick={() => resolved && setMenuOpen((v) => !v)}
          style={{ display: 'block', padding: 0, border: 'none', background: 'none', cursor: resolved ? 'pointer' : 'default' }}
        >
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
        </button>
        {menu}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => resolved && setMenuOpen((v) => !v)}
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
      </button>
      {menu}
    </div>
  );
}

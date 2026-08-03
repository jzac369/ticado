import { useEffect, useState } from 'react';
import { subscribeAnnouncement, type Announcement } from '../firebase/announcement';

const TONE_COLORS: Record<Announcement['tone'], { fg: string; bg: string; border: string }> = {
  info: { fg: 'var(--color-info)', bg: 'var(--color-info-bg)', border: 'var(--color-info)' },
  warning: { fg: 'var(--color-warning)', bg: 'var(--color-warning-bg)', border: 'var(--color-warning)' },
  danger: { fg: 'var(--color-danger)', bg: 'var(--color-danger-bg)', border: 'var(--color-danger)' },
};

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => subscribeAnnouncement(setAnnouncement), []);

  if (!announcement || !announcement.enabled || !announcement.message.trim()) return null;
  const colors = TONE_COLORS[announcement.tone];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.fg,
        fontSize: 13.5,
        fontWeight: 600,
        marginBottom: 20,
      }}
    >
      <span style={{ fontSize: 17 }}>📢</span>
      <span>{announcement.message}</span>
    </div>
  );
}

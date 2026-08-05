import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { IdleGuard } from '../components/IdleGuard';
import { NotificationWatcher } from '../components/NotificationWatcher';
import { CommandPalette } from '../components/CommandPalette';
import { unlockAudioOnFirstInteraction } from '../utils/chatSound';

export function AppLayout() {
  useEffect(() => unlockAudioOnFirstInteraction(), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <IdleGuard />
      <NotificationWatcher />
      <CommandPalette />
      <TopNav />
      <main style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        <Outlet />
      </main>
    </div>
  );
}

import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { IdleGuard } from '../components/IdleGuard';
import { NotificationWatcher } from '../components/NotificationWatcher';
import { CommandPalette } from '../components/CommandPalette';
import { AlertTicker } from '../components/AlertTicker';

export function AppLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <IdleGuard />
      <NotificationWatcher />
      <CommandPalette />
      <TopNav />
      <div className="no-print" style={{ padding: '10px 20px 0' }}>
        <AlertTicker />
      </div>
      <main style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        <Outlet />
      </main>
    </div>
  );
}

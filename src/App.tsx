import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AgentOnlyRoute } from './components/AgentOnlyRoute';
import { AppLayout } from './layout/AppLayout';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { TicketsListPage } from './pages/TicketsList';
import { TicketDetailPage } from './pages/TicketDetail';
import { NewTicketPage } from './pages/NewTicket';
import { CustomersPage } from './pages/Customers';
import { CustomerDetailPage } from './pages/CustomerDetail';
import { NewColleaguePage } from './pages/NewColleague';
import { AgentsPage } from './pages/Agents';
import { PublicNewTicketPage } from './pages/PublicNewTicket';
import { LegendPage } from './pages/Legend';
import { TemplatesPage } from './pages/Templates';
import { AnnouncementSettingsPage } from './pages/AnnouncementSettings';
import { AnalyticsPage } from './pages/Analytics';
import { MyTicketsPage } from './pages/MyTickets';
import { TodayTicketsPage } from './pages/TodayTickets';
import { UnassignedTicketsPage } from './pages/UnassignedTickets';
import { SettingsHubPage } from './pages/SettingsHub';
import { ProfilePage } from './pages/Profile';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/support" element={<PublicNewTicketPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route
              path="tickets"
              element={
                <AgentOnlyRoute>
                  <TicketsListPage />
                </AgentOnlyRoute>
              }
            />
            <Route path="tickets/new" element={<NewTicketPage />} />
            <Route path="tickets/:id" element={<TicketDetailPage />} />
            <Route
              path="customers"
              element={
                <AgentOnlyRoute>
                  <CustomersPage />
                </AgentOnlyRoute>
              }
            />
            <Route
              path="customers/:id"
              element={
                <AgentOnlyRoute>
                  <CustomerDetailPage />
                </AgentOnlyRoute>
              }
            />
            <Route
              path="customers/:id/colleagues/new"
              element={
                <AgentOnlyRoute>
                  <NewColleaguePage />
                </AgentOnlyRoute>
              }
            />
            <Route
              path="agents"
              element={
                <AgentOnlyRoute>
                  <AgentsPage />
                </AgentOnlyRoute>
              }
            />
            <Route
              path="templates"
              element={
                <AgentOnlyRoute>
                  <TemplatesPage />
                </AgentOnlyRoute>
              }
            />
            <Route
              path="announcement"
              element={
                <AgentOnlyRoute>
                  <AnnouncementSettingsPage />
                </AgentOnlyRoute>
              }
            />
            <Route
              path="analytics"
              element={
                <AgentOnlyRoute>
                  <AnalyticsPage />
                </AgentOnlyRoute>
              }
            />
            <Route path="legend" element={<LegendPage />} />
            <Route path="my-tickets" element={<MyTicketsPage />} />
            <Route path="today" element={<TodayTicketsPage />} />
            <Route
              path="unassigned"
              element={
                <AgentOnlyRoute>
                  <UnassignedTicketsPage />
                </AgentOnlyRoute>
              }
            />
            <Route
              path="settings-hub"
              element={
                <AgentOnlyRoute>
                  <SettingsHubPage />
                </AgentOnlyRoute>
              }
            />
            <Route
              path="profile"
              element={
                <AgentOnlyRoute>
                  <ProfilePage />
                </AgentOnlyRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

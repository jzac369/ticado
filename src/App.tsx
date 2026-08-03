import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
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
            <Route path="tickets" element={<TicketsListPage />} />
            <Route path="tickets/new" element={<NewTicketPage />} />
            <Route path="tickets/:id" element={<TicketDetailPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route path="customers/:id/colleagues/new" element={<NewColleaguePage />} />
            <Route path="agents" element={<AgentsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

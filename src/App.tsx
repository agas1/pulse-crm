import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import ContactDetail from './pages/ContactDetail';
import Pipeline from './pages/Pipeline';
import Activities from './pages/Activities';
import Emails from './pages/Emails';
import Channels from './pages/Channels';
import Tasks from './pages/Tasks';
import Automations from './pages/Automations';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Pricing from './pages/Pricing';
import LandingPage from './pages/LandingPage';
import Leads from './pages/Leads';
import Organizations from './pages/Organizations';
import Cadences from './pages/Cadences';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <DataProvider>
          <ErrorBoundary>
          <Routes>
            <Route path="/welcome" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/contacts/:id" element={<ContactDetail />} />
              <Route path="/organizations" element={<Organizations />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/emails" element={<Emails />} />
              <Route path="/channels" element={<Channels />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/automations" element={<Automations />} />
              <Route path="/cadences" element={<Cadences />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/pricing" element={<Pricing />} />
            </Route>
          </Routes>
          </ErrorBoundary>
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

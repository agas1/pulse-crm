import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canAccessRoute, effectiveRole } from '../config/permissions';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!canAccessRoute(effectiveRole(user), location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

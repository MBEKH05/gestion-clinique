import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHomeRoute } from '../utils/authRoutes';

export default function ProtectedRoute({ children, adminOnly = false, requireSpace = null, allowedRoles = null }) {
  const { isAuthenticated, isSuperAdmin, space, labRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireSpace && space !== requireSpace) {
    return <Navigate to={getHomeRoute(space, labRole)} replace />;
  }

  if (adminOnly && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(labRole)) {
    return <Navigate to={getHomeRoute(space, labRole)} replace />;
  }

  return children;
}

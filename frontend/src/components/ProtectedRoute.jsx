import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHomeRoute } from '../utils/authRoutes';

export default function ProtectedRoute({ children, adminOnly = false, requireSpace = null, allowedRoles = null }) {
  const { isAuthenticated, isSuperAdmin, space, labRole, loading } = useAuth();
  const location = useLocation();

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
    // On garde la page demandee (ex. dossier ouvert par un QR code) pour y revenir apres la connexion.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
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

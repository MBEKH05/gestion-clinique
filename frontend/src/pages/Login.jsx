import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import InstallPrompt from '../components/InstallPrompt';
import { getHomeRoute } from '../utils/authRoutes';

export default function Login() {
  const { login, isAuthenticated, loading, space, labRole } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to={getHomeRoute(space, labRole)} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await login(username, password);
      navigate(getHomeRoute(result.space, result.user?.role));
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || "Nom d'utilisateur ou mot de passe incorrect.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-shell-v3">
      <div className="login-v3-ring"></div>

      <div className="login-v3-card">
        <div className="login-v3-logo">
          <img
            src="/NABY.jpg"
            alt="Clinique Sope Naby"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
        <h4 className="login-v3-title">CLINIQUE SOPE NABY</h4>
        <p className="login-v3-subtitle">Plateforme de gestion clinique</p>

        {error && (
          <div className="alert alert-danger py-2 small d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-circle-fill"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Nom d'utilisateur</label>
            <div className="login-input">
              <i className="bi bi-person"></i>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nom d'utilisateur"
                required
                autoFocus
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="form-label">Mot de passe</label>
            <div className="login-input">
              <i className="bi bi-lock"></i>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                required
              />
              <button
                type="button"
                className="login-input-toggle"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-100 py-2" disabled={submitting}>
            {submitting ? (
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
            ) : (
              <i className="bi bi-box-arrow-in-right me-2"></i>
            )}
            Se connecter
          </button>
        </form>

        <div className="login-form-footer">
          <i className="bi bi-shield-check"></i>
          Connexion securisee
        </div>
      </div>

      <InstallPrompt />
    </div>
  );
}

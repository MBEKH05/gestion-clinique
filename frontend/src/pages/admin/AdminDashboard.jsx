import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { platformDashboardAPI } from '../../api/adminEndpoints';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformDashboardAPI.get().then(({ data }) => setStats(data)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  }

  const fact = stats?.facturation || {};
  const lab = stats?.laboratoire || {};

  return (
    <div>
      <div className="hero-panel p-4 p-md-5 mb-4">
        <div className="text-white-50 mb-1">Bonjour,</div>
        <h2 className="text-white mb-1">{user?.name || user?.username} 👋</h2>
        <p className="text-white-50 mb-0">Vue d'ensemble combinee de la plateforme.</p>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0"><i className="bi bi-receipt-cutoff me-2"></i>Facturation</h5>
            <Link to="/admin/comptes-facturation" className="btn btn-sm btn-outline-primary">Comptes</Link>
          </div>
          <div className="row g-3">
            <div className="col-6">
              <div className="stat-card p-3 h-100">
                <div className="text-muted small">Total devis</div>
                <div className="stat-value">{fact.totalDevis ?? 0}</div>
                <div className="text-muted small mt-1">{fact.devisMois ?? 0} ce mois-ci</div>
              </div>
            </div>
            <div className="col-6">
              <div className="stat-card p-3 h-100">
                <div className="text-muted small">Patients</div>
                <div className="stat-value">{fact.totalPatients ?? 0}</div>
              </div>
            </div>
            <div className="col-6">
              <div className="stat-card p-3 h-100">
                <div className="text-muted small">Utilisateurs</div>
                <div className="stat-value">{fact.totalUtilisateurs ?? 0}</div>
              </div>
            </div>
            <div className="col-6">
              <div className="stat-card p-3 h-100">
                <div className="text-muted small">Montant du mois</div>
                <div className="stat-value fs-5">{Math.round(fact.montantMois ?? 0).toLocaleString('fr-FR')}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0"><i className="bi bi-droplet-half me-2"></i>Laboratoire</h5>
            <Link to="/admin/comptes-labo" className="btn btn-sm btn-outline-primary">Comptes</Link>
          </div>
          <div className="row g-3">
            <div className="col-6">
              <div className="stat-card p-3 h-100">
                <div className="text-muted small">Total dossiers</div>
                <div className="stat-value">{lab.totalDossiers ?? 0}</div>
                <div className="text-muted small mt-1">{lab.dossiersMois ?? 0} ce mois-ci</div>
              </div>
            </div>
            <div className="col-6">
              <div className="stat-card p-3 h-100">
                <div className="text-muted small">Utilisateurs</div>
                <div className="stat-value">{lab.totalUtilisateurs ?? 0}</div>
              </div>
            </div>
            <div className="col-6">
              <div className="stat-card p-3 h-100">
                <div className="text-muted small">En attente</div>
                <div className="stat-value">{lab.enAttente ?? 0}</div>
              </div>
            </div>
            <div className="col-6">
              <div className="stat-card p-3 h-100">
                <div className="text-muted small">Archives</div>
                <div className="stat-value">{lab.archive ?? 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

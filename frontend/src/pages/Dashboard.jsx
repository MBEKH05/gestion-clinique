import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { formatMontant } from '../utils/devisUtils';

export default function Dashboard() {
  const { user, isSuperAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    dashboardAPI
      .getStats()
      .then(({ data }) => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary"></div>
      </div>
    );
  }

  const cards = [
    { label: 'Total Analyses', value: stats?.totalAnalyses, icon: 'bi-clipboard2-pulse', grad: 'grad-primary' },
    { label: 'Total IPM', value: stats?.totalIPM, icon: 'bi-building', grad: 'grad-cyan' },
    { label: 'Total Assurances', value: stats?.totalAssurances, icon: 'bi-shield-check', grad: 'grad-emerald' },
    { label: 'Total Patients', value: stats?.totalPatients, icon: 'bi-people', grad: 'grad-amber' },
  ];

  const heure = now.getHours();
  const salutation = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon apres-midi' : 'Bonsoir';
  const heureStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="hero-panel p-4 p-md-5 mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 position-relative" style={{ zIndex: 1 }}>
          <div>
            <div className="small text-white-50 mb-1">{salutation},</div>
            <h2 className="text-white mb-1">{user?.username} 👋</h2>
            <p className="text-white-50 mb-0">Voici un apercu de l'activite de la clinique aujourd'hui.</p>
          </div>
          <div className="d-flex flex-column align-items-md-end gap-2">
            <div className="text-end">
              <div className="text-white fw-bold" style={{ fontSize: '1.6rem', fontVariantNumeric: 'tabular-nums' }}>
                {heureStr}
              </div>
              <div className="small text-white-50 text-capitalize">{dateStr}</div>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <Link to="/devis/creer" className="btn btn-light fw-semibold">
                <i className="bi bi-file-earmark-plus me-2"></i>Creer un devis
              </Link>
              <Link to="/patients/ajouter" className="btn btn-outline-light">
                <i className="bi bi-person-plus me-2"></i>Nouveau patient
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {cards.map((c) => (
          <div className="col-6 col-md-3" key={c.label}>
            <div className="stat-card p-3 h-100 d-flex align-items-center gap-3">
              <div className={`stat-icon ${c.grad}`}>
                <i className={`bi ${c.icon} fs-5`}></i>
              </div>
              <div>
                <div className="text-muted small">{c.label}</div>
                <div className="stat-value">{c.value ?? 0}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="stat-card p-4 h-100">
            <div className="d-flex align-items-center gap-2 text-muted small mb-2">
              <i className="bi bi-file-earmark-text"></i> Total Devis
            </div>
            <div className="stat-value">{stats?.totalDevis ?? 0}</div>
            <div className="text-muted small mt-1">{stats?.devisMois ?? 0} ce mois-ci</div>
          </div>
        </div>
        {isSuperAdmin && (
          <div className="col-md-4">
            <div className="stat-card p-4 h-100">
              <div className="d-flex align-items-center gap-2 text-muted small mb-2">
                <i className="bi bi-cash-coin"></i> Montant du mois
              </div>
              <div className="stat-value">{formatMontant(stats?.totalMontantMois)} <span className="fs-6 fw-normal text-muted">FCFA</span></div>
            </div>
          </div>
        )}
        <div className="col-md-4">
          <div className="stat-card p-4 h-100">
            <div className="d-flex align-items-center gap-2 text-muted small mb-2">
              <i className="bi bi-calendar-check"></i> Aujourd'hui
            </div>
            <div className="stat-value">{stats?.devisAujourdhui ?? 0} <span className="fs-6 fw-normal text-muted">devis</span></div>
            <div className="text-muted small mt-1">{formatMontant(stats?.montantAujourdhui)} FCFA</div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body p-4">
          <h5 className="card-title mb-3">Actions rapides</h5>
          <div className="d-flex gap-2 flex-wrap">
            <Link to="/devis/creer" className="btn btn-primary">
              <i className="bi bi-file-earmark-plus me-2"></i>Creer un devis
            </Link>
            <Link to="/devis/mensuel" className="btn btn-outline-primary">
              <i className="bi bi-calendar-month me-2"></i>Facture mensuelle
            </Link>
            <Link to="/patients/ajouter" className="btn btn-outline-primary">
              <i className="bi bi-person-plus me-2"></i>Ajouter un patient
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

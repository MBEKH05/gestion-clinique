import { Link } from 'react-router-dom';

export default function DevisList() {
  return (
    <div className="text-center py-5">
      <i className="bi bi-file-earmark-text display-1 text-primary"></i>
      <h2 className="mt-3">Devis</h2>
      <p className="text-muted">Les devis sont consultables dans l'Historique.</p>
      <div className="d-flex justify-content-center gap-2 mt-4">
        <Link to="/devis/creer" className="btn btn-primary">
          <i className="bi bi-plus-lg me-2"></i>Creer un devis
        </Link>
        <Link to="/historique" className="btn btn-outline-primary">
          Voir l'historique des devis
        </Link>
      </div>
    </div>
  );
}

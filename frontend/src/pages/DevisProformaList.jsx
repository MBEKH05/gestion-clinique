import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { devisAPI } from '../api/endpoints';
import { convertDevisFromAPI } from '../utils/apiConverters';
import { getDevisNumero, formatMontant } from '../utils/devisUtils';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export default function DevisProformaList() {
  const { isSuperAdmin } = useAuth();
  const { deleteDevis } = useData();
  const [search, setSearch] = useState('');
  const [devis, setDevis] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    devisAPI
      .getProforma({ page_size: 5000, ordering: '-date_creation', search })
      .then(({ data }) => setDevis(data.results.map(convertDevisFromAPI)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette demande de devis ?')) return;
    await deleteDevis(id);
    load();
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Demandes Devis (Proforma)</h2>
        <Link to="/devis/proforma/creer" className="btn btn-primary">
          <i className="bi bi-plus-lg me-2"></i>Nouvelle Demande
        </Link>
      </div>

      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Rechercher par patient, matricule ou numero..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover bg-white shadow-sm">
            <thead>
              <tr>
                <th>N&deg;</th>
                <th>Patient</th>
                <th>Date</th>
                <th>Total (FCFA)</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {devis.map((d) => (
                <tr key={d.id}>
                  <td>#PROFORMA-{getDevisNumero(d)}</td>
                  <td>
                    {d.patientNom}
                    {d.patientMatricule && <div className="text-muted small">{d.patientMatricule}</div>}
                  </td>
                  <td>{d.dateCreation ? new Date(d.dateCreation).toLocaleDateString('fr-FR') : '-'}</td>
                  <td>
                    <span className="badge bg-success">{formatMontant(d.total)}</span>
                  </td>
                  <td>
                    <span className={`badge ${d.statutPaiement === 'REGLE' ? 'bg-success' : 'bg-danger'}`}>
                      {d.statutPaiement === 'REGLE' ? 'Regle' : 'Non regle'}
                    </span>
                  </td>
                  <td>
                    <Link to={`/devis/${d.id}`} className="btn btn-sm btn-outline-secondary me-2">
                      Voir
                    </Link>
                    <Link to={`/devis/proforma/${d.id}/modifier`} className="btn btn-sm btn-outline-primary me-2">
                      Modifier
                    </Link>
                    {isSuperAdmin && (
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(d.id)}>
                        Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {devis.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    Aucune demande de devis.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

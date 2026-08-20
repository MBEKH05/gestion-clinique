import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { devisAPI } from '../api/endpoints';
import { convertDevisFromAPI } from '../utils/apiConverters';
import { getDevisNumero, formatMontant } from '../utils/devisUtils';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const PAGE_SIZE = 15;

const STATUT_LABELS = {
  NON_REGLE: { label: 'Non regle', className: 'badge-danger' },
  PARTIELLEMENT_REGLE: { label: 'Partiel', className: 'badge-warning' },
  REGLE: { label: 'Regle', className: 'badge-success' },
};

export default function Historique() {
  const { isSuperAdmin } = useAuth();
  const { deleteDevis } = useData();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [devis, setDevis] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    devisAPI
      .getAll({ page, page_size: PAGE_SIZE, search: debounced, ordering: '-date_creation' })
      .then(({ data }) => {
        setDevis(data.results.map(convertDevisFromAPI));
        setCount(data.count);
      })
      .finally(() => setLoading(false));
  }, [page, debounced]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce devis ?')) return;
    await deleteDevis(id);
    setDevis((prev) => prev.filter((d) => d.id !== id));
    setCount((prev) => prev - 1);
  };

  const pageNumbers = () => {
    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    if (start > 1) pages.push(1, '...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages) pages.push('...', totalPages);
    return pages;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">
          Historique des Devis <span className="badge bg-secondary">{count}</span>
        </h2>
        <Link to="/devis/creer" className="btn btn-primary">
          <i className="bi bi-plus-lg me-2"></i>Creer un devis
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
        <>
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
                {devis.map((d) => {
                  const statut = STATUT_LABELS[d.statutPaiement] || STATUT_LABELS.NON_REGLE;
                  return (
                    <tr key={d.id}>
                      <td>#{getDevisNumero(d)}</td>
                      <td>
                        {d.patientNom || 'Patient supprime'}
                        {d.patientMatricule && <div className="text-muted small">{d.patientMatricule}</div>}
                      </td>
                      <td>{d.dateCreation ? new Date(d.dateCreation).toLocaleDateString('fr-FR') : '-'}</td>
                      <td>
                        <span className="badge bg-success">{formatMontant(d.total)}</span>
                      </td>
                      <td>
                        <span className={`badge ${statut.className}`}>{statut.label}</span>
                      </td>
                      <td>
                        <Link to={`/devis/${d.id}`} className="btn btn-sm btn-outline-secondary me-2">
                          Voir
                        </Link>
                        <Link to={`/devis/${d.id}/modifier`} className="btn btn-sm btn-outline-primary me-2">
                          Modifier
                        </Link>
                        {isSuperAdmin && (
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(d.id)}>
                            Supprimer
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {devis.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      Aucun devis trouve.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center">
            <span className="text-muted small">
              Page {page} / {totalPages} &mdash; {count} devis
            </span>
            <div className="d-flex gap-1">
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Precedent
              </button>
              {pageNumbers().map((p, idx) =>
                p === '...' ? (
                  <span key={`e${idx}`} className="btn btn-sm disabled">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

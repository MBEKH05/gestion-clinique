import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { platformLabDossiersAPI } from '../../api/adminEndpoints';
import { statutBadge } from '../../utils/labDossierUtils';

const PAGE_SIZE = 15;

const ALL_STATUTS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'VALIDE_MEDECIN', label: 'Valide medecin' },
  { value: 'REFUSE', label: 'Refuse' },
  { value: 'VALIDE_FINAL', label: 'Valide final' },
  { value: 'ARCHIVE', label: 'Archive' },
];

export default function AdminLabDossiersList() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [statut, setStatut] = useState('');
  const [page, setPage] = useState(1);
  const [dossiers, setDossiers] = useState([]);
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
    platformLabDossiersAPI
      .getAll({ page, page_size: PAGE_SIZE, search: debounced, statut })
      .then(({ data }) => {
        setDossiers(data.results);
        setCount(data.count);
      })
      .finally(() => setLoading(false));
  }, [page, debounced, statut]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div>
      <h2 className="mb-3">
        Dossiers Laboratoire <span className="badge bg-secondary">{count}</span>
      </h2>

      <div className="row g-2 mb-3">
        <div className="col-md-8">
          <input
            type="text"
            className="form-control"
            placeholder="Rechercher par patient ou numero..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <select className="form-select" value={statut} onChange={(e) => { setStatut(e.target.value); setPage(1); }}>
            {ALL_STATUTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
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
                  <th>N&deg; client</th>
                  <th>Patient</th>
                  <th>Statut</th>
                  <th>Cree le</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dossiers.map((d) => {
                  const badge = statutBadge(d.statut);
                  return (
                    <tr key={d.id}>
                      <td>{d.numero_client || '-'}</td>
                      <td>{d.patient_nom || '-'}</td>
                      <td>
                        <span className={`badge ${badge.className}`}>{badge.label}</span>
                      </td>
                      <td>{d.created_at ? new Date(d.created_at).toLocaleDateString('fr-FR') : '-'}</td>
                      <td>
                        <Link to={`/admin/dossiers-labo/${d.id}`} className="btn btn-sm btn-outline-secondary">
                          Voir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {dossiers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      Aucun dossier trouve.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center">
            <span className="text-muted small">
              Page {page} / {totalPages} &mdash; {count} dossiers
            </span>
            <div className="d-flex gap-1">
              <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Precedent
              </button>
              <button className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Suivant
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

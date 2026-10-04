import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { patientsAPI } from '../api/endpoints';
import { convertPatientFromAPI } from '../utils/apiConverters';
import { useData } from '../context/DataContext';

const PAGE_SIZE = 20;

export default function PatientsList() {
  const { ipms, assurances, deletePatient } = useData();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [patients, setPatients] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    patientsAPI
      .search(debounced, page, PAGE_SIZE)
      .then(({ data }) => {
        setPatients(data.results.map(convertPatientFromAPI));
        setCount(data.count);
      })
      .finally(() => setLoading(false));
  }, [page, debounced]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const ipmMap = useMemo(() => new Map(ipms.map((i) => [i.id, i.nom])), [ipms]);
  const assuranceMap = useMemo(() => new Map(assurances.map((a) => [a.id, a.nom])), [assurances]);

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce patient ?')) return;
    await deletePatient(id);
    setPatients((prev) => prev.filter((p) => p.id !== id));
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
          Patients <span className="badge bg-secondary">{count}</span>
        </h2>
        <Link to="/patients/ajouter" className="btn btn-primary">
          <i className="bi bi-plus-lg me-2"></i>Ajouter un patient
        </Link>
      </div>

      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Rechercher par nom ou matricule..."
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
                  <th>Nom complet</th>
                  <th>Matricule</th>
                  <th>Type</th>
                  <th>IPM / Assurance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nomComplet}</td>
                    <td>{p.matricule}</td>
                    <td>
                      <span className="badge bg-info text-dark">{p.typePriseEnCharge}</span>
                    </td>
                    <td>
                      {p.typePriseEnCharge === 'IPM' ? ipmMap.get(p.ipmId) || '-' : assuranceMap.get(p.assuranceId) || '-'}
                    </td>
                    <td>
                      <Link to={`/patients/${p.id}/modifier`} className="btn btn-sm btn-outline-primary me-2">
                        Modifier
                      </Link>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(p.id)}>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
                {patients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      Aucun patient trouve.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center">
            <span className="text-muted small">
              Page {page} / {totalPages} &mdash; {count} patients
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

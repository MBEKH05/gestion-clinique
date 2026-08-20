import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';

export default function IPMList() {
  const { ipms, deleteIPM } = useData();
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => ipms.filter((i) => i.nom.toLowerCase().includes(search.toLowerCase())),
    [ipms, search]
  );

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette IPM ?')) return;
    await deleteIPM(id);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">IPM</h2>
        <Link to="/ipm/ajouter" className="btn btn-primary">
          <i className="bi bi-plus-lg me-2"></i>Ajouter une IPM
        </Link>
      </div>

      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-responsive">
        <table className="table table-hover bg-white shadow-sm">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Date de creation</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id}>
                <td>{i.nom}</td>
                <td>{i.created_at ? new Date(i.created_at).toLocaleDateString('fr-FR') : '-'}</td>
                <td>
                  <span className={`badge ${i.actif ? 'bg-success' : 'bg-danger'}`}>
                    {i.actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td>
                  <Link to={`/ipm/${i.id}/tarifs`} className="btn btn-sm btn-outline-info me-2">
                    Tarifs
                  </Link>
                  <Link to={`/ipm/${i.id}/modifier`} className="btn btn-sm btn-outline-primary me-2">
                    Modifier
                  </Link>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(i.id)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

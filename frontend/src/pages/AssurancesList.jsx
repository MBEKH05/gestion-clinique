import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';

export default function AssurancesList() {
  const { assurances, deleteAssurance } = useData();
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => assurances.filter((a) => a.nom.toLowerCase().includes(search.toLowerCase())),
    [assurances, search]
  );

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette assurance ?')) return;
    await deleteAssurance(id);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Assurances</h2>
        <Link to="/assurances/ajouter" className="btn btn-primary">
          <i className="bi bi-plus-lg me-2"></i>Ajouter une assurance
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
            {filtered.map((a) => (
              <tr key={a.id}>
                <td>{a.nom}</td>
                <td>{a.created_at ? new Date(a.created_at).toLocaleDateString('fr-FR') : '-'}</td>
                <td>
                  <span className={`badge ${a.actif ? 'bg-success' : 'bg-danger'}`}>
                    {a.actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td>
                  <Link to={`/assurances/${a.id}/tarifs`} className="btn btn-sm btn-outline-info me-2">
                    Tarifs
                  </Link>
                  <Link to={`/assurances/${a.id}/modifier`} className="btn btn-sm btn-outline-primary me-2">
                    Modifier
                  </Link>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(a.id)}>
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

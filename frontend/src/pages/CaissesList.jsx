import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';

export default function CaissesList() {
  const { caisses, deleteCaisse } = useData();
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => caisses.filter((a) => a.nom.toLowerCase().includes(search.toLowerCase())),
    [caisses, search]
  );

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette caisse ?')) return;
    await deleteCaisse(id);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Caisses</h2>
        <Link to="/caisses/ajouter" className="btn btn-primary">
          <i className="bi bi-plus-lg me-2"></i>Ajouter une caisse
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
                  <Link to={`/caisses/${a.id}/tarifs`} className="btn btn-sm btn-outline-info me-2">
                    Tarifs
                  </Link>
                  <Link to={`/caisses/${a.id}/modifier`} className="btn btn-sm btn-outline-primary me-2">
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

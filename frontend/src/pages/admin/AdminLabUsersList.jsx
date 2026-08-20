import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { platformLabUsersAPI } from '../../api/adminEndpoints';

const ROLE_LABELS = {
  technicien: 'Technicien',
  medecin: 'Medecin',
  secretaire: 'Secretaire',
  administrateur: 'Administrateur',
};

export default function AdminLabUsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    platformLabUsersAPI.getAll().then(({ data }) => setUsers(data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggleActive = async (user) => {
    if (user.is_active) {
      await platformLabUsersAPI.deactivate(user.id);
    } else {
      await platformLabUsersAPI.activate(user.id);
    }
    load();
  };

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">
          Comptes Laboratoire <span className="badge bg-secondary">{users.length}</span>
        </h2>
        <Link to="/admin/comptes-labo/ajouter" className="btn btn-primary">
          <i className="bi bi-plus-lg me-2"></i>Ajouter un compte
        </Link>
      </div>

      <div className="table-responsive">
        <table className="table table-hover bg-white shadow-sm">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Identifiant</th>
              <th>Role</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.username}</td>
                <td>
                  <span className="badge bg-info text-dark">{ROLE_LABELS[u.role] || u.role}</span>
                </td>
                <td>
                  <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {u.is_active ? 'Actif' : 'Desactive'}
                  </span>
                </td>
                <td className="d-flex gap-2">
                  <Link to={`/admin/comptes-labo/${u.id}/modifier`} className="btn btn-sm btn-outline-primary">
                    Modifier
                  </Link>
                  <button
                    className={`btn btn-sm ${u.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                    onClick={() => toggleActive(u)}
                  >
                    {u.is_active ? 'Desactiver' : 'Activer'}
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

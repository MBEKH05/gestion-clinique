import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { platformUsersAPI } from '../../api/adminEndpoints';

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const load = () => {
    setLoading(true);
    platformUsersAPI.getAll().then(({ data }) => setUsers(data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggleActive = async (user) => {
    if (user.is_active) {
      await platformUsersAPI.deactivate(user.id);
    } else {
      await platformUsersAPI.activate(user.id);
    }
    load();
  };

  // Suppression : une seconde confirmation est demandee si le compte a enregistre
  // des patients / devis / rendez-vous (ils sont conserves, sans attribution).
  const supprimer = async (user) => {
    if (!window.confirm(`Supprimer definitivement le compte ${user.username} (${user.name}) ?`)) return;
    setMessage(null);
    try {
      await platformUsersAPI.remove(user.id);
    } catch (err) {
      const d = err.response?.data;
      if (err.response?.status === 409 && d?.confirmation_requise) {
        if (!window.confirm(`${d.detail}

Confirmer la suppression du compte ${user.username} ?`)) return;
        try {
          await platformUsersAPI.remove(user.id, true);
        } catch (err2) {
          setMessage({ type: 'danger', text: err2.response?.data?.detail || 'Suppression impossible.' });
          return;
        }
      } else {
        setMessage({ type: 'danger', text: d?.detail || 'Suppression impossible.' });
        return;
      }
    }
    setMessage({ type: 'success', text: `Compte ${user.username} supprime.` });
    load();
  };

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">
          Comptes Facturation <span className="badge bg-secondary">{users.length}</span>
        </h2>
        <Link to="/admin/comptes-facturation/ajouter" className="btn btn-primary">
          <i className="bi bi-plus-lg me-2"></i>Ajouter un compte
        </Link>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

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
                  <span className="badge bg-info text-dark">{u.is_superuser ? 'Super Admin' : 'Manager'}</span>
                </td>
                <td>
                  <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {u.is_active ? 'Actif' : 'Desactive'}
                  </span>
                </td>
                <td className="d-flex gap-2">
                  <Link to={`/admin/comptes-facturation/${u.id}/modifier`} className="btn btn-sm btn-outline-primary">
                    Modifier
                  </Link>
                  <button
                    className={`btn btn-sm ${u.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                    onClick={() => toggleActive(u)}
                  >
                    {u.is_active ? 'Desactiver' : 'Activer'}
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => supprimer(u)} title="Supprimer le compte">
                    <i className="bi bi-trash"></i>
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

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { platformLabUsersAPI } from '../../api/adminEndpoints';

const ROLES = [
  { value: 'technicien', label: 'Technicien' },
  { value: 'medecin', label: 'Medecin' },
  { value: 'secretaire', label: 'Secretaire' },
  { value: 'administrateur', label: 'Administrateur' },
];

export default function AdminLabUserForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('technicien');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    platformLabUsersAPI.getAll().then(({ data }) => {
      const existing = data.find((u) => u.id === id);
      if (existing) {
        setUsername(existing.username);
        setName(existing.name);
        setRole(existing.role);
      }
      setLoading(false);
    });
  }, [isEdit, id]);

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        const payload = { name, role };
        if (password) payload.password = password;
        await platformLabUsersAPI.update(id, payload);
      } else {
        await platformLabUsersAPI.create({ username, name, role, password });
      }
      navigate('/admin/comptes-labo');
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'enregistrement du compte.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4">{isEdit ? 'Modifier le compte' : 'Ajouter un compte'}</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="card shadow-sm" style={{ maxWidth: 600 }}>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Nom complet</label>
              <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="mb-3">
              <label className="form-label">Identifiant</label>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isEdit}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Role</label>
              <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)} required>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="form-label">{isEdit ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isEdit}
                minLength={6}
              />
            </div>

            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving && <span className="spinner-border spinner-border-sm me-2"></span>}
                Enregistrer
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/admin/comptes-labo')}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

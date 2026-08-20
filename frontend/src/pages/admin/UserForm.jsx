import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { platformUsersAPI } from '../../api/adminEndpoints';

export default function UserForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    platformUsersAPI.getAll().then(({ data }) => {
      const existing = data.find((u) => String(u.id) === String(id));
      if (existing) {
        setUsername(existing.username);
        setName(existing.name);
        setEmail(existing.email || '');
        setIsSuperuser(existing.is_superuser);
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
        const payload = { name, email, is_superuser: isSuperuser };
        if (password) payload.password = password;
        await platformUsersAPI.update(id, payload);
      } else {
        await platformUsersAPI.create({ username, name, email, password, is_superuser: isSuperuser });
      }
      navigate('/admin/comptes-facturation');
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
              <label className="form-label">Email (optionnel)</label>
              <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="mb-3 form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="isSuperuser"
                checked={isSuperuser}
                onChange={(e) => setIsSuperuser(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="isSuperuser">
                Super Admin (acces complet a la Facturation)
              </label>
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
              <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/admin/comptes-facturation')}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

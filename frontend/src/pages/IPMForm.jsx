import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';

export default function IPMForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { ipms, addIPM, updateIPM } = useData();
  const isEdit = !!id;
  const existing = isEdit ? ipms.find((i) => i.id === id) : null;

  const [nom, setNom] = useState(existing?.nom || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        await updateIPM(id, { nom });
      } else {
        await addIPM({ nom });
      }
      navigate('/ipm');
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4">{isEdit ? "Modifier l'IPM" : 'Ajouter une IPM'}</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="card shadow-sm" style={{ maxWidth: 500 }}>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Nom de l'IPM</label>
              <input
                type="text"
                className="form-control"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving && <span className="spinner-border spinner-border-sm me-2"></span>}
                Enregistrer
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/ipm')}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

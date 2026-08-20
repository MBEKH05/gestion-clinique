import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';

export default function AssurancesForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { assurances, addAssurance, updateAssurance } = useData();
  const isEdit = !!id;
  const existing = isEdit ? assurances.find((a) => a.id === id) : null;

  const [nom, setNom] = useState(existing?.nom || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        await updateAssurance(id, { nom });
      } else {
        await addAssurance({ nom });
      }
      navigate('/assurances');
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4">{isEdit ? "Modifier l'assurance" : 'Ajouter une assurance'}</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="card shadow-sm" style={{ maxWidth: 500 }}>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Nom de l'assurance</label>
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
              <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/assurances')}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

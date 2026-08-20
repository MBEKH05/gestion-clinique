import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { tarifsAPI } from '../api/endpoints';

export default function AnalysesForm() {
  const { category, id } = useParams();
  const navigate = useNavigate();
  const { analyses, ipms, assurances, addAnalyse, updateAnalyse } = useData();

  const isEdit = !!id;
  const existing = isEdit ? analyses.find((a) => a.id === id) : null;
  const categorie = existing?.categorie || category;

  const [nom, setNom] = useState(existing?.nom || '');
  const [typePriseEnCharge, setTypePriseEnCharge] = useState('');
  const [ipmId, setIpmId] = useState('');
  const [assuranceId, setAssuranceId] = useState('');
  const [prix, setPrix] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existing) setNom(existing.nom);
  }, [existing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        await updateAnalyse(id, { nom });
      } else {
        const created = await addAnalyse({ nom, categorie: category });
        if (prix) {
          await tarifsAPI.create({
            analyse: created.id,
            type_prise_en_charge: typePriseEnCharge || null,
            ipm: typePriseEnCharge === 'IPM' ? ipmId || null : null,
            assurance: typePriseEnCharge === 'ASSURANCE' ? assuranceId || null : null,
            prix: Number(prix),
          });
        }
      }
      navigate(`/base-de-donnees/${category}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4">{isEdit ? 'Modifier' : 'Ajouter'} une analyse</h2>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm" style={{ maxWidth: 600 }}>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Nom</label>
              <input
                type="text"
                className="form-control"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label d-block">Categorie</label>
              <span className="badge bg-info text-dark text-capitalize">{categorie}</span>
            </div>

            {!isEdit && (
              <>
                <div className="mb-3">
                  <label className="form-label">Type de prise en charge (optionnel)</label>
                  <select
                    className="form-select"
                    value={typePriseEnCharge}
                    onChange={(e) => setTypePriseEnCharge(e.target.value)}
                  >
                    <option value="">-- Aucun --</option>
                    <option value="IPM">IPM</option>
                    <option value="ASSURANCE">Assurance</option>
                  </select>
                </div>

                {typePriseEnCharge === 'IPM' && (
                  <div className="mb-3">
                    <label className="form-label">IPM</label>
                    <select className="form-select" value={ipmId} onChange={(e) => setIpmId(e.target.value)}>
                      <option value="">-- Selectionner --</option>
                      {ipms.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {typePriseEnCharge === 'ASSURANCE' && (
                  <div className="mb-3">
                    <label className="form-label">Assurance</label>
                    <select
                      className="form-select"
                      value={assuranceId}
                      onChange={(e) => setAssuranceId(e.target.value)}
                    >
                      <option value="">-- Selectionner --</option>
                      {assurances.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label">Prix (optionnel)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control"
                    value={prix}
                    onChange={(e) => setPrix(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving && <span className="spinner-border spinner-border-sm me-2"></span>}
                Enregistrer
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => navigate(`/base-de-donnees/${category}`)}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

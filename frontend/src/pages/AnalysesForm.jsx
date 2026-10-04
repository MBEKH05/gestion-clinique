import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { TYPES_PRISE_EN_CHARGE, getTypePriseEnCharge } from '../utils/priseEnCharge';
import { tarifsAPI } from '../api/endpoints';

export default function AnalysesForm() {
  const { category, id } = useParams();
  const navigate = useNavigate();
  const { analyses, ipms, assurances, caisses, addAnalyse, updateAnalyse } = useData();

  const isEdit = !!id;
  const existing = isEdit ? analyses.find((a) => a.id === id) : null;
  const categorie = existing?.categorie || category;

  const [nom, setNom] = useState(existing?.nom || '');
  const [typePriseEnCharge, setTypePriseEnCharge] = useState('');
  const [ipmId, setIpmId] = useState('');
  const [assuranceId, setAssuranceId] = useState('');
  const [caisseId, setCaisseId] = useState('');
  const [prix, setPrix] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const listes = { ipms, assurances, caisses };
  const entiteIds = { IPM: ipmId, ASSURANCE: assuranceId, CAISSE: caisseId };
  const setEntiteIds = { IPM: setIpmId, ASSURANCE: setAssuranceId, CAISSE: setCaisseId };
  const typeChoisi = getTypePriseEnCharge(typePriseEnCharge);

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
            caisse: typePriseEnCharge === 'CAISSE' ? caisseId || null : null,
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
                    {TYPES_PRISE_EN_CHARGE.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {typePriseEnCharge && (
                  <div className="mb-3">
                    <label className="form-label">{typeChoisi.label}</label>
                    <select
                      className="form-select"
                      value={entiteIds[typeChoisi.value]}
                      onChange={(e) => setEntiteIds[typeChoisi.value](e.target.value)}
                    >
                      <option value="">-- Selectionner --</option>
                      {(listes[typeChoisi.listKey] || []).map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nom}
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

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { patientsAPI } from '../api/endpoints';
import { convertPatientFromAPI } from '../utils/apiConverters';

export default function PatientsForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { ipms, assurances, addPatient, updatePatient } = useData();
  const isEdit = !!id;

  const [nomComplet, setNomComplet] = useState('');
  const [matricule, setMatricule] = useState('');
  const [typePriseEnCharge, setTypePriseEnCharge] = useState('IPM');
  const [ipmId, setIpmId] = useState('');
  const [assuranceId, setAssuranceId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    patientsAPI.get(id).then(({ data }) => {
      const p = convertPatientFromAPI(data);
      setNomComplet(p.nomComplet);
      setMatricule(p.matricule);
      setTypePriseEnCharge(p.typePriseEnCharge);
      setIpmId(p.ipmId || '');
      setAssuranceId(p.assuranceId || '');
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
      const payload = {
        nomComplet,
        matricule,
        typePriseEnCharge,
        ipmId: typePriseEnCharge === 'IPM' ? ipmId : '',
        assuranceId: typePriseEnCharge === 'ASSURANCE' ? assuranceId : '',
      };
      if (isEdit) {
        await updatePatient(id, payload);
      } else {
        await addPatient(payload);
      }
      navigate('/patients');
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4">{isEdit ? 'Modifier le patient' : 'Ajouter un patient'}</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="card shadow-sm" style={{ maxWidth: 600 }}>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Nom complet</label>
              <input
                type="text"
                className="form-control"
                value={nomComplet}
                onChange={(e) => setNomComplet(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Matricule</label>
              <input
                type="text"
                className="form-control"
                value={matricule}
                onChange={(e) => setMatricule(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Type de prise en charge</label>
              <select
                className="form-select"
                value={typePriseEnCharge}
                onChange={(e) => setTypePriseEnCharge(e.target.value)}
                required
              >
                <option value="IPM">IPM</option>
                <option value="ASSURANCE">Assurance</option>
              </select>
            </div>

            {typePriseEnCharge === 'IPM' ? (
              <div className="mb-3">
                <label className="form-label">IPM</label>
                <select className="form-select" value={ipmId} onChange={(e) => setIpmId(e.target.value)} required>
                  <option value="">-- Selectionner --</option>
                  {ipms
                    .filter((i) => i.actif)
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.nom}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div className="mb-3">
                <label className="form-label">Assurance</label>
                <select
                  className="form-select"
                  value={assuranceId}
                  onChange={(e) => setAssuranceId(e.target.value)}
                  required
                >
                  <option value="">-- Selectionner --</option>
                  {assurances
                    .filter((a) => a.actif)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nom}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving && <span className="spinner-border spinner-border-sm me-2"></span>}
                Enregistrer
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/patients')}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { platformLabDossiersAPI } from '../../api/adminEndpoints';
import { statutBadge } from '../../utils/labDossierUtils';

export default function AdminLabDossierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformLabDossiersAPI.get(id).then(({ data }) => setDossier(data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  }

  if (!dossier) {
    return <div className="alert alert-warning">Dossier introuvable.</div>;
  }

  const badge = statutBadge(dossier.statut);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="mb-1">Dossier {dossier.numero_client || dossier.id}</h2>
          <span className={`badge ${badge.className}`}>{badge.label}</span>
        </div>
        <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
          Retour
        </button>
      </div>

      {dossier.motif_refus && (
        <div className="alert alert-warning">
          <strong>Motif du refus :</strong> {dossier.motif_refus}
        </div>
      )}

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <h5 className="card-title">Patient</h5>
          <div>{dossier.patient_nom}</div>
          {dossier.patient_telephone && <div className="text-muted small">{dossier.patient_telephone}</div>}
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <h5 className="card-title">Documents</h5>
          {dossier.documents.length === 0 ? (
            <div className="text-muted">Aucun document.</div>
          ) : (
            <ul className="list-group">
              {dossier.documents.map((d) => (
                <li key={d.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <a href={d.url} target="_blank" rel="noreferrer">
                    <i className="bi bi-file-earmark-medical me-2"></i>
                    {d.nom_original}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <h5 className="card-title">Suivi</h5>
          <div className="small text-muted">Technicien : {dossier.technicien?.name}</div>
          {dossier.medecin && <div className="small text-muted">Medecin : {dossier.medecin.name}</div>}
          {dossier.archive_par && <div className="small text-muted">Archive par : {dossier.archive_par.name}</div>}
        </div>
      </div>
    </div>
  );
}

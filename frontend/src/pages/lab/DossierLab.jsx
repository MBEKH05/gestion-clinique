import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { labDossiersAPI } from '../../api/labEndpoints';
import { downloadAllDocuments, statutBadge } from '../../utils/labDossierUtils';
import PdfPreviewModal from '../../components/lab/PdfPreviewModal';
import QrLabelModal from '../../components/lab/QrLabelModal';

const dateFr = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '-');

// Page d'un dossier du laboratoire : c'est elle qu'ouvre le scan du QR code.
export default function DossierLab() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apercu, setApercu] = useState(false);
  const [qr, setQr] = useState(false);

  useEffect(() => {
    setLoading(true);
    labDossiersAPI
      .get(id)
      .then(({ data }) => setDossier(data))
      .catch(() => setDossier(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary"></div>
      </div>
    );
  }

  if (!dossier) {
    return (
      <div>
        <div className="alert alert-warning">Dossier introuvable.</div>
        <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
          Retour
        </button>
      </div>
    );
  }

  const badge = statutBadge(dossier.statut);
  const documents = dossier.documents || [];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <h2 className="mb-1">{dossier.patient_nom || 'Dossier'}</h2>
          <span className={`badge ${badge.className}`}>{badge.label}</span>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-outline-secondary" onClick={() => setQr(true)}>
            <i className="bi bi-qr-code me-2"></i>QR
          </button>
          <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
            Retour
          </button>
        </div>
      </div>

      {dossier.motif_refus && (
        <div className="alert alert-warning">
          <strong>Motif du refus :</strong> {dossier.motif_refus}
        </div>
      )}

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <h5 className="card-title">Patient</h5>
          <div className="row g-2 small">
            <div className="col-sm-6">
              <span className="text-muted">Nom : </span>
              {dossier.patient_nom || '-'}
            </div>
            <div className="col-sm-6">
              <span className="text-muted">N&deg; client : </span>
              {dossier.numero_client || '-'}
            </div>
            <div className="col-sm-6">
              <span className="text-muted">Telephone : </span>
              {dossier.patient_telephone || '-'}
            </div>
            <div className="col-sm-6">
              <span className="text-muted">Cree le : </span>
              {dateFr(dossier.created_at)}
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
            <h5 className="card-title mb-0">Documents</h5>
            {documents.length > 0 && (
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setApercu(true)}>
                  Apercu
                </button>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => downloadAllDocuments(dossier)}>
                  <i className="bi bi-download me-1"></i>Telecharger
                </button>
              </div>
            )}
          </div>
          {documents.length === 0 ? (
            <div className="text-muted">Aucun document.</div>
          ) : (
            <ul className="list-group">
              {documents.map((d) => (
                <li key={d.id} className="list-group-item">
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
        <div className="card-body small">
          <h5 className="card-title">Suivi</h5>
          <div>
            <span className="text-muted">Technicien : </span>
            {dossier.technicien?.name || '-'}
          </div>
          <div>
            <span className="text-muted">Medecin : </span>
            {dossier.medecin?.name || '-'}
            {dossier.valide_le && <span className="text-muted"> (valide le {dateFr(dossier.valide_le)})</span>}
          </div>
          {dossier.archive_par && (
            <div>
              <span className="text-muted">Archive par : </span>
              {dossier.archive_par.name} le {dateFr(dossier.archive_le)}
            </div>
          )}
        </div>
      </div>

      <PdfPreviewModal show={apercu} onClose={() => setApercu(false)} documents={documents} />
      <QrLabelModal show={qr} onClose={() => setQr(false)} dossiers={[dossier]} />
    </div>
  );
}

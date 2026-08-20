import { useEffect, useState } from 'react';
import { labDocumentsAnnexesAPI } from '../../api/labEndpoints';
import Modal from '../../components/lab/Modal';
import ConfirmModal from '../../components/lab/ConfirmModal';
import PdfPreviewModal from '../../components/lab/PdfPreviewModal';

export default function Hospitalisation() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [previewing, setPreviewing] = useState(null);

  const load = () => {
    setLoading(true);
    labDocumentsAnnexesAPI.getAll().then(({ data }) => setDocuments(data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async () => {
    await labDocumentsAnnexesAPI.remove(deleting.id);
    setDeleting(null);
    load();
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Hospitalisation</h2>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <i className="bi bi-plus-lg me-2"></i>Ajouter un document
        </button>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center text-muted py-5">Aucun document.</div>
      ) : (
        <div className="row g-3">
          {documents.map((d) => (
            <div className="col-md-4 col-lg-3" key={d.id}>
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <i className="bi bi-file-earmark-medical fs-2 text-primary mb-2 d-block"></i>
                  <h6 className="card-title mb-1">{d.titre}</h6>
                  <div className="small text-muted">{d.ajoute_par || '-'}</div>
                  <div className="small text-muted mb-3">{new Date(d.created_at).toLocaleDateString('fr-FR')}</div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-secondary flex-fill" onClick={() => setPreviewing(d)}>
                      Voir
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleting(d)}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddModal show={showAdd} onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); load(); }} />

      <ConfirmModal
        show={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Supprimer le document"
        message={deleting && <>Supprimer le document <strong>{deleting.titre}</strong> ?</>}
        confirmLabel="Supprimer"
        irreversible
      />

      <PdfPreviewModal
        show={!!previewing}
        onClose={() => setPreviewing(null)}
        documents={previewing ? [{ id: previewing.id, nom_original: previewing.titre, url: previewing.url }] : []}
      />
    </div>
  );
}

function AddModal({ show, onClose, onDone }) {
  const [titre, setTitre] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      setTitre('');
      setFile(null);
      setError('');
    }
  }, [show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titre.trim() || !file) {
      setError('Titre et fichier requis.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('titre', titre);
      formData.append('document', file);
      await labDocumentsAnnexesAPI.create(formData);
      onDone();
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'envoi du document.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onClose={onClose} title="Ajouter un document">
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Titre</label>
          <input type="text" className="form-control" value={titre} onChange={(e) => setTitre(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label">Fichier PDF</label>
          <input type="file" className="form-control" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files[0] || null)} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <span className="spinner-border spinner-border-sm me-2"></span>}
          Envoyer
        </button>
      </form>
    </Modal>
  );
}

import { useEffect, useState } from 'react';
import { labDossiersAPI } from '../../api/labEndpoints';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/lab/Modal';
import PdfPreviewModal from '../../components/lab/PdfPreviewModal';

const PAGE_SIZE = 20;

function groupByPatient(dossiers) {
  const map = {};
  dossiers.forEach((d) => {
    const key = (d.patient_nom || '').toLowerCase() + '||' + (d.numero_client || '');
    if (!map[key]) {
      map[key] = { key, patient_nom: d.patient_nom, numero_client: d.numero_client, dossiers: [] };
    }
    map[key].dossiers.push(d);
  });
  return Object.values(map);
}

export default function MedecinDossiers() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [dossiers, setDossiers] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [previewDocs, setPreviewDocs] = useState(null);
  const [validating, setValidating] = useState(null);
  const [refusing, setRefusing] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = () => {
    setLoading(true);
    labDossiersAPI
      .getAll({ page, page_size: PAGE_SIZE, search: debounced, statut: 'EN_ATTENTE' })
      .then(({ data }) => { setDossiers(data.results); setCount(data.count); })
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, debounced]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const openPreview = async (groupe) => {
    const allData = await Promise.all(groupe.dossiers.map((d) => labDossiersAPI.get(d.id)));
    setPreviewDocs(allData.flatMap((r) => r.data.documents || []));
  };

  const groupes = groupByPatient(dossiers);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <div className="text-muted mb-1">Bonjour, Dr. {user?.name || user?.username}</div>
          <h2 className="mb-0">
            Dossiers a valider <span className="badge bg-secondary">{count} en attente</span>
          </h2>
        </div>
        <input
          type="text"
          className="form-control"
          style={{ width: 260 }}
          placeholder="Rechercher (nom ou n° client)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : count === 0 ? (
        <div className="card shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bi bi-check2-circle fs-1 text-success mb-2 d-block"></i>
            <h5 className="mb-0">Tout est a jour</h5>
            <div className="text-muted small">Aucun dossier en attente d'avis.</div>
          </div>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover bg-white shadow-sm">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>N&deg; client</th>
                  <th>Technicien</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupes.map((groupe) => {
                  const latest = groupe.dossiers[0];
                  return (
                    <tr key={groupe.key}>
                      <td>
                        <strong>{groupe.patient_nom}</strong>
                        {groupe.dossiers.length > 1 && (
                          <span className="badge bg-secondary ms-2">{groupe.dossiers.length}</span>
                        )}
                      </td>
                      <td>{groupe.numero_client || '-'}</td>
                      <td>{latest.technicien?.name || '-'}</td>
                      <td>{latest.created_at ? new Date(latest.created_at).toLocaleDateString('fr-FR') : '-'}</td>
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => openPreview(groupe)}>
                            Voir PDF
                          </button>
                          <button className="btn btn-sm btn-success" onClick={() => setValidating(groupe)}>
                            Valider
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => setRefusing(groupe)}>
                            Refuser
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-2">
            <span className="text-muted small">Page {page} / {totalPages}</span>
            <div className="d-flex gap-1">
              <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Precedent</button>
              <button className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</button>
            </div>
          </div>
        </>
      )}

      <PdfPreviewModal show={!!previewDocs} onClose={() => setPreviewDocs(null)} documents={previewDocs || []} />

      <ValiderModal groupe={validating} onClose={() => setValidating(null)} onDone={() => { setValidating(null); load(); }} />
      <RefuserModal groupe={refusing} onClose={() => setRefusing(null)} onDone={() => { setRefusing(null); load(); }} />
    </div>
  );
}

function ValiderModal({ groupe, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!groupe) return null;

  const handleConfirm = async () => {
    setBusy(true);
    setError('');
    try {
      await Promise.all(groupe.dossiers.map((d) => labDossiersAPI.approve(d.id)));
      onDone();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la validation.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal show={!!groupe} onClose={onClose} title="Valider le dossier">
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <p>
        Vous allez valider {groupe.dossiers.length > 1 ? `les ${groupe.dossiers.length} dossiers` : 'le dossier'} de{' '}
        <strong>{groupe.patient_nom}</strong>.
      </p>
      <div className="text-muted small mb-3">
        <i className="bi bi-patch-check me-1"></i>
        Votre cachet et votre signature seront apposes automatiquement sur les documents.
      </div>
      <div className="d-flex gap-2">
        <button className="btn btn-success" onClick={handleConfirm} disabled={busy}>
          {busy && <span className="spinner-border spinner-border-sm me-2"></span>}
          Confirmer la validation
        </button>
        <button className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>Annuler</button>
      </div>
    </Modal>
  );
}

function RefuserModal({ groupe, onClose, onDone }) {
  const [motif, setMotif] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (groupe) { setMotif(''); setError(''); }
  }, [groupe]);

  if (!groupe) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (motif.trim().length < 5) { setError('Le motif de refus doit contenir au moins 5 caracteres.'); return; }
    setBusy(true);
    setError('');
    try {
      await Promise.all(groupe.dossiers.map((d) => labDossiersAPI.refuse(d.id, motif.trim())));
      onDone();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors du refus.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal show={!!groupe} onClose={onClose} title="Refuser le dossier">
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label className="form-label">Motif de refus</label>
        <textarea className="form-control mb-3" rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} />
        <button type="submit" className="btn btn-danger" disabled={busy}>
          {busy && <span className="spinner-border spinner-border-sm me-2"></span>}
          Refuser le dossier
        </button>
      </form>
    </Modal>
  );
}

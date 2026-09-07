import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { labDossiersAPI } from '../../api/labEndpoints';
import { useAuth } from '../../context/AuthContext';
import { statutBadge } from '../../utils/labDossierUtils';
import Modal from '../../components/lab/Modal';
import ConfirmModal from '../../components/lab/ConfirmModal';
import PdfPreviewModal from '../../components/lab/PdfPreviewModal';

const PAGE_SIZE = 20;
const ACTIFS = 'EN_ATTENTE,VALIDE_MEDECIN,REFUSE';

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

const FILTERS = [
  { key: 'tous', label: 'Tous', statut: ACTIFS },
  { key: 'EN_ATTENTE', label: 'En attente', statut: 'EN_ATTENTE' },
  { key: 'VALIDE_MEDECIN', label: 'Valides medecin', statut: 'VALIDE_MEDECIN' },
  { key: 'REFUSE', label: 'Refuses', statut: 'REFUSE' },
];

export default function TechnicienDossiers() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState('tous');
  const [page, setPage] = useState(1);
  const [dossiers, setDossiers] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [counters, setCounters] = useState(null);

  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [previewDocs, setPreviewDocs] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadCounters = () => {
    Promise.all([
      labDossiersAPI.getAll({ page_size: 1 }),
      labDossiersAPI.getAll({ page_size: 1, statut: 'EN_ATTENTE' }),
      labDossiersAPI.getAll({ page_size: 1, statut: 'VALIDE_MEDECIN' }),
      labDossiersAPI.getAll({ page_size: 1, statut: 'REFUSE' }),
      labDossiersAPI.getAll({ page_size: 1, statut: 'VALIDE_FINAL,ARCHIVE' }),
    ]).then(([total, enAttente, valideMedecin, refuse, finalises]) => {
      setCounters({
        total: total.data.count,
        enAttente: enAttente.data.count,
        valideMedecin: valideMedecin.data.count,
        refuse: refuse.data.count,
        finalises: finalises.data.count,
      });
    });
  };

  const load = () => {
    setLoading(true);
    const statut = FILTERS.find((f) => f.key === filter)?.statut;
    labDossiersAPI
      .getAll({ page, page_size: PAGE_SIZE, search: debounced, statut })
      .then(({ data }) => {
        setDossiers(data.results);
        setCount(data.count);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, debounced, filter]);
  useEffect(loadCounters, []);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const openPreview = async (id) => {
    const { data } = await labDossiersAPI.get(id);
    setPreviewDocs(data.documents || []);
  };

  const refreshAll = () => {
    load();
    loadCounters();
  };

  const handleDelete = async () => {
    setBusy(true);
    setError('');
    try {
      await labDossiersAPI.remove(deleting.id);
      setDeleting(null);
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la suppression.');
    } finally {
      setBusy(false);
    }
  };

  const handleValiderDefinitivement = async (id) => {
    await labDossiersAPI.confirm(id);
    refreshAll();
  };

  const cards = [
    { key: 'tous', label: 'Total', value: counters?.total, grad: 'grad-primary' },
    { key: 'EN_ATTENTE', label: 'En attente', value: counters?.enAttente, grad: 'grad-amber' },
    { key: 'VALIDE_MEDECIN', label: 'Valides medecin', value: counters?.valideMedecin, grad: 'grad-emerald' },
    { key: 'REFUSE', label: 'Refuses', value: counters?.refuse, grad: 'grad-rose' },
    { key: 'finalises', label: 'Finalises', value: counters?.finalises, grad: 'grad-cyan' },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <div className="text-muted mb-1">Bonjour, {user?.name || user?.username}</div>
          <h2 className="mb-0">Mes dossiers</h2>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <input
            type="text"
            className="form-control"
            style={{ width: 260 }}
            placeholder="Rechercher (nom ou n° client)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-primary text-nowrap" onClick={() => setShowImport(true)}>
            <i className="bi bi-upload me-2"></i>Importer un PDF
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {cards.map((c) => (
          <div className="col-6 col-md-4 col-lg" key={c.key}>
            <div
              className={`lab-counter-card p-3 h-100 d-flex align-items-center gap-3 ${filter === c.key ? 'active' : ''}`}
              onClick={() => (c.key === 'finalises' ? navigate('/lab/liste-dossiers') : (setFilter(c.key), setPage(1)))}
            >
              <div className={`stat-icon ${c.grad}`}>
                <i className="bi bi-folder2 fs-5"></i>
              </div>
              <div>
                <div className="text-muted small">{c.label}</div>
                <div className="stat-value">{c.value ?? '-'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="d-flex gap-2 flex-wrap mb-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => {
              setFilter(f.key);
              setPage(1);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover bg-white shadow-sm">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>N&deg; client</th>
                  <th>Statut</th>
                  <th>Medecin</th>
                  <th>Date</th>
                  <th>Commentaire</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupByPatient(dossiers).map((groupe) => (
                  <>
                    <tr key={groupe.key} className="table-secondary">
                      <td colSpan={7} className="py-2">
                        <i className="bi bi-person-fill me-2"></i>
                        <strong>{groupe.patient_nom}</strong>
                        {groupe.numero_client && (
                          <span className="text-muted ms-2">• N° {groupe.numero_client}</span>
                        )}
                        <span className="badge bg-secondary ms-2">
                          {groupe.dossiers.length} dossier{groupe.dossiers.length > 1 ? 's' : ''}
                        </span>
                      </td>
                    </tr>
                    {groupe.dossiers.map((d) => {
                      const badge = statutBadge(d.statut);
                      const modifiable = ['EN_ATTENTE', 'REFUSE'].includes(d.statut);
                      return (
                        <tr key={d.id}>
                          <td className="ps-4 text-muted">
                            <i className="bi bi-arrow-return-right me-1"></i>
                          </td>
                          <td>{d.numero_client || '-'}</td>
                          <td><span className={`badge ${badge.className}`}>{badge.label}</span></td>
                          <td>{d.medecin?.name || '-'}</td>
                          <td>{d.created_at ? new Date(d.created_at).toLocaleDateString('fr-FR') : '-'}</td>
                          <td className="small text-muted">{d.motif_refus || '-'}</td>
                          <td>
                            <div className="d-flex gap-1 flex-wrap">
                              <button className="btn btn-sm btn-outline-secondary" onClick={() => openPreview(d.id)}>
                                Voir PDF
                              </button>
                              {modifiable && (
                                <>
                                  <button className="btn btn-sm btn-outline-primary" onClick={() => setEditing(d)}>
                                    Modifier
                                  </button>
                                  <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleting(d)}>
                                    Supprimer
                                  </button>
                                </>
                              )}
                              {d.statut === 'VALIDE_MEDECIN' && (
                                <button className="btn btn-sm btn-primary" onClick={() => handleValiderDefinitivement(d.id)}>
                                  Valider definitivement
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ))}
                {dossiers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      Aucun dossier trouve.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-2">
            <span className="text-muted small">
              Page {page} / {totalPages} &mdash; {count} dossiers
            </span>
            <div className="d-flex gap-1">
              <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Precedent
              </button>
              <button className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Suivant
              </button>
            </div>
          </div>
        </>
      )}

      <ImportModal
        show={showImport}
        onClose={() => setShowImport(false)}
        onDone={() => {
          setShowImport(false);
          refreshAll();
        }}
      />

      <EditModal
        dossier={editing}
        onClose={() => setEditing(null)}
        onDone={() => {
          setEditing(null);
          refreshAll();
        }}
      />

      <ConfirmModal
        show={!!deleting}
        onClose={() => { setDeleting(null); setError(''); }}
        onConfirm={handleDelete}
        title="Supprimer le dossier"
        message={deleting && (
          <>Supprimer definitivement le dossier de <strong>{deleting.patient_nom}</strong> (n&deg; client {deleting.numero_client || '-'}) ?</>
        )}
        confirmLabel="Supprimer"
        busy={busy}
        irreversible
        error={error}
      />

      <PdfPreviewModal show={!!previewDocs} onClose={() => setPreviewDocs(null)} documents={previewDocs || []} />
    </div>
  );
}

function ImportModal({ show, onClose, onDone }) {
  const [numeroClient, setNumeroClient] = useState('');
  const [patientNom, setPatientNom] = useState('');
  const [patientTelephone, setPatientTelephone] = useState('');
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      setNumeroClient('');
      setPatientNom('');
      setPatientTelephone('');
      setFiles([]);
      setError('');
    }
  }, [show]);

  const handleFilesChange = (e) => setFiles(Array.from(e.target.files));
  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!patientNom.trim()) {
      setError('Le nom du patient est requis.');
      return;
    }
    if (files.length === 0) {
      setError('Ajoutez au moins un document PDF.');
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('patient_nom', patientNom);
      formData.append('numero_client', numeroClient);
      formData.append('patient_telephone', patientTelephone);
      files.forEach((f) => formData.append('documents[]', f));
      await labDossiersAPI.create(formData);
      onDone();
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'import.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onClose={onClose} title="Importer des dossiers" maxWidth={560}>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="row g-2 mb-3">
          <div className="col-md-6">
            <label className="form-label">Numero client</label>
            <input type="text" className="form-control" value={numeroClient} onChange={(e) => setNumeroClient(e.target.value)} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Nom du patient</label>
            <input type="text" className="form-control" value={patientNom} onChange={(e) => setPatientNom(e.target.value)} required />
          </div>
        </div>
        <div className="mb-3">
          <label className="form-label">Telephone du patient</label>
          <input
            type="tel"
            className="form-control"
            value={patientTelephone}
            onChange={(e) => setPatientTelephone(e.target.value)}
            placeholder="77 123 45 67"
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Documents PDF</label>
          <input type="file" className="form-control" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleFilesChange} />
          {files.length > 0 && (
            <ul className="list-group mt-2">
              {files.map((f, i) => (
                <li key={i} className="list-group-item d-flex justify-content-between align-items-center py-1">
                  <span className="small">{f.name}</span>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeFile(i)}>
                    <i className="bi bi-x"></i>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <span className="spinner-border spinner-border-sm me-2"></span>}
          Importer {files.length > 0 ? `(${files.length} document${files.length > 1 ? 's' : ''})` : ''}
        </button>
      </form>
    </Modal>
  );
}

function EditModal({ dossier, onClose, onDone }) {
  const [numeroClient, setNumeroClient] = useState('');
  const [patientNom, setPatientNom] = useState('');
  const [patientTelephone, setPatientTelephone] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (dossier) {
      setNumeroClient(dossier.numero_client || '');
      setPatientNom(dossier.patient_nom || '');
      setPatientTelephone(dossier.patient_telephone || '');
      setFile(null);
      setError('');
    }
  }, [dossier]);

  if (!dossier) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('numero_client', numeroClient);
      formData.append('patient_nom', patientNom);
      formData.append('patient_telephone', patientTelephone);
      if (file) formData.append('documents[]', file);
      await labDossiersAPI.update(dossier.id, formData);
      onDone();
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={!!dossier} onClose={onClose} title="Modifier le dossier" maxWidth={520}>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Numero client</label>
          <input type="text" className="form-control" value={numeroClient} onChange={(e) => setNumeroClient(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label">Nom du patient</label>
          <input type="text" className="form-control" value={patientNom} onChange={(e) => setPatientNom(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Telephone du patient</label>
          <input
            type="tel"
            className="form-control"
            value={patientTelephone}
            onChange={(e) => setPatientTelephone(e.target.value)}
            placeholder="77 123 45 67"
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Remplacer le fichier PDF (optionnel)</label>
          <input type="file" className="form-control" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files[0] || null)} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <span className="spinner-border spinner-border-sm me-2"></span>}
          Enregistrer
        </button>
      </form>
    </Modal>
  );
}

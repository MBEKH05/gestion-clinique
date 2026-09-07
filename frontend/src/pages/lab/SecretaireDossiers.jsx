import { useEffect, useState } from 'react';
import { labDossiersAPI } from '../../api/labEndpoints';
import { useAuth } from '../../context/AuthContext';
import { buildWhatsAppLink, downloadAllDocuments, printAllDocuments } from '../../utils/labDossierUtils';
import ConfirmModal from '../../components/lab/ConfirmModal';
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

export default function SecretaireDossiers() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [dossiers, setDossiers] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [previewDocs, setPreviewDocs] = useState(null);
  const [archiving, setArchiving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = () => {
    setLoading(true);
    labDossiersAPI
      .getAll({ page, page_size: PAGE_SIZE, search: debounced, statut: 'VALIDE_FINAL' })
      .then(({ data }) => {
        setDossiers(data.results);
        setCount(data.count);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, debounced]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const openPreview = async (id) => {
    const { data } = await labDossiersAPI.get(id);
    setPreviewDocs(data.documents || []);
  };

  const handlePrint = async (id) => {
    const { data } = await labDossiersAPI.get(id);
    printAllDocuments(data);
  };

  const handleDownload = async (id) => {
    const { data } = await labDossiersAPI.get(id);
    downloadAllDocuments(data);
  };

  const handleWhatsApp = async (id) => {
    const { data } = await labDossiersAPI.get(id);
    window.open(buildWhatsAppLink(data), '_blank', 'noreferrer');
  };

  const handleArchive = async () => {
    setBusy(true);
    setError('');
    try {
      await labDossiersAPI.archive(archiving.id);
      setArchiving(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'archivage.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <div className="text-muted mb-1">Bonjour, {user?.name || user?.username}</div>
          <h2 className="mb-0">
            Dossiers a imprimer <span className="badge bg-secondary">{count} a imprimer</span>
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
                  <th>Medecin</th>
                  <th>Technicien</th>
                  <th>Valide le</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupByPatient(dossiers).map((groupe) => (
                  <>
                    <tr key={groupe.key} className="table-secondary">
                      <td colSpan={6} className="py-2">
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
                    {groupe.dossiers.map((d) => (
                      <tr key={d.id}>
                        <td className="ps-4 text-muted">
                          <i className="bi bi-arrow-return-right me-1"></i>
                        </td>
                        <td>{d.numero_client || '-'}</td>
                        <td>{d.medecin?.name || '-'}</td>
                        <td>{d.technicien?.name || '-'}</td>
                        <td>{d.valide_le ? new Date(d.valide_le).toLocaleDateString('fr-FR') : '-'}</td>
                        <td>
                          <div className="d-flex gap-1 flex-wrap">
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => openPreview(d.id)}>
                              Apercu
                            </button>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => handlePrint(d.id)}>
                              <i className="bi bi-printer"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => handleDownload(d.id)}>
                              <i className="bi bi-download"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-success" onClick={() => handleWhatsApp(d.id)}>
                              <i className="bi bi-whatsapp"></i>
                            </button>
                            <button className="btn btn-sm btn-primary" onClick={() => setArchiving(d)}>
                              Archiver
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
                {dossiers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      Aucun dossier a imprimer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-2">
            <span className="text-muted small">Page {page} / {totalPages}</span>
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

      <PdfPreviewModal show={!!previewDocs} onClose={() => setPreviewDocs(null)} documents={previewDocs || []} />

      <ConfirmModal
        show={!!archiving}
        onClose={() => { setArchiving(null); setError(''); }}
        onConfirm={handleArchive}
        title="Archiver le dossier"
        message={archiving && (
          <>
            Archiver le dossier de <strong>{archiving.patient_nom}</strong>, valide le{' '}
            {archiving.valide_le ? new Date(archiving.valide_le).toLocaleDateString('fr-FR') : '-'} ?
            <div className="text-muted small mt-2">Le dossier restera consultable une fois archive.</div>
          </>
        )}
        confirmLabel="Archiver"
        confirmVariant="btn-primary"
        busy={busy}
        error={error}
      />
    </div>
  );
}

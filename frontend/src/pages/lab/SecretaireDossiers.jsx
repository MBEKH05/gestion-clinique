import { useEffect, useState } from 'react';
import { labDossiersAPI } from '../../api/labEndpoints';
import { useAuth } from '../../context/AuthContext';
import { buildWhatsAppLink, printPdf } from '../../utils/labDossierUtils';
import ConfirmModal from '../../components/lab/ConfirmModal';
import PdfPreviewModal from '../../components/lab/PdfPreviewModal';

const PAGE_SIZE = 20;

function groupByPatient(dossiers) {
  const map = {};
  dossiers.forEach((d) => {
    const key = (d.patient_nom || '').toLowerCase() + '||' + (d.numero_client || '');
    if (!map[key]) {
      map[key] = { key, patient_nom: d.patient_nom, numero_client: d.numero_client, patient_telephone: d.patient_telephone, dossiers: [] };
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
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = () => {
    setLoading(true);
    labDossiersAPI
      .getAll({ page, page_size: PAGE_SIZE, search: debounced, statut: 'VALIDE_FINAL' })
      .then(({ data }) => { setDossiers(data.results); setCount(data.count); })
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, debounced]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  // Recupere tous les documents de tous les dossiers du groupe patient
  const fetchGroupeDocs = async (groupe) => {
    const allData = await Promise.all(groupe.dossiers.map((d) => labDossiersAPI.get(d.id)));
    return allData.flatMap((r) => r.data.documents || []);
  };

  const openPreview = async (groupe) => {
    const allDocs = await fetchGroupeDocs(groupe);
    setPreviewDocs(allDocs);
  };

  const handlePrint = async (groupe) => {
    const allDocs = await fetchGroupeDocs(groupe);
    allDocs.forEach((doc, i) => setTimeout(() => printPdf(doc.url), i * 1200));
  };

  const handleDownload = async (groupe) => {
    const allDocs = await fetchGroupeDocs(groupe);
    allDocs.forEach((doc) => {
      const a = document.createElement('a');
      a.href = doc.url;
      a.download = doc.nom_original || 'document.pdf';
      a.click();
    });
  };

  const handleWhatsApp = async (groupe) => {
    const allDocs = await fetchGroupeDocs(groupe);
    const firstData = { patient_nom: groupe.patient_nom, patient_telephone: groupe.patient_telephone };
    window.open(buildWhatsAppLink(firstData, allDocs), '_blank', 'noreferrer');
  };

  const handleArchive = async () => {
    setBusy(true);
    setError('');
    try {
      await Promise.all(archiving.dossiers.map((d) => labDossiersAPI.archive(d.id)));
      setArchiving(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'archivage.");
    } finally {
      setBusy(false);
    }
  };

  const groupes = groupByPatient(dossiers);

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
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
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
                      <td>{latest.medecin?.name || '-'}</td>
                      <td>{latest.technicien?.name || '-'}</td>
                      <td>{latest.valide_le ? new Date(latest.valide_le).toLocaleDateString('fr-FR') : '-'}</td>
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => openPreview(groupe)}>
                            Apercu
                          </button>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => handlePrint(groupe)}>
                            <i className="bi bi-printer"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => handleDownload(groupe)}>
                            <i className="bi bi-download"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-success" onClick={() => handleWhatsApp(groupe)}>
                            <i className="bi bi-whatsapp"></i>
                          </button>
                          <button className="btn btn-sm btn-primary" onClick={() => setArchiving(groupe)}>
                            Archiver
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {groupes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">Aucun dossier a imprimer.</td>
                  </tr>
                )}
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

      <ConfirmModal
        show={!!archiving}
        onClose={() => { setArchiving(null); setError(''); }}
        onConfirm={handleArchive}
        title="Archiver les dossiers"
        message={archiving && (
          <>
            Archiver {archiving.dossiers.length > 1 ? `les ${archiving.dossiers.length} dossiers` : 'le dossier'} de{' '}
            <strong>{archiving.patient_nom}</strong> ?
            <div className="text-muted small mt-2">Les dossiers resteront consultables une fois archives.</div>
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

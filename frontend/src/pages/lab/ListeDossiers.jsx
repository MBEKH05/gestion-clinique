import { useEffect, useState } from 'react';
import { labDossiersAPI } from '../../api/labEndpoints';
import { useAuth } from '../../context/AuthContext';
import { statutBadge, downloadAllDocuments } from '../../utils/labDossierUtils';
import PdfPreviewModal from '../../components/lab/PdfPreviewModal';

const PAGE_SIZE = 15;

export default function ListeDossiers() {
  const { user, labRole } = useAuth();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [tab, setTab] = useState('dossiers');
  const [page, setPage] = useState(1);
  const [dossiers, setDossiers] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [previewDocs, setPreviewDocs] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = () => {
    setLoading(true);
    const params = { page, page_size: PAGE_SIZE, search: debounced };
    if (tab === 'archives') {
      params.statut = 'ARCHIVE';
    } else {
      params.exclude_archived = 1;
    }
    labDossiersAPI
      .getAll(params)
      .then(({ data }) => {
        setDossiers(data.results);
        setCount(data.count);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, debounced, tab]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const openPreview = async (id) => {
    const { data } = await labDossiersAPI.get(id);
    setPreviewDocs(data.documents || []);
  };

  const handleDownload = async (id) => {
    const { data } = await labDossiersAPI.get(id);
    downloadAllDocuments(data);
  };

  const handleArchive = async (id) => {
    await labDossiersAPI.archive(id);
    load();
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <div className="text-muted mb-1">Bonjour, {user?.name || user?.username}</div>
          <h2 className="mb-0">
            Liste des dossiers <span className="badge bg-secondary">{count}</span>
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

      <div className="d-flex gap-2 mb-3">
        <button
          className={`btn btn-sm ${tab === 'dossiers' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => { setTab('dossiers'); setPage(1); }}
        >
          Dossiers
        </button>
        <button
          className={`btn btn-sm ${tab === 'archives' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => { setTab('archives'); setPage(1); }}
        >
          Archives
        </button>
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
                  <th>Technicien</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dossiers.map((d) => {
                  const badge = statutBadge(d.statut);
                  return (
                    <tr key={d.id}>
                      <td>{d.patient_nom}</td>
                      <td>{d.numero_client || '-'}</td>
                      <td><span className={`badge ${badge.className}`}>{badge.label}</span></td>
                      <td>{d.medecin?.name || '-'}</td>
                      <td>{d.technicien?.name || '-'}</td>
                      <td>{d.created_at ? new Date(d.created_at).toLocaleDateString('fr-FR') : '-'}</td>
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => openPreview(d.id)}>
                            Apercu
                          </button>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => handleDownload(d.id)}>
                            <i className="bi bi-download"></i>
                          </button>
                          {labRole === 'medecin' && d.statut === 'VALIDE_FINAL' && (
                            <button className="btn btn-sm btn-primary" onClick={() => handleArchive(d.id)}>
                              Archiver
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
    </div>
  );
}

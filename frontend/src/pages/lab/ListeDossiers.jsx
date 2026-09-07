import { useEffect, useState } from 'react';
import { labDossiersAPI } from '../../api/labEndpoints';
import { useAuth } from '../../context/AuthContext';
import { statutBadge, downloadAllDocuments } from '../../utils/labDossierUtils';
import PdfPreviewModal from '../../components/lab/PdfPreviewModal';

const PAGE_SIZE = 15;

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
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = () => {
    setLoading(true);
    const params = { page, page_size: PAGE_SIZE, search: debounced };
    if (tab === 'archives') params.statut = 'ARCHIVE';
    else params.exclude_archived = 1;
    labDossiersAPI
      .getAll(params)
      .then(({ data }) => { setDossiers(data.results); setCount(data.count); })
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, debounced, tab]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const fetchGroupeDocs = async (groupe) => {
    const allData = await Promise.all(groupe.dossiers.map((d) => labDossiersAPI.get(d.id)));
    return allData.flatMap((r) => r.data.documents || []);
  };

  const openPreview = async (groupe) => {
    const allDocs = await fetchGroupeDocs(groupe);
    setPreviewDocs(allDocs);
  };

  const handleDownload = async (groupe) => {
    const allData = await Promise.all(groupe.dossiers.map((d) => labDossiersAPI.get(d.id)));
    allData.forEach((r) => downloadAllDocuments(r.data));
  };

  const handleArchive = async (groupe) => {
    await Promise.all(
      groupe.dossiers.filter((d) => d.statut === 'VALIDE_FINAL').map((d) => labDossiersAPI.archive(d.id))
    );
    load();
  };

  const groupes = groupByPatient(dossiers);

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
        <button className={`btn btn-sm ${tab === 'dossiers' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => { setTab('dossiers'); setPage(1); }}>Dossiers</button>
        <button className={`btn btn-sm ${tab === 'archives' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => { setTab('archives'); setPage(1); }}>Archives</button>
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
                  <th>Statut</th>
                  <th>Medecin</th>
                  <th>Technicien</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupes.map((groupe) => {
                  const latest = groupe.dossiers[0];
                  const badge = statutBadge(latest.statut);
                  const hasValideFinal = groupe.dossiers.some((d) => d.statut === 'VALIDE_FINAL');
                  return (
                    <tr key={groupe.key}>
                      <td>
                        <strong>{groupe.patient_nom}</strong>
                        {groupe.dossiers.length > 1 && (
                          <span className="badge bg-secondary ms-2">{groupe.dossiers.length}</span>
                        )}
                      </td>
                      <td>{groupe.numero_client || '-'}</td>
                      <td><span className={`badge ${badge.className}`}>{badge.label}</span></td>
                      <td>{latest.medecin?.name || '-'}</td>
                      <td>{latest.technicien?.name || '-'}</td>
                      <td>{latest.created_at ? new Date(latest.created_at).toLocaleDateString('fr-FR') : '-'}</td>
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => openPreview(groupe)}>Apercu</button>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => handleDownload(groupe)}>
                            <i className="bi bi-download"></i>
                          </button>
                          {labRole === 'medecin' && hasValideFinal && (
                            <button className="btn btn-sm btn-primary" onClick={() => handleArchive(groupe)}>Archiver</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {groupes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">Aucun dossier trouve.</td>
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
    </div>
  );
}

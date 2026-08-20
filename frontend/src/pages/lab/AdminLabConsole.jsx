import { useEffect, useState } from 'react';
import { labStatsAPI, labUsersAPI, labDossiersAPI, labDocumentsAnnexesAPI } from '../../api/labEndpoints';
import { useAuth } from '../../context/AuthContext';
import { statutBadge, downloadFileName } from '../../utils/labDossierUtils';
import Modal from '../../components/lab/Modal';
import ConfirmModal from '../../components/lab/ConfirmModal';
import PdfPreviewModal from '../../components/lab/PdfPreviewModal';

const ROLES = [
  { value: 'technicien', label: 'Technicien' },
  { value: 'medecin', label: 'Medecin' },
  { value: 'secretaire', label: 'Secretaire' },
  { value: 'administrateur', label: 'Administrateur' },
];

export default function AdminLabConsole() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  const loadStats = () => labStatsAPI.get().then(({ data }) => setStats(data));
  useEffect(() => { loadStats(); }, []);

  return (
    <div>
      <div className="hero-panel p-4 p-md-5 mb-4">
        <div className="text-white-50 mb-1">Bonjour,</div>
        <h2 className="text-white mb-1">{user?.name || user?.username}</h2>
        <p className="text-white-50 mb-0">Tableau de bord Laboratoire.</p>
      </div>

      <StatistiquesSection stats={stats} />
      <UtilisateursSection currentUserId={user?.id} onChanged={loadStats} />
      <DossiersSection stats={stats} onChanged={loadStats} />
      <HospitalisationsSection onChanged={loadStats} />
    </div>
  );
}

function StatistiquesSection({ stats }) {
  const cards = [
    { label: 'Utilisateurs actifs', value: stats?.usersActifs, grad: 'grad-primary' },
    { label: 'Utilisateurs (total)', value: stats?.usersTotal, grad: 'grad-cyan' },
    { label: 'Hospitalisations', value: stats?.hospitalisations, grad: 'grad-amber' },
    { label: 'En attente', value: stats?.enAttente, grad: 'grad-amber' },
    { label: 'Valide medecin', value: stats?.valideMedecin, grad: 'grad-emerald' },
    { label: 'Refuse', value: stats?.refuse, grad: 'grad-rose' },
    { label: 'Valide final', value: stats?.valideFinal, grad: 'grad-cyan' },
    { label: 'Archive', value: stats?.archive, grad: 'grad-primary' },
  ];

  return (
    <section className="mb-5">
      <h5 className="mb-3">Statistiques</h5>
      <div className="row g-3">
        {cards.map((c) => (
          <div className="col-6 col-md-3" key={c.label}>
            <div className="stat-card p-3 h-100">
              <div className="text-muted small">{c.label}</div>
              <div className="stat-value">{c.value ?? '-'}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function UtilisateursSection({ currentUserId, onChanged }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [changingPassword, setChangingPassword] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    labUsersAPI.getAll().then(({ data }) => setUsers(data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const refresh = () => { load(); onChanged(); };

  const toggleActive = async (u) => {
    if (u.is_active) await labUsersAPI.deactivate(u.id);
    else await labUsersAPI.activate(u.id);
    refresh();
  };

  const handleDelete = async () => {
    setBusy(true);
    setDeleteError('');
    try {
      await labUsersAPI.remove(deleting.id);
      setDeleting(null);
      refresh();
    } catch (err) {
      setDeleteError(err.response?.data?.detail || 'Erreur lors de la suppression.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-5">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Utilisateurs</h5>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <i className="bi bi-plus-lg me-2"></i>Creer un utilisateur
        </button>
      </div>

      {loading ? (
        <div className="text-center py-4"><div className="spinner-border text-primary"></div></div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover bg-white shadow-sm">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Identifiant</th>
                <th>Role</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.username}</td>
                    <td className="text-capitalize">{u.role}</td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-success' : 'bg-secondary'}`}>
                        {u.is_active ? 'Actif' : 'Desactive'}
                      </span>
                    </td>
                    <td>
                      {!isSelf && (
                        <div className="d-flex gap-1 flex-wrap">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => setEditing(u)}>
                            Modifier
                          </button>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => setChangingPassword(u)}>
                            Mot de passe
                          </button>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => toggleActive(u)}>
                            {u.is_active ? 'Desactiver' : 'Activer'}
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleting(u)}>
                            Supprimer
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CreateUserModal show={showCreate} onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); refresh(); }} />
      <EditUserModal user={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); refresh(); }} />
      <PasswordModal user={changingPassword} onClose={() => setChangingPassword(null)} onDone={() => setChangingPassword(null)} />

      <ConfirmModal
        show={!!deleting}
        onClose={() => { setDeleting(null); setDeleteError(''); }}
        onConfirm={handleDelete}
        title="Supprimer l'utilisateur"
        message={deleting && <>Supprimer definitivement le compte de <strong>{deleting.name}</strong> ?</>}
        confirmLabel="Supprimer"
        busy={busy}
        irreversible
        error={deleteError}
      />
    </section>
  );
}

function CreateUserModal({ show, onClose, onDone }) {
  const [form, setForm] = useState({ username: '', name: '', email: '', role: 'technicien', password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      setForm({ username: '', name: '', email: '', role: 'technicien', password: '' });
      setError('');
    }
  }, [show]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await labUsersAPI.create(form);
      onDone();
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || "Erreur lors de la creation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onClose={onClose} title="Creer un utilisateur">
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Identifiant</label>
          <input type="text" className="form-control" value={form.username} onChange={set('username')} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Mot de passe</label>
          <input type="password" className="form-control" value={form.password} onChange={set('password')} minLength={6} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Nom complet</label>
          <input type="text" className="form-control" value={form.name} onChange={set('name')} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Role</label>
          <select className="form-select" value={form.role} onChange={set('role')}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="mb-4">
          <label className="form-label">Email</label>
          <input type="email" className="form-control" value={form.email} onChange={set('email')} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <span className="spinner-border spinner-border-sm me-2"></span>}
          Creer
        </button>
      </form>
    </Modal>
  );
}

function EditUserModal({ user, onClose, onDone }) {
  const [form, setForm] = useState({ username: '', name: '', email: '', role: 'technicien' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({ username: user.username, name: user.name, email: user.email || '', role: user.role });
      setError('');
    }
  }, [user]);

  if (!user) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await labUsersAPI.update(user.id, { name: form.name, role: form.role, email: form.email });
      onDone();
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={!!user} onClose={onClose} title="Modifier l'utilisateur">
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Identifiant</label>
          <input type="text" className="form-control" value={form.username} disabled />
        </div>
        <div className="mb-3">
          <label className="form-label">Nom complet</label>
          <input type="text" className="form-control" value={form.name} onChange={set('name')} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Role</label>
          <select className="form-select" value={form.role} onChange={set('role')}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="mb-4">
          <label className="form-label">Email</label>
          <input type="email" className="form-control" value={form.email} onChange={set('email')} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <span className="spinner-border spinner-border-sm me-2"></span>}
          Enregistrer
        </button>
      </form>
    </Modal>
  );
}

function PasswordModal({ user, onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) { setPassword(''); setError(''); }
  }, [user]);

  if (!user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caracteres.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await labUsersAPI.update(user.id, { password });
      onDone();
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={!!user} onClose={onClose} title={`Nouveau mot de passe — ${user.name}`}>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Mot de passe</label>
          <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <span className="spinner-border spinner-border-sm me-2"></span>}
          Enregistrer
        </button>
      </form>
    </Modal>
  );
}

const ALL_STATUTS = [
  { value: '', label: 'Tous' },
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'VALIDE_MEDECIN', label: 'Valide medecin' },
  { value: 'REFUSE', label: 'Refuse' },
  { value: 'VALIDE_FINAL', label: 'Valide final' },
  { value: 'ARCHIVE', label: 'Archive' },
];

function DossiersSection({ stats, onChanged }) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [statut, setStatut] = useState('');
  const [page, setPage] = useState(1);
  const [dossiers, setDossiers] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [previewDocs, setPreviewDocs] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const PAGE_SIZE = 30;

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = () => {
    setLoading(true);
    labDossiersAPI
      .getAll({ page, page_size: PAGE_SIZE, search: debounced, statut })
      .then(({ data }) => { setDossiers(data.results); setCount(data.count); })
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, debounced, statut]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const openPreview = async (id) => {
    const { data } = await labDossiersAPI.get(id);
    setPreviewDocs(data.documents || []);
  };

  const countFor = (value) => {
    if (!stats) return null;
    return { '': stats.total, EN_ATTENTE: stats.enAttente, VALIDE_MEDECIN: stats.valideMedecin, REFUSE: stats.refuse, VALIDE_FINAL: stats.valideFinal, ARCHIVE: stats.archive }[value];
  };

  const handleDelete = async () => {
    setBusy(true);
    setError('');
    try {
      await labDossiersAPI.remove(deleting.id);
      setDeleting(null);
      load();
      onChanged();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la suppression.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-5">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Tous les dossiers</h5>
        <input
          type="text"
          className="form-control"
          style={{ width: 260 }}
          placeholder="Rechercher (nom ou n° client)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="d-flex gap-2 flex-wrap mb-3">
        {ALL_STATUTS.map((s) => (
          <button
            key={s.value}
            className={`btn btn-sm ${statut === s.value ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => { setStatut(s.value); setPage(1); }}
          >
            {s.label} {countFor(s.value) != null ? `(${countFor(s.value)})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-4"><div className="spinner-border text-primary"></div></div>
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
                          <button className="btn btn-sm btn-outline-primary" onClick={() => setEditing(d)}>
                            Modifier
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleting(d)}>
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {dossiers.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-muted py-4">Aucun dossier trouve.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-2">
            <span className="text-muted small">Page {page} / {totalPages} &mdash; {count} dossiers</span>
            <div className="d-flex gap-1">
              <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Precedent</button>
              <button className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</button>
            </div>
          </div>
        </>
      )}

      <PdfPreviewModal show={!!previewDocs} onClose={() => setPreviewDocs(null)} documents={previewDocs || []} />

      <EditDossierModal dossier={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); load(); }} />

      <ConfirmModal
        show={!!deleting}
        onClose={() => { setDeleting(null); setError(''); }}
        onConfirm={handleDelete}
        title="Supprimer le dossier"
        message={deleting && <>Supprimer le dossier de <strong>{deleting.patient_nom}</strong> ? Le fichier associe sera supprime avec le dossier.</>}
        confirmLabel="Supprimer"
        busy={busy}
        irreversible
        error={error}
      />
    </section>
  );
}

function EditDossierModal({ dossier, onClose, onDone }) {
  const [numeroClient, setNumeroClient] = useState('');
  const [patientNom, setPatientNom] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (dossier) {
      setNumeroClient(dossier.numero_client || '');
      setPatientNom(dossier.patient_nom || '');
      setError('');
    }
  }, [dossier]);

  if (!dossier) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('numero_client', numeroClient);
      formData.append('patient_nom', patientNom);
      await labDossiersAPI.update(dossier.id, formData);
      onDone();
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={!!dossier} onClose={onClose} title="Modifier le dossier">
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
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <span className="spinner-border spinner-border-sm me-2"></span>}
          Enregistrer
        </button>
      </form>
    </Modal>
  );
}

function HospitalisationsSection({ onChanged }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    setLoading(true);
    labDocumentsAnnexesAPI.getAll().then(({ data }) => setDocuments(data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const refresh = () => { load(); onChanged(); };

  const handleDelete = async () => {
    await labDocumentsAnnexesAPI.remove(deleting.id);
    setDeleting(null);
    refresh();
  };

  return (
    <section>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Hospitalisations</h5>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <i className="bi bi-plus-lg me-2"></i>Ajouter un document
        </button>
      </div>

      {loading ? (
        <div className="text-center py-4"><div className="spinner-border text-primary"></div></div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover bg-white shadow-sm">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Ajoute par</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id}>
                  <td>{d.titre}</td>
                  <td>{d.ajoute_par || '-'}</td>
                  <td>{new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => setEditing(d)}>Modifier</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleting(d)}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr><td colSpan={4} className="text-center text-muted py-4">Aucun document.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <AddHospitalisationModal show={showAdd} onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); refresh(); }} />
      <EditHospitalisationModal doc={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); refresh(); }} />

      <ConfirmModal
        show={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Supprimer le document"
        message={deleting && <>Supprimer le document <strong>{deleting.titre}</strong> ?</>}
        confirmLabel="Supprimer"
        irreversible
      />
    </section>
  );
}

function AddHospitalisationModal({ show, onClose, onDone }) {
  const [titre, setTitre] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) { setTitre(''); setFile(null); setError(''); }
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

function EditHospitalisationModal({ doc, onClose, onDone }) {
  const [titre, setTitre] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (doc) { setTitre(doc.titre); setError(''); }
  }, [doc]);

  if (!doc) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await labDocumentsAnnexesAPI.update(doc.id, { titre });
      onDone();
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={!!doc} onClose={onClose} title="Modifier le document">
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Titre</label>
          <input type="text" className="form-control" value={titre} onChange={(e) => setTitre(e.target.value)} required />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <span className="spinner-border spinner-border-sm me-2"></span>}
          Enregistrer
        </button>
      </form>
    </Modal>
  );
}

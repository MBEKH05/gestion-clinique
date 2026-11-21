import { useEffect, useState } from 'react';
import { specialitesAPI } from '../../api/endpoints';
import Modal from '../../components/lab/Modal';
import { JOURS_SEMAINE } from '../../utils/rendezVousUtils';

const NOUVELLE = { nom: '', dureeCreneau: 30, heureDebut: '08:00', heureFin: '17:00', jours: [1, 2, 3, 4, 5], patientsParCreneau: 1 };

const joursTexte = (jours) => JOURS_SEMAINE.filter((j) => jours.includes(j.num)).map((j) => j.court).join(', ');

// Specialites du module Rendez-vous, avec leurs horaires de consultation (Super Admin).
export default function SpecialitesRdv() {
  const [specialites, setSpecialites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edition, setEdition] = useState(null); // null | objet (id absent = creation)
  const [message, setMessage] = useState(null);

  const charger = () =>
    specialitesAPI
      .getAll()
      .then(({ data }) => setSpecialites(data))
      .finally(() => setLoading(false));

  useEffect(() => {
    charger();
  }, []);

  const basculer = async (s) => {
    setMessage(null);
    try {
      await specialitesAPI.update(s.id, versAPI({ ...s, actif: !s.actif }));
      charger();
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.detail || 'Modification impossible.' });
    }
  };

  const supprimer = async (s) => {
    if (!window.confirm(`Supprimer la specialite ${s.nom} ?`)) return;
    setMessage(null);
    try {
      await specialitesAPI.remove(s.id);
      setMessage({ type: 'success', text: `${s.nom} supprimee.` });
      charger();
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.detail || 'Suppression impossible.' });
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <h2 className="mb-0">Specialites (rendez-vous)</h2>
        <button className="btn btn-primary" onClick={() => setEdition({ ...NOUVELLE })}>
          <i className="bi bi-plus-lg me-2"></i>Ajouter une specialite
        </button>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle bg-white shadow-sm">
            <thead>
              <tr>
                <th>Specialite</th>
                <th>Jours</th>
                <th>Horaires</th>
                <th>Creneau</th>
                <th>Patients / creneau</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {specialites.map((s) => (
                <tr key={s.id}>
                  <td className="fw-bold">{s.nom}</td>
                  <td>{joursTexte(s.jours)}</td>
                  <td>
                    {s.heureDebut} - {s.heureFin}
                  </td>
                  <td>{s.dureeCreneau} min</td>
                  <td>{s.patientsParCreneau}</td>
                  <td>
                    <span className={`badge ${s.actif ? 'bg-success' : 'bg-danger'}`}>{s.actif ? 'Actif' : 'Inactif'}</span>
                  </td>
                  <td>
                    <div className="d-flex gap-1 flex-wrap">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => setEdition({ ...s })}>
                        Modifier
                      </button>
                      <button className={`btn btn-sm ${s.actif ? 'btn-outline-warning' : 'btn-outline-success'}`} onClick={() => basculer(s)}>
                        {s.actif ? 'Desactiver' : 'Activer'}
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => supprimer(s)}>
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {specialites.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    Aucune specialite.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="small text-muted">
        Une specialite inactive n'est plus proposee pour les nouveaux rendez-vous ; ses rendez-vous existants restent dans l'agenda.
      </p>

      <SpecialiteModal
        specialite={edition}
        onClose={() => setEdition(null)}
        onSaved={() => {
          setEdition(null);
          charger();
        }}
      />
    </div>
  );
}

function versAPI(s) {
  return {
    nom: s.nom.trim(),
    duree_creneau: Number(s.dureeCreneau),
    heure_debut: s.heureDebut,
    heure_fin: s.heureFin,
    jours: s.jours,
    patients_par_creneau: Number(s.patientsParCreneau),
    ...(s.actif !== undefined ? { actif: s.actif } : {}),
  };
}

function SpecialiteModal({ specialite, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    setForm(specialite ? { ...specialite } : null);
    setErreur('');
  }, [specialite]);

  // `specialite` passe a null des la fermeture, avant que l'effet ne vide `form`.
  if (!form || !specialite) return null;

  const champ = (cle) => (e) => setForm({ ...form, [cle]: e.target.value });
  const basculerJour = (num) =>
    setForm({ ...form, jours: form.jours.includes(num) ? form.jours.filter((j) => j !== num) : [...form.jours, num].sort() });

  const enregistrer = async (e) => {
    e.preventDefault();
    setErreur('');
    setEnvoi(true);
    try {
      if (form.id) await specialitesAPI.update(form.id, versAPI(form));
      else await specialitesAPI.create(versAPI(form));
      onSaved();
    } catch (err) {
      const d = err.response?.data;
      const premiere = d?.errors ? Object.values(d.errors)[0]?.[0] : null;
      setErreur(d?.detail || premiere || d?.message || 'Enregistrement impossible.');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Modal show onClose={onClose} title={form.id ? `Modifier ${specialite.nom}` : 'Nouvelle specialite'} maxWidth={560}>
      <form onSubmit={enregistrer}>
        <div className="mb-3">
          <label className="form-label small">Nom</label>
          <input className="form-control" value={form.nom} maxLength={100} onChange={champ('nom')} required />
        </div>
        <div className="mb-3">
          <label className="form-label small d-block">Jours de consultation</label>
          <div className="d-flex flex-wrap gap-1">
            {JOURS_SEMAINE.map((j) => (
              <button
                key={j.num}
                type="button"
                className={`btn btn-sm ${form.jours.includes(j.num) ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => basculerJour(j.num)}
              >
                {j.court}
              </button>
            ))}
          </div>
        </div>
        <div className="row g-2 mb-3">
          <div className="col-6">
            <label className="form-label small">Debut</label>
            <input type="time" className="form-control" value={form.heureDebut} onChange={champ('heureDebut')} required />
          </div>
          <div className="col-6">
            <label className="form-label small">Fin</label>
            <input type="time" className="form-control" value={form.heureFin} onChange={champ('heureFin')} required />
          </div>
          <div className="col-6">
            <label className="form-label small">Duree d'un creneau (min)</label>
            <input type="number" className="form-control" min={5} max={240} step={5} value={form.dureeCreneau} onChange={champ('dureeCreneau')} required />
          </div>
          <div className="col-6">
            <label className="form-label small">Patients par creneau</label>
            <input type="number" className="form-control" min={1} max={50} value={form.patientsParCreneau} onChange={champ('patientsParCreneau')} required />
          </div>
        </div>
        {erreur && <div className="alert alert-danger py-2">{erreur}</div>}
        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" disabled={envoi}>
            {envoi && <span className="spinner-border spinner-border-sm me-2"></span>}
            Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
}

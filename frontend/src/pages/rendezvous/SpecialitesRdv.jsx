import { useEffect, useState } from 'react';
import { specialitesAPI } from '../../api/endpoints';
import Modal from '../../components/lab/Modal';
import { JOURS_SEMAINE } from '../../utils/rendezVousUtils';

const NOUVELLE = {
  nom: '',
  dureeCreneau: 30,
  patientsParCreneau: 1,
  horaires: [1, 2, 3, 4, 5].map((jour) => ({ jour, debut: '08:00', fin: '17:00' })),
};

// "Lun 08:00-17:00 · Mar 15:00-17:00 · Jeu 08:00-12:00, 15:00-18:00"
const horairesTexte = (horaires = []) =>
  JOURS_SEMAINE.map((j) => {
    const plages = horaires.filter((h) => h.jour === j.num).sort((a, b) => a.debut.localeCompare(b.debut));
    return plages.length ? `${j.court} ${plages.map((h) => `${h.debut}-${h.fin}`).join(', ')}` : null;
  })
    .filter(Boolean)
    .join(' · ');

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
                  <td className="small">{horairesTexte(s.horaires) || <span className="text-muted">Aucun horaire</span>}</td>
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
                  <td colSpan={6} className="text-center text-muted py-4">
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
    horaires: s.horaires.map((h) => ({ jour: h.jour, debut: h.debut, fin: h.fin })),
    patients_par_creneau: Number(s.patientsParCreneau),
    ...(s.actif !== undefined ? { actif: s.actif } : {}),
  };
}

function SpecialiteModal({ specialite, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    setForm(specialite ? { ...specialite, horaires: (specialite.horaires || []).map((h) => ({ ...h })) } : null);
    setErreur('');
  }, [specialite]);

  // `specialite` passe a null des la fermeture, avant que l'effet ne vide `form`.
  if (!form || !specialite) return null;

  const champ = (cle) => (e) => setForm({ ...form, [cle]: e.target.value });
  // Horaires : liste de plages { jour, debut, fin } (plusieurs plages possibles le meme jour).
  const basculerJour = (num) =>
    setForm({
      ...form,
      horaires: form.horaires.some((h) => h.jour === num)
        ? form.horaires.filter((h) => h.jour !== num)
        : [...form.horaires, { jour: num, debut: '08:00', fin: '17:00' }],
    });
  const ajouterPlage = (num) => {
    const duJour = form.horaires.filter((h) => h.jour === num);
    const derniere = duJour[duJour.length - 1];
    const debut = derniere ? derniere.fin : '08:00';
    setForm({ ...form, horaires: [...form.horaires, { jour: num, debut, fin: debut < '18:00' ? '18:00' : '20:00' }] });
  };
  const retirerPlage = (idx) => setForm({ ...form, horaires: form.horaires.filter((_, i) => i !== idx) });
  const majPlage = (idx, cle) => (e) =>
    setForm({ ...form, horaires: form.horaires.map((h, i) => (i === idx ? { ...h, [cle]: e.target.value } : h)) });

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
    <Modal show onClose={onClose} title={form.id ? `Modifier ${specialite.nom}` : 'Nouvelle specialite'} maxWidth={640}>
      <form onSubmit={enregistrer}>
        <div className="mb-3">
          <label className="form-label small">Nom</label>
          <input className="form-control" value={form.nom} maxLength={100} onChange={champ('nom')} required />
        </div>
        <div className="mb-3">
          <label className="form-label small d-block">Horaires de consultation (jour par jour)</label>
          {JOURS_SEMAINE.map((j) => {
            const plages = form.horaires.map((h, idx) => ({ ...h, idx })).filter((h) => h.jour === j.num);
            const actif = plages.length > 0;
            return (
              <div key={j.num} className="d-flex align-items-start gap-2 py-1 border-bottom">
                <div className="form-check pt-1" style={{ minWidth: 110 }}>
                  <input className="form-check-input" type="checkbox" id={`jour-${j.num}`} checked={actif} onChange={() => basculerJour(j.num)} />
                  <label className="form-check-label" htmlFor={`jour-${j.num}`}>
                    {j.long}
                  </label>
                </div>
                {actif ? (
                  <div className="flex-grow-1">
                    {plages.map((h) => (
                      <div key={h.idx} className="d-flex align-items-center gap-1 mb-1">
                        <input type="time" className="form-control form-control-sm" value={h.debut} onChange={majPlage(h.idx, 'debut')} required />
                        <span className="text-muted">a</span>
                        <input type="time" className="form-control form-control-sm" value={h.fin} onChange={majPlage(h.idx, 'fin')} required />
                        <button type="button" className="btn btn-sm btn-outline-danger" title="Retirer cette plage" onClick={() => retirerPlage(h.idx)}>
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    ))}
                    <button type="button" className="btn btn-link btn-sm p-0" onClick={() => ajouterPlage(j.num)}>
                      + plage
                    </button>
                  </div>
                ) : (
                  <span className="text-muted small pt-1">Pas de consultation</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="row g-2 mb-3">
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

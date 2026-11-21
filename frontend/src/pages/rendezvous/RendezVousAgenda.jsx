import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { rendezVousAPI, specialitesAPI } from '../../api/endpoints';
import Modal from '../../components/lab/Modal';
import CreneauxPicker from '../../components/rendezvous/CreneauxPicker';
import WhatsAppButtons from '../../components/rendezvous/WhatsAppButtons';
import { STATUTS_RDV, ajouterJours, dateISO, dateLongue } from '../../utils/rendezVousUtils';

const ACTIONS_STATUT = [
  { statut: 'CONFIRME', label: 'Confirme', icon: 'bi-check2' },
  { statut: 'VENU', label: 'Venu', icon: 'bi-person-check' },
  { statut: 'ABSENT', label: 'Absent', icon: 'bi-person-x' },
  { statut: 'ANNULE', label: 'Annuler', icon: 'bi-x-lg' },
];

// Agenda des rendez-vous d'un jour, filtrable par specialite et statut.
export default function RendezVousAgenda() {
  const [params, setParams] = useSearchParams();
  const date = params.get('date') || dateISO();
  const specialiteId = params.get('specialite') || '';
  const [statut, setStatut] = useState('');
  const [search, setSearch] = useState('');
  const [specialites, setSpecialites] = useState([]);
  const [rdvs, setRdvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');
  const [deplacement, setDeplacement] = useState(null);

  const changer = (cle, valeur) => {
    const p = new URLSearchParams(params);
    if (valeur) p.set(cle, valeur);
    else p.delete(cle);
    setParams(p, { replace: true });
  };

  useEffect(() => {
    specialitesAPI.getAll().then(({ data }) => setSpecialites(data));
  }, []);

  const charger = useCallback(() => {
    setLoading(true);
    setErreur('');
    rendezVousAPI
      .getAll({ date_debut: date, date_fin: date, specialite_id: specialiteId || undefined, statut: statut || undefined, search: search.trim() || undefined })
      .then(({ data }) => setRdvs(data.resultats))
      .catch(() => setErreur('Impossible de charger les rendez-vous.'))
      .finally(() => setLoading(false));
  }, [date, specialiteId, statut, search]);

  useEffect(() => {
    const t = setTimeout(charger, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [charger, search]);

  const remplacer = (maj) => setRdvs((liste) => liste.map((r) => (r.id === maj.id ? maj : r)));

  const changerStatut = async (rdv, nouveau) => {
    if (nouveau === 'ANNULE' && !window.confirm(`Annuler le rendez-vous de ${rdv.patientNom} a ${rdv.heure} ?`)) return;
    try {
      const { data } = await rendezVousAPI.updateStatut(rdv.id, nouveau);
      remplacer(data);
    } catch (err) {
      window.alert(err.response?.data?.detail || 'Changement de statut impossible.');
    }
  };

  const compte = (s) => rdvs.filter((r) => r.statut === s).length;
  const actifs = rdvs.filter((r) => r.statut !== 'ANNULE').length;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <h2 className="mb-0">Agenda des rendez-vous</h2>
        <Link to={`/rendez-vous/nouveau?date=${date >= dateISO() ? date : dateISO()}${specialiteId ? `&specialite=${specialiteId}` : ''}`} className="btn btn-primary">
          <i className="bi bi-plus-lg me-2"></i>Nouveau rendez-vous
        </Link>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-lg-4">
              <label className="form-label small">Date</label>
              <div className="input-group">
                <button className="btn btn-outline-secondary" title="Jour precedent" onClick={() => changer('date', ajouterJours(date, -1))}>
                  <i className="bi bi-chevron-left"></i>
                </button>
                <input type="date" className="form-control" value={date} onChange={(e) => changer('date', e.target.value)} />
                <button className="btn btn-outline-secondary" title="Jour suivant" onClick={() => changer('date', ajouterJours(date, 1))}>
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
              <div className="d-flex gap-1 mt-1">
                <button className="btn btn-link btn-sm p-0 me-2" onClick={() => changer('date', dateISO())}>Aujourd'hui</button>
                <button className="btn btn-link btn-sm p-0" onClick={() => changer('date', ajouterJours(dateISO(), 1))}>Demain (rappels)</button>
              </div>
            </div>
            <div className="col-lg-3 col-md-4">
              <label className="form-label small">Specialite</label>
              <select className="form-select" value={specialiteId} onChange={(e) => changer('specialite', e.target.value)}>
                <option value="">Toutes les specialites</option>
                {specialites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom}
                    {s.actif ? '' : ' (inactive)'}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-lg-2 col-md-4">
              <label className="form-label small">Statut</label>
              <select className="form-select" value={statut} onChange={(e) => setStatut(e.target.value)}>
                <option value="">Tous</option>
                {Object.entries(STATUTS_RDV).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-lg-3 col-md-4">
              <label className="form-label small">Recherche</label>
              <input className="form-control" placeholder="Nom ou telephone..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
        <h5 className="mb-0 text-capitalize">{dateLongue(date)}</h5>
        <div className="d-flex gap-2 flex-wrap small">
          <span className="badge bg-light text-dark border">{actifs} rendez-vous</span>
          {['CONFIRME', 'VENU', 'ABSENT', 'ANNULE'].map((s) =>
            compte(s) > 0 ? (
              <span key={s} className={`badge ${STATUTS_RDV[s].className}`}>
                {compte(s)} {STATUTS_RDV[s].label.toLowerCase()}
              </span>
            ) : null
          )}
        </div>
      </div>

      {erreur && <div className="alert alert-danger">{erreur}</div>}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : rdvs.length === 0 ? (
        <div className="alert alert-info">Aucun rendez-vous pour ce jour.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle bg-white shadow-sm">
            <thead>
              <tr>
                <th>Heure</th>
                <th>Patient</th>
                <th>Specialite</th>
                <th>Statut</th>
                <th>WhatsApp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rdvs.map((r) => {
                const st = STATUTS_RDV[r.statut] || { label: r.statut, className: 'bg-secondary' };
                const annule = r.statut === 'ANNULE';
                return (
                  <tr key={r.id} className={annule ? 'text-muted' : ''}>
                    <td className="fw-bold">{r.heure}</td>
                    <td>
                      <div className={annule ? 'text-decoration-line-through' : ''}>{r.patientNom}</div>
                      <div className="small text-muted">
                        {r.telephone || 'pas de telephone'}
                        {r.motif && <> - {r.motif}</>}
                      </div>
                    </td>
                    <td>{r.specialite}</td>
                    <td>
                      <span className={`badge ${st.className}`}>{st.label}</span>
                    </td>
                    <td>
                      <WhatsAppButtons rdv={r} types={annule ? ['annulation'] : ['confirmation', 'rappel']} onSent={remplacer} />
                      {r.whatsappEnvoyeLe && (
                        <div className="small text-success mt-1" title="Dernier message WhatsApp ouvert">
                          <i className="bi bi-check2-all me-1"></i>
                          {new Date(r.whatsappEnvoyeLe).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="d-flex gap-1 flex-wrap">
                        {ACTIONS_STATUT.filter((a) => a.statut !== r.statut).map((a) => (
                          <button
                            key={a.statut}
                            className={`btn btn-sm ${a.statut === 'ANNULE' ? 'btn-outline-danger' : 'btn-outline-secondary'}`}
                            title={a.label}
                            onClick={() => changerStatut(r, a.statut)}
                          >
                            <i className={`bi ${a.icon}`}></i>
                          </button>
                        ))}
                        {annule && (
                          <button className="btn btn-sm btn-outline-primary" title="Retablir" onClick={() => changerStatut(r, 'PREVU')}>
                            <i className="bi bi-arrow-counterclockwise"></i>
                          </button>
                        )}
                        <button className="btn btn-sm btn-outline-primary" title="Deplacer" onClick={() => setDeplacement(r)}>
                          <i className="bi bi-calendar2-week"></i>
                        </button>
                        {!annule && (
                          <Link to={`/devis/creer?rdv=${r.id}`} className="btn btn-sm btn-primary" title="Faire le devis de ce patient">
                            <i className="bi bi-file-earmark-plus me-1"></i>Devis
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <DeplacerModal
        rdv={deplacement}
        specialites={specialites}
        onClose={() => setDeplacement(null)}
        onDone={(maj) => {
          setDeplacement(null);
          if (maj.date === date) remplacer(maj);
          else charger();
        }}
      />
    </div>
  );
}

function DeplacerModal({ rdv, specialites, onClose, onDone }) {
  const [specialiteId, setSpecialiteId] = useState('');
  const [date, setDate] = useState('');
  const [heure, setHeure] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (rdv) {
      setSpecialiteId(rdv.specialiteId);
      setDate(rdv.date >= dateISO() ? rdv.date : dateISO());
      setHeure('');
      setErreur('');
    }
  }, [rdv]);

  if (!rdv) return null;

  const valider = async () => {
    if (!heure) {
      setErreur('Choisissez un creneau.');
      return;
    }
    setEnvoi(true);
    try {
      const { data } = await rendezVousAPI.update(rdv.id, { specialite_id: specialiteId, date, heure });
      onDone(data);
    } catch (err) {
      setErreur(err.response?.data?.detail || 'Deplacement impossible.');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Modal show onClose={onClose} title={`Deplacer le rendez-vous de ${rdv.patientNom}`} maxWidth={640}>
      <div className="small text-muted mb-3">
        Actuellement : {rdv.specialite}, {dateLongue(rdv.date)} a {rdv.heure}
      </div>
      <div className="row g-2 mb-3">
        <div className="col-sm-6">
          <label className="form-label small">Specialite</label>
          <select className="form-select" value={specialiteId} onChange={(e) => { setSpecialiteId(e.target.value); setHeure(''); }}>
            {specialites.filter((s) => s.actif || s.id === rdv.specialiteId).map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </div>
        <div className="col-sm-6">
          <label className="form-label small">Nouvelle date</label>
          <input type="date" className="form-control" value={date} min={dateISO()} onChange={(e) => { setDate(e.target.value); setHeure(''); }} />
        </div>
      </div>
      <CreneauxPicker specialiteId={specialiteId} date={date} value={heure} onChange={setHeure} exclure={rdv.id} />
      {erreur && <div className="alert alert-danger py-2 mt-3 mb-0">{erreur}</div>}
      <p className="small text-muted mt-3 mb-2">Pensez ensuite a renvoyer la confirmation par WhatsApp avec la nouvelle date.</p>
      <div className="d-flex justify-content-end gap-2">
        <button className="btn btn-outline-secondary" onClick={onClose}>
          Fermer
        </button>
        <button className="btn btn-primary" onClick={valider} disabled={envoi || !heure}>
          {envoi && <span className="spinner-border spinner-border-sm me-2"></span>}
          Deplacer{heure ? ` a ${heure}` : ''}
        </button>
      </div>
    </Modal>
  );
}

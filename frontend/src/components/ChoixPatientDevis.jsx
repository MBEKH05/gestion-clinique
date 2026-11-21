import { useEffect, useState } from 'react';
import { patientsAPI, rendezVousAPI } from '../api/endpoints';
import { convertPatientFromAPI } from '../utils/apiConverters';
import { STATUTS_RDV, dateISO } from '../utils/rendezVousUtils';

const ONGLETS = [
  { key: 'rdv', label: 'Rendez-vous du jour', icon: 'bi-calendar-check' },
  { key: 'existant', label: 'Patient deja enregistre', icon: 'bi-person-check' },
  { key: 'nouveau', label: 'Nouveau patient', icon: 'bi-person-plus' },
];

// Choix du patient d'un nouveau devis : depuis un rendez-vous du jour, un
// patient deja enregistre, ou un nouveau patient (saisie libre).
//  - onPatient(patient, rdv) : patient deja enregistre (rdv = rendez-vous d'origine ou null)
//  - onNouveau(nom, rdv)     : nouveau patient, nom eventuellement pre-rempli depuis le rendez-vous
export default function ChoixPatientDevis({ ongletInitial = 'rdv', onPatient, onNouveau }) {
  const [onglet, setOnglet] = useState(ongletInitial);
  const [rdvs, setRdvs] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [resultats, setResultats] = useState([]);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    if (onglet !== 'rdv' || rdvs) return;
    const jour = dateISO();
    rendezVousAPI
      .getAll({ date_debut: jour, date_fin: jour })
      .then(({ data }) => setRdvs(data.resultats.filter((r) => r.statut !== 'ANNULE')))
      .catch(() => setRdvs([]));
  }, [onglet, rdvs]);

  useEffect(() => {
    if (onglet !== 'existant' || recherche.trim().length < 2) {
      setResultats([]);
      return undefined;
    }
    const t = setTimeout(() => {
      setChargement(true);
      patientsAPI
        .search(recherche.trim(), 1, 15)
        .then(({ data }) => setResultats((data.results || []).map(convertPatientFromAPI)))
        .finally(() => setChargement(false));
    }, 300);
    return () => clearTimeout(t);
  }, [recherche, onglet]);

  const choisirRdv = async (rdv) => {
    if (rdv.patientId) {
      try {
        const { data } = await patientsAPI.get(rdv.patientId);
        onPatient(convertPatientFromAPI(data), rdv);
        return;
      } catch {
        // fiche introuvable : on repart du nom du rendez-vous
      }
    }
    onNouveau(rdv.patientNom, rdv);
  };

  const changerOnglet = (key) => {
    setOnglet(key);
    if (key === 'nouveau') onNouveau('', null);
  };

  return (
    <div className="mb-3">
      <div className="btn-group flex-wrap mb-3" role="group">
        {ONGLETS.map((o) => (
          <button
            key={o.key}
            type="button"
            className={`btn btn-sm ${onglet === o.key ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => changerOnglet(o.key)}
          >
            <i className={`bi ${o.icon} me-1`}></i>
            {o.label}
          </button>
        ))}
      </div>

      {onglet === 'rdv' &&
        (rdvs === null ? (
          <div className="small text-muted">
            <span className="spinner-border spinner-border-sm me-2"></span>Chargement des rendez-vous...
          </div>
        ) : rdvs.length === 0 ? (
          <div className="small text-muted">Aucun rendez-vous aujourd'hui. Choisissez un patient deja enregistre ou un nouveau patient.</div>
        ) : (
          <div className="list-group" style={{ maxHeight: 260, overflowY: 'auto' }}>
            {rdvs.map((r) => {
              const st = STATUTS_RDV[r.statut] || { label: r.statut, className: 'bg-secondary' };
              return (
                <button
                  type="button"
                  key={r.id}
                  className="list-group-item list-group-item-action d-flex justify-content-between align-items-center gap-2"
                  onClick={() => choisirRdv(r)}
                >
                  <span>
                    <strong className="me-2">{r.heure}</strong>
                    {r.patientNom}
                    <span className="text-muted small ms-2">{r.specialite}</span>
                    {!r.patientId && <span className="badge bg-light text-dark border ms-2">non enregistre</span>}
                  </span>
                  <span className={`badge ${st.className}`}>{st.label}</span>
                </button>
              );
            })}
          </div>
        ))}

      {onglet === 'existant' && (
        <div className="position-relative">
          <input
            className="form-control"
            placeholder="Rechercher par nom ou matricule (2 caracteres minimum)..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            autoFocus
          />
          {chargement && <div className="small text-muted mt-1">Recherche...</div>}
          {resultats.length > 0 && (
            <div className="list-group mt-1" style={{ maxHeight: 260, overflowY: 'auto' }}>
              {resultats.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className="list-group-item list-group-item-action d-flex justify-content-between"
                  onClick={() => {
                    onPatient(p, null);
                    setRecherche('');
                    setResultats([]);
                  }}
                >
                  <span>
                    {p.nomComplet}
                    {p.matricule && <span className="text-muted small ms-2">{p.matricule}</span>}
                  </span>
                  <span className="small text-muted">{p.typePriseEnCharge}</span>
                </button>
              ))}
            </div>
          )}
          {!chargement && recherche.trim().length >= 2 && resultats.length === 0 && (
            <div className="small text-muted mt-1">Aucun patient trouve.</div>
          )}
        </div>
      )}
    </div>
  );
}

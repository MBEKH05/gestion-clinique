import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { patientsAPI, rendezVousAPI, specialitesAPI } from '../../api/endpoints';
import CreneauxPicker from '../../components/rendezvous/CreneauxPicker';
import WhatsAppButtons from '../../components/rendezvous/WhatsAppButtons';
import { dateISO, dateLongue } from '../../utils/rendezVousUtils';

const VIDE = { patientId: '', patientNom: '', telephone: '', motif: '' };

// Prise de rendez-vous : specialite -> date -> creneau libre -> patient.
export default function RendezVousForm() {
  const [params] = useSearchParams();
  const [specialites, setSpecialites] = useState([]);
  const [specialiteId, setSpecialiteId] = useState(params.get('specialite') || '');
  const [date, setDate] = useState(params.get('date') || dateISO());
  const [heure, setHeure] = useState('');
  const [patient, setPatient] = useState(VIDE);
  const [modePatient, setModePatient] = useState('nouveau');
  const [recherche, setRecherche] = useState('');
  const [resultats, setResultats] = useState([]);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [cree, setCree] = useState(null);

  useEffect(() => {
    specialitesAPI.getAll().then(({ data }) => setSpecialites(data.filter((s) => s.actif)));
  }, []);

  useEffect(() => setHeure(''), [specialiteId, date]);

  // Recherche d'un patient deja enregistre (avec un petit delai pendant la frappe).
  useEffect(() => {
    if (modePatient !== 'existant' || recherche.trim().length < 2) {
      setResultats([]);
      return undefined;
    }
    const t = setTimeout(() => {
      patientsAPI.search(recherche.trim(), 1, 10).then(({ data }) => setResultats(data.results || []));
    }, 300);
    return () => clearTimeout(t);
  }, [recherche, modePatient]);

  const choisirPatient = (p) => {
    setPatient((prev) => ({ ...prev, patientId: p.id, patientNom: p.nom_complet }));
    setResultats([]);
    setRecherche(p.nom_complet);
  };

  const changerMode = (mode) => {
    setModePatient(mode);
    setPatient((prev) => ({ ...prev, patientId: '', patientNom: '' }));
    setRecherche('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');
    if (!specialiteId || !heure) {
      setErreur('Choisissez une specialite, une date et un creneau.');
      return;
    }
    if (!patient.patientNom.trim()) {
      setErreur(modePatient === 'existant' ? 'Choisissez un patient dans la liste.' : 'Le nom du patient est requis.');
      return;
    }
    setEnregistrement(true);
    try {
      const { data } = await rendezVousAPI.create({
        specialite_id: specialiteId,
        date,
        heure,
        patient_id: patient.patientId || undefined,
        patient_nom: patient.patientNom.trim(),
        telephone: patient.telephone.trim() || undefined,
        motif: patient.motif.trim() || undefined,
      });
      setCree(data);
    } catch (err) {
      setErreur(err.response?.data?.detail || err.response?.data?.message || "Impossible d'enregistrer le rendez-vous.");
    } finally {
      setEnregistrement(false);
    }
  };

  const recommencer = () => {
    setCree(null);
    setHeure('');
    setPatient(VIDE);
    setRecherche('');
  };

  if (cree) {
    return (
      <div>
        <h2 className="mb-4">Rendez-vous enregistre</h2>
        <div className="card shadow-sm" style={{ maxWidth: 640 }}>
          <div className="card-body">
            <div className="d-flex align-items-center mb-3">
              <i className="bi bi-check-circle-fill text-success fs-2 me-3"></i>
              <div>
                <div className="fw-bold fs-5">{cree.patientNom}</div>
                <div>
                  {cree.specialite} - {dateLongue(cree.date)} a <strong>{cree.heure}</strong>
                </div>
                {cree.telephone && <div className="text-muted small">Tel : {cree.telephone}</div>}
              </div>
            </div>
            <div className="mb-3">
              <div className="small text-muted mb-1">Envoyer la confirmation au patient :</div>
              <WhatsAppButtons rdv={cree} types={['confirmation']} size="md" withLabels onSent={setCree} />
              {cree.whatsappEnvoyeLe && <span className="badge bg-success ms-2">WhatsApp ouvert</span>}
              {!cree.telephone && (
                <div className="small text-warning mt-1">Pas de numero : il faudra choisir le contact dans WhatsApp.</div>
              )}
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <button className="btn btn-primary" onClick={recommencer}>
                <i className="bi bi-plus-lg me-2"></i>Nouveau rendez-vous
              </button>
              <Link to={`/rendez-vous?date=${cree.date}`} className="btn btn-outline-secondary">
                Voir l'agenda du jour
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <h2 className="mb-0">Nouveau rendez-vous</h2>
        <Link to="/rendez-vous" className="btn btn-outline-secondary">
          <i className="bi bi-calendar3 me-2"></i>Agenda
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card shadow-sm mb-3">
          <div className="card-body">
            <h5 className="card-title">1. Specialite et creneau</h5>
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label small">Specialite</label>
                <select className="form-select" value={specialiteId} onChange={(e) => setSpecialiteId(e.target.value)} required>
                  <option value="">-- Choisir une specialite --</option>
                  {specialites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label small">Date</label>
                <input type="date" className="form-control" value={date} min={dateISO()} onChange={(e) => setDate(e.target.value)} required />
              </div>
            </div>
            <CreneauxPicker specialiteId={specialiteId} date={date} value={heure} onChange={setHeure} />
          </div>
        </div>

        <div className="card shadow-sm mb-3">
          <div className="card-body">
            <h5 className="card-title">2. Patient</h5>
            <div className="btn-group mb-3">
              <button type="button" className={`btn btn-sm ${modePatient === 'nouveau' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => changerMode('nouveau')}>
                Nouveau patient
              </button>
              <button type="button" className={`btn btn-sm ${modePatient === 'existant' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => changerMode('existant')}>
                Patient deja enregistre
              </button>
            </div>
            <div className="row g-3">
              <div className="col-md-6 position-relative">
                <label className="form-label small">Nom complet</label>
                {modePatient === 'nouveau' ? (
                  <input
                    className="form-control"
                    value={patient.patientNom}
                    maxLength={200}
                    onChange={(e) => setPatient({ ...patient, patientNom: e.target.value })}
                    placeholder="Prenom et nom"
                  />
                ) : (
                  <>
                    <input
                      className="form-control"
                      value={recherche}
                      onChange={(e) => {
                        setRecherche(e.target.value);
                        setPatient({ ...patient, patientId: '', patientNom: '' });
                      }}
                      placeholder="Rechercher (nom ou matricule)..."
                    />
                    {resultats.length > 0 && (
                      <div className="list-group position-absolute w-100 shadow" style={{ zIndex: 10 }}>
                        {resultats.map((p) => (
                          <button type="button" key={p.id} className="list-group-item list-group-item-action" onClick={() => choisirPatient(p)}>
                            {p.nom_complet}
                            {p.matricule && <span className="text-muted small ms-2">{p.matricule}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {patient.patientId && <div className="small text-success mt-1">Patient selectionne : {patient.patientNom}</div>}
                  </>
                )}
              </div>
              <div className="col-md-6">
                <label className="form-label small">Telephone (WhatsApp)</label>
                <input
                  className="form-control"
                  value={patient.telephone}
                  maxLength={30}
                  onChange={(e) => setPatient({ ...patient, telephone: e.target.value })}
                  placeholder="77 123 45 67"
                  inputMode="tel"
                />
                <div className="form-text">Sans indicatif, +221 est ajoute automatiquement.</div>
              </div>
              <div className="col-12">
                <label className="form-label small">Motif (facultatif)</label>
                <input className="form-control" value={patient.motif} maxLength={255} onChange={(e) => setPatient({ ...patient, motif: e.target.value })} />
              </div>
            </div>
          </div>
        </div>

        {erreur && <div className="alert alert-danger">{erreur}</div>}

        <button type="submit" className="btn btn-primary" disabled={enregistrement}>
          {enregistrement && <span className="spinner-border spinner-border-sm me-2"></span>}
          Enregistrer le rendez-vous{heure ? ` de ${heure}` : ''}
        </button>
      </form>
    </div>
  );
}

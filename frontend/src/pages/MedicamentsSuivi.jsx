import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { medicamentsAPI } from '../api/endpoints';
import { useData } from '../context/DataContext';
import { formatMontant } from '../utils/devisUtils';
import { generatePDFSuiviMedicaments } from '../utils/pdfUtils';

const TYPE_LABELS = { IPM: 'IPM', ASSURANCE: 'Assurance', CAISSE: 'Caisse' };
const STATUT_BADGES = {
  NON_REGLE: { label: 'Non regle', couleur: 'danger' },
  PARTIELLEMENT_REGLE: { label: 'Partiel', couleur: 'warning' },
  REGLE: { label: 'Regle', couleur: 'success' },
};

const toISODate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const formatJour = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '-');
const formatHeure = (iso) => (iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '');

const ONGLETS = [
  { value: 'jour', label: 'Par jour', icon: 'bi-calendar-day' },
  { value: 'medicament', label: 'Par medicament', icon: 'bi-capsule' },
  { value: 'details', label: 'Detail des ventes', icon: 'bi-list-ul' },
];

export default function MedicamentsSuivi() {
  const { analyses } = useData();
  const now = new Date();
  const [dateDebut, setDateDebut] = useState(toISODate(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [dateFin, setDateFin] = useState(toISODate(now));
  const [analyseId, setAnalyseId] = useState('');
  const [type, setType] = useState('');
  const [onglet, setOnglet] = useState('jour');
  const [jourChoisi, setJourChoisi] = useState('');
  const [recherche, setRecherche] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const medicaments = useMemo(
    () => analyses.filter((a) => a.categorie === 'medicament').sort((a, b) => a.nom.localeCompare(b.nom)),
    [analyses]
  );

  useEffect(() => {
    setLoading(true);
    setError('');
    medicamentsAPI
      .getSuivi({
        date_debut: dateDebut,
        date_fin: dateFin,
        analyse_id: analyseId || undefined,
        type_prise_en_charge: type || undefined,
      })
      .then(({ data }) => setData(data))
      .catch((err) => setError(err.response?.data?.message || 'Erreur lors du chargement du suivi.'))
      .finally(() => setLoading(false));
  }, [dateDebut, dateFin, analyseId, type]);

  const raccourci = (cle) => {
    const d = new Date();
    if (cle === 'jour') {
      setDateDebut(toISODate(d));
      setDateFin(toISODate(d));
    } else if (cle === 'semaine') {
      const debut = new Date(d);
      debut.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      setDateDebut(toISODate(debut));
      setDateFin(toISODate(d));
    } else {
      setDateDebut(toISODate(new Date(d.getFullYear(), d.getMonth(), 1)));
      setDateFin(toISODate(d));
    }
  };

  const detailsFiltres = useMemo(() => {
    if (!data) return [];
    const q = recherche.trim().toLowerCase();
    return data.details
      .filter((d) => !jourChoisi || d.jour === jourChoisi)
      .filter(
        (d) =>
          !q ||
          [d.medicament, d.patientNom, d.matricule, d.devisNumero, d.entiteNom]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
      );
  }, [data, jourChoisi, recherche]);

  const voirJour = (jour) => {
    setJourChoisi(jour);
    setOnglet('details');
  };

  const resume = data?.resume;
  const cartes = resume
    ? [
        { label: 'Quantite vendue', valeur: resume.quantiteTotale, icon: 'bi-capsule', couleur: 'primary' },
        { label: 'Montant total', valeur: `${formatMontant(resume.montantTotal)} FCFA`, icon: 'bi-cash-stack', couleur: 'success' },
        { label: 'Medicaments differents', valeur: resume.nbMedicaments, icon: 'bi-grid', couleur: 'info' },
        { label: 'Devis concernes', valeur: resume.nbDevis, icon: 'bi-file-earmark-text', couleur: 'secondary' },
        { label: 'Patients', valeur: resume.nbPatients, icon: 'bi-people', couleur: 'warning' },
        {
          label: 'Moyenne / jour de vente',
          valeur: resume.nbJours ? Math.round((resume.quantiteTotale / resume.nbJours) * 10) / 10 : 0,
          icon: 'bi-graph-up',
          couleur: 'danger',
        },
      ]
    : [];

  const nomMedicament = medicaments.find((m) => m.id === analyseId)?.nom;

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h2 className="mb-0">
          <i className="bi bi-capsule me-2"></i>Suivi des medicaments
        </h2>
        <div className="d-flex gap-2">
          <Link to="/base-de-donnees/medicament" className="btn btn-outline-secondary">
            <i className="bi bi-arrow-left me-1"></i>Liste des medicaments
          </Link>
          <button
            className="btn btn-outline-danger"
            disabled={!data || data.details.length === 0}
            onClick={() => generatePDFSuiviMedicaments(data, { nomMedicament, type: TYPE_LABELS[type] })}
          >
            <i className="bi bi-file-earmark-pdf me-1"></i>Exporter PDF
          </button>
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-2">
              <label className="form-label small">Du</label>
              <input type="date" className="form-control" value={dateDebut} max={dateFin} onChange={(e) => setDateDebut(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label small">Au</label>
              <input type="date" className="form-control" value={dateFin} min={dateDebut} onChange={(e) => setDateFin(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label small">Medicament</label>
              <select className="form-select" value={analyseId} onChange={(e) => setAnalyseId(e.target.value)}>
                <option value="">Tous les medicaments</option>
                {medicaments.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small">Prise en charge</label>
              <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Toutes</option>
                <option value="IPM">IPM</option>
                <option value="ASSURANCE">Assurance</option>
                <option value="CAISSE">Caisse</option>
              </select>
            </div>
            <div className="col-md-3 d-flex gap-1">
              <button className="btn btn-outline-primary btn-sm flex-fill" onClick={() => raccourci('jour')}>
                Aujourd'hui
              </button>
              <button className="btn btn-outline-primary btn-sm flex-fill" onClick={() => raccourci('semaine')}>
                Semaine
              </button>
              <button className="btn btn-outline-primary btn-sm flex-fill" onClick={() => raccourci('mois')}>
                Mois
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading && !data ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : data ? (
        <>
          <div className="row g-3 mb-3">
            {cartes.map((c) => (
              <div className="col-6 col-md-4 col-xl-2" key={c.label}>
                <div className={`card shadow-sm h-100 border-start border-4 border-${c.couleur}`}>
                  <div className="card-body py-2">
                    <div className="text-muted small">
                      <i className={`bi ${c.icon} me-1`}></i>
                      {c.label}
                    </div>
                    <div className={`fs-5 fw-bold text-${c.couleur}`}>{c.valeur}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <ul className="nav nav-tabs mb-3">
            {ONGLETS.map((o) => (
              <li className="nav-item" key={o.value}>
                <button type="button" className={`nav-link ${onglet === o.value ? 'active' : ''}`} onClick={() => setOnglet(o.value)}>
                  <i className={`bi ${o.icon} me-1`}></i>
                  {o.label}
                </button>
              </li>
            ))}
            {loading && <li className="ms-auto spinner-border spinner-border-sm text-primary align-self-center"></li>}
          </ul>

          {onglet === 'jour' && (
            <div className="table-responsive">
              <table className="table table-hover table-bordered bg-white">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th className="text-end">Quantite vendue</th>
                    <th className="text-end">Medicaments differents</th>
                    <th className="text-end">Devis</th>
                    <th className="text-end">Montant</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.parJour.map((j) => (
                    <tr key={j.jour}>
                      <td className="fw-semibold">{formatJour(j.jour)}</td>
                      <td className="text-end fw-bold">{j.quantite}</td>
                      <td className="text-end">{j.nbMedicaments}</td>
                      <td className="text-end">{j.nbDevis}</td>
                      <td className="text-end">{formatMontant(j.montant)} FCFA</td>
                      <td className="text-center">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => voirJour(j.jour)}>
                          Voir le detail
                        </button>
                      </td>
                    </tr>
                  ))}
                  {data.parJour.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-3">
                        Aucune vente de medicament sur cette periode.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {onglet === 'medicament' && (
            <div className="table-responsive">
              <table className="table table-hover table-bordered bg-white">
                <thead className="table-light">
                  <tr>
                    <th>Medicament</th>
                    <th className="text-end">Quantite vendue</th>
                    <th className="text-end">Jours de vente</th>
                    <th className="text-end">Moyenne / jour</th>
                    <th className="text-end">Devis</th>
                    <th className="text-end">Montant</th>
                    <th>Derniere vente</th>
                  </tr>
                </thead>
                <tbody>
                  {data.parMedicament.map((m) => (
                    <tr key={m.analyseId} role="button" onClick={() => setAnalyseId(m.analyseId)} title="Filtrer sur ce medicament">
                      <td className="fw-semibold">{m.medicament}</td>
                      <td className="text-end fw-bold">{m.quantite}</td>
                      <td className="text-end">{m.nbJours}</td>
                      <td className="text-end">{Math.round((m.quantite / (m.nbJours || 1)) * 10) / 10}</td>
                      <td className="text-end">{m.nbDevis}</td>
                      <td className="text-end">{formatMontant(m.montant)} FCFA</td>
                      <td>
                        {formatJour(m.derniereVente)} {formatHeure(m.derniereVente)}
                      </td>
                    </tr>
                  ))}
                  {data.parMedicament.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-3">
                        Aucune vente de medicament sur cette periode.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {onglet === 'details' && (
            <>
              <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                <input
                  type="text"
                  className="form-control"
                  style={{ maxWidth: 320 }}
                  placeholder="Rechercher (medicament, patient, matricule, n° devis...)"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                />
                {jourChoisi && (
                  <span className="badge bg-primary fs-6">
                    {formatJour(jourChoisi)}
                    <button type="button" className="btn-close btn-close-white ms-2" style={{ fontSize: '0.6rem' }} onClick={() => setJourChoisi('')}></button>
                  </span>
                )}
                <span className="text-muted small ms-auto">
                  {detailsFiltres.length} vente(s) &middot; {detailsFiltres.reduce((s, d) => s + d.quantite, 0)} unite(s)
                </span>
              </div>
              <div className="table-responsive">
                <table className="table table-sm table-hover table-bordered bg-white">
                  <thead className="table-light">
                    <tr>
                      <th>Date / heure</th>
                      <th>N&deg; devis</th>
                      <th>Medicament</th>
                      <th className="text-end">Qte</th>
                      <th className="text-end">Prix unit.</th>
                      <th className="text-end">Montant</th>
                      <th>Patient</th>
                      <th>Matricule</th>
                      <th>Prise en charge</th>
                      <th>Paiement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailsFiltres.map((d) => {
                      const statut = STATUT_BADGES[d.statutPaiement] ?? STATUT_BADGES.NON_REGLE;
                      return (
                        <tr key={d.id}>
                          <td className="text-nowrap">
                            {formatJour(d.date)} <span className="text-muted">{formatHeure(d.date)}</span>
                          </td>
                          <td>
                            <Link to={`/devis/${d.devisId}`}>{d.devisNumero}</Link>
                          </td>
                          <td>{d.medicament}</td>
                          <td className="text-end fw-bold">{d.quantite}</td>
                          <td className="text-end">{formatMontant(d.prixUnitaire)}</td>
                          <td className="text-end">{formatMontant(d.montant)}</td>
                          <td>{d.patientNom || '-'}</td>
                          <td>{d.matricule || '-'}</td>
                          <td>
                            {TYPE_LABELS[d.typePriseEnCharge] ?? '-'}
                            {d.entiteNom && d.typePriseEnCharge !== 'CAISSE' ? ` - ${d.entiteNom}` : ''}
                          </td>
                          <td>
                            <span className={`badge bg-${statut.couleur}`}>{statut.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                    {detailsFiltres.length === 0 && (
                      <tr>
                        <td colSpan={10} className="text-center text-muted py-3">
                          Aucune vente trouvee.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

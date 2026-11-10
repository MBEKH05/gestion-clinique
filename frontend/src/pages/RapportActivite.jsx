import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { rapportActiviteAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { formatMontant, getDevisNumero } from '../utils/devisUtils';
import { generatePDFRapportActivite } from '../utils/pdfUtils';

const STATUT_LABELS = {
  NON_REGLE: { label: 'Non regle', className: 'badge-danger' },
  PARTIELLEMENT_REGLE: { label: 'Partiel', className: 'badge-warning' },
  REGLE: { label: 'Regle', className: 'badge-success' },
};

const TYPE_LABELS = { IPM: 'IPM', ASSURANCE: 'Assurance', CAISSE: 'Caisse' };

function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function rangeFor(preset) {
  const now = new Date();
  if (preset === 'jour') return { debut: toISODate(now), fin: toISODate(now) };
  if (preset === 'semaine') {
    const d = new Date(now);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return { debut: toISODate(d), fin: toISODate(now) };
  }
  return { debut: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), fin: toISODate(now) };
}

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('fr-FR') : '';
}

function Kpi({ label, value, highlight }) {
  return (
    <div className="col-6 col-md">
      <div className={`card shadow-sm h-100 ${highlight ? 'bg-primary text-white' : ''}`}>
        <div className="card-body">
          <div className={`small ${highlight ? '' : 'text-muted'}`}>{label}</div>
          <div className="fs-5 fw-bold">{value}</div>
        </div>
      </div>
    </div>
  );
}

export default function RapportActivite() {
  const { user, isSuperAdmin } = useAuth();
  const [preset, setPreset] = useState('mois');
  const [periode, setPeriode] = useState(() => rangeFor('mois'));
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [resume, setResume] = useState(null);
  const [rapport, setRapport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onglet, setOnglet] = useState('patients');
  const [pdfEnCours, setPdfEnCours] = useState(false);

  const telechargerPDF = async () => {
    if (!rapport) return;
    setPdfEnCours(true);
    try {
      await generatePDFRapportActivite(rapport);
    } finally {
      setPdfEnCours(false);
    }
  };

  const changerPreset = (p) => {
    setPreset(p);
    if (p !== 'perso') setPeriode(rangeFor(p));
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    rapportActiviteAPI
      .getResume(periode)
      .then(({ data }) => setResume(data))
      .catch(() => setResume(null));
  }, [isSuperAdmin, periode]);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = { ...periode };
    if (isSuperAdmin && selectedUserId) params.user_id = selectedUserId;
    rapportActiviteAPI
      .get(params)
      .then(({ data }) => setRapport(data))
      .catch(() => setError('Impossible de charger le rapport.'))
      .finally(() => setLoading(false));
  }, [isSuperAdmin, periode, selectedUserId]);

  const totauxResume = useMemo(() => {
    if (!resume) return null;
    return resume.comptes.reduce(
      (acc, c) => ({ patients: acc.patients + c.patients, devis: acc.devis + c.devis, montant: acc.montant + c.montant }),
      { patients: 0, devis: 0, montant: 0 }
    );
  }, [resume]);

  const t = rapport?.totaux;
  const titreCompte = rapport?.compte?.username === user?.username ? 'Mon rapport' : `Rapport de ${rapport?.compte?.username || ''}`;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <h2 className="mb-0">{isSuperAdmin ? "Rapport d'activite des comptes" : 'Mon rapport'}</h2>
        {!isSuperAdmin && (
          <button className="btn btn-outline-primary" onClick={telechargerPDF} disabled={!rapport || loading || pdfEnCours}>
            <i className="bi bi-file-earmark-pdf me-2"></i>
            {pdfEnCours ? 'Generation...' : 'Telecharger le PDF'}
          </button>
        )}
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label small">Periode</label>
              <select className="form-select" value={preset} onChange={(e) => changerPreset(e.target.value)}>
                <option value="jour">Aujourd'hui</option>
                <option value="semaine">Cette semaine</option>
                <option value="mois">Ce mois</option>
                <option value="perso">Personnalisee</option>
              </select>
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label small">Du</label>
              <input
                type="date"
                className="form-control"
                value={periode.debut}
                onChange={(e) => {
                  setPreset('perso');
                  setPeriode((p) => ({ ...p, debut: e.target.value }));
                }}
              />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label small">Au</label>
              <input
                type="date"
                className="form-control"
                value={periode.fin}
                onChange={(e) => {
                  setPreset('perso');
                  setPeriode((p) => ({ ...p, fin: e.target.value }));
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {isSuperAdmin && resume && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title">Tous les comptes</h5>
            <p className="text-muted small mb-2">Cliquez sur un compte pour voir son rapport detaille.</p>
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Compte</th>
                    <th>Role</th>
                    <th className="text-end">Patients enregistres</th>
                    <th className="text-end">Devis</th>
                    <th className="text-end">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {resume.comptes.map((c) => {
                    const actif = (selectedUserId ?? user?.id) === c.id;
                    return (
                      <tr
                        key={c.id}
                        className={actif ? 'table-primary' : ''}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedUserId(c.id)}
                      >
                        <td className="fw-semibold">
                          {c.username}
                          {!c.actif && <span className="badge bg-secondary ms-2">Inactif</span>}
                        </td>
                        <td className="small text-muted">{c.role}</td>
                        <td className="text-end">{c.patients}</td>
                        <td className="text-end">{c.devis}</td>
                        <td className="text-end">{formatMontant(c.montant)} FCFA</td>
                      </tr>
                    );
                  })}
                  <tr className="text-muted">
                    <td colSpan={2}>
                      <i>Non attribues (avant la mise en place du suivi)</i>
                    </td>
                    <td className="text-end">{resume.nonAttribues.patients}</td>
                    <td className="text-end">{resume.nonAttribues.devis}</td>
                    <td className="text-end">{formatMontant(resume.nonAttribues.montant)} FCFA</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} className="fw-bold">TOTAL (comptes)</td>
                    <td className="text-end fw-bold">{totauxResume.patients}</td>
                    <td className="text-end fw-bold">{totauxResume.devis}</td>
                    <td className="text-end fw-bold">{formatMontant(totauxResume.montant)} FCFA</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        rapport && (
          <>
            {isSuperAdmin && (
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <h4 className="mb-0">{titreCompte}</h4>
                <button className="btn btn-outline-primary btn-sm" onClick={telechargerPDF} disabled={pdfEnCours}>
                  <i className="bi bi-file-earmark-pdf me-2"></i>
                  {pdfEnCours ? 'Generation...' : `PDF de ${rapport.compte?.username}`}
                </button>
              </div>
            )}

            <div className="row g-3 mb-4">
              <Kpi label="Patients enregistres" value={t.patients} highlight />
              <Kpi label="Devis etablis" value={t.devis} />
              <Kpi label="Montant total" value={`${formatMontant(t.montantTotal)} FCFA`} />
              <Kpi label="Part prise en charge" value={`${formatMontant(t.partCouverte)} FCFA`} />
              <Kpi label="Part patient" value={`${formatMontant(t.partPatient)} FCFA`} />
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h5 className="card-title">Patients par prise en charge</h5>
                    <table className="table table-sm mb-0">
                      <tbody>
                        {Object.entries(t.patientsParType).map(([type, nb]) => (
                          <tr key={type}>
                            <td>{TYPE_LABELS[type] || type}</td>
                            <td className="text-end fw-semibold">{nb}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="col-md-8">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h5 className="card-title">Detail par jour</h5>
                    {rapport.parJour.length === 0 ? (
                      <div className="text-muted small">Aucune activite sur cette periode.</div>
                    ) : (
                      <div className="table-responsive" style={{ maxHeight: 260 }}>
                        <table className="table table-sm mb-0">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th className="text-end">Patients</th>
                              <th className="text-end">Devis</th>
                              <th className="text-end">Montant</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rapport.parJour.map((j) => (
                              <tr key={j.date}>
                                <td>{formatDate(j.date)}</td>
                                <td className="text-end">{j.patients}</td>
                                <td className="text-end">{j.devis}</td>
                                <td className="text-end">{formatMontant(j.montant)} FCFA</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="card shadow-sm">
              <div className="card-body">
                <ul className="nav nav-tabs mb-3">
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${onglet === 'patients' ? 'active' : ''}`}
                      onClick={() => setOnglet('patients')}
                    >
                      Patients enregistres ({rapport.patients.length})
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${onglet === 'devis' ? 'active' : ''}`}
                      onClick={() => setOnglet('devis')}
                    >
                      Devis et prise en charge ({rapport.devis.length})
                    </button>
                  </li>
                </ul>

                {onglet === 'patients' ? (
                  rapport.patients.length === 0 ? (
                    <div className="text-muted small">Aucun patient enregistre sur cette periode.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm table-hover mb-0">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Patient</th>
                            <th>Matricule</th>
                            <th>Prise en charge</th>
                            <th>IPM / Assurance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rapport.patients.map((p) => (
                            <tr key={p.id}>
                              <td>{formatDate(p.date)}</td>
                              <td className="fw-semibold">{p.nomComplet}</td>
                              <td>{p.matricule}</td>
                              <td>{TYPE_LABELS[p.typePriseEnCharge] || p.typePriseEnCharge}</td>
                              <td>{p.entiteNom}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : rapport.devis.length === 0 ? (
                  <div className="text-muted small">Aucun devis etabli sur cette periode.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover align-middle mb-0">
                      <thead>
                        <tr>
                          <th>N°</th>
                          <th>Date</th>
                          <th>Patient</th>
                          <th>Prise en charge</th>
                          <th className="text-end">Total</th>
                          <th className="text-end">Part prise en charge</th>
                          <th className="text-end">Part patient</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rapport.devis.map((d) => {
                          const statut = STATUT_LABELS[d.statutPaiement] || STATUT_LABELS.NON_REGLE;
                          return (
                            <tr key={d.id}>
                              <td>
                                <Link to={`/devis/${d.id}`}>{getDevisNumero(d)}</Link>
                              </td>
                              <td>{formatDate(d.date)}</td>
                              <td>
                                <div className="fw-semibold">{d.patientNom}</div>
                                <div className="small text-muted">{d.patientMatricule}</div>
                              </td>
                              <td>
                                {TYPE_LABELS[d.typePriseEnCharge] || d.typePriseEnCharge}
                                {d.entiteNom && d.typePriseEnCharge !== 'CAISSE' && (
                                  <div className="small text-muted">{d.entiteNom}</div>
                                )}
                              </td>
                              <td className="text-end">{formatMontant(d.total)}</td>
                              <td className="text-end">{formatMontant(d.partCouverte)}</td>
                              <td className="text-end">
                                {formatMontant(d.partPatient)}
                                {d.tauxCouverture && <div className="small text-muted">{d.tauxCouverture}%</div>}
                              </td>
                              <td>
                                <span className={`badge ${statut.className}`}>{statut.label}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={4} className="fw-bold">TOTAL</td>
                          <td className="text-end fw-bold">{formatMontant(t.montantTotal)}</td>
                          <td className="text-end fw-bold">{formatMontant(t.partCouverte)}</td>
                          <td className="text-end fw-bold">{formatMontant(t.partPatient)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}

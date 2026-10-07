import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { stockAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { formatMontant } from '../utils/devisUtils';
import { generatePDFEtatStock } from '../utils/pdfUtils';

const STATUTS = {
  RUPTURE: { label: 'Rupture', couleur: 'danger' },
  ALERTE: { label: 'Stock bas', couleur: 'warning' },
  OK: { label: 'Disponible', couleur: 'success' },
  NON_SUIVI: { label: 'Non suivi', couleur: 'secondary' },
};

const TYPES_MOUVEMENT = {
  ENTREE: { label: 'Entree', couleur: 'success', icon: 'bi-box-arrow-in-down' },
  SORTIE: { label: 'Sortie', couleur: 'danger', icon: 'bi-box-arrow-up' },
  INVENTAIRE: { label: 'Inventaire', couleur: 'info', icon: 'bi-clipboard-check' },
  VENTE: { label: 'Vente', couleur: 'primary', icon: 'bi-cart' },
};

const PEREMPTION = {
  PERIME: { label: 'Perime', couleur: 'danger' },
  PROCHE: { label: 'Bientot perime', couleur: 'warning' },
  OK: { label: 'OK', couleur: 'success' },
  SANS_DATE: { label: 'Sans date', couleur: 'secondary' },
};

const MOTIFS_SORTIE = ['Perime', 'Casse / deteriore', 'Perte', 'Retour fournisseur', 'Usage interne', 'Don'];

const toISODate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const jj = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '-');
const heure = (iso) => (iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '');
const signe = (n) => (n > 0 ? `+${n}` : String(n));

function FormulaireMouvement({ medicaments, initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    analyse_id: initial.analyseId || '',
    type: initial.type || 'ENTREE',
    quantite: '',
    stock_compte: '',
    numero_lot: '',
    date_peremption: '',
    fournisseur: '',
    prix_achat: '',
    motif: '',
    date_mouvement: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }));
  const medicament = medicaments.find((m) => m.analyseId === form.analyse_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
      if (payload.date_mouvement) payload.date_mouvement = payload.date_mouvement.replace('T', ' ');
      const { data } = await stockAPI.createMouvement(payload);
      onSaved(data);
    } catch (err) {
      const errors = err.response?.data?.errors;
      setError(
        err.response?.data?.detail || (errors ? Object.values(errors).flat().join(' ') : err.response?.data?.message) || "Erreur lors de l'enregistrement."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog">
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <form className="modal-content" onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Mouvement de stock</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger py-2">{error}</div>}

              <div className="btn-group w-100 mb-3" role="group">
                {['ENTREE', 'SORTIE', 'INVENTAIRE'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`btn ${form.type === t ? `btn-${TYPES_MOUVEMENT[t].couleur}` : `btn-outline-${TYPES_MOUVEMENT[t].couleur}`}`}
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                  >
                    <i className={`bi ${TYPES_MOUVEMENT[t].icon} me-1`}></i>
                    {t === 'ENTREE' ? 'Entree (reception)' : t === 'SORTIE' ? 'Sortie' : 'Inventaire'}
                  </button>
                ))}
              </div>

              <div className="row g-3">
                <div className="col-md-8">
                  <label className="form-label">Medicament</label>
                  <select className="form-select" value={form.analyse_id} onChange={set('analyse_id')} required>
                    <option value="">-- Selectionner --</option>
                    {medicaments.map((m) => (
                      <option key={m.analyseId} value={m.analyseId}>
                        {m.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Stock actuel</label>
                  <div className="form-control bg-light fw-bold">{medicament ? medicament.stock : '-'}</div>
                </div>

                {form.type === 'INVENTAIRE' ? (
                  <div className="col-md-6">
                    <label className="form-label">Quantite comptee en rayon</label>
                    <input type="number" min="0" className="form-control" value={form.stock_compte} onChange={set('stock_compte')} required />
                    {medicament && form.stock_compte !== '' && (
                      <div className="form-text">
                        Ecart : <strong>{signe(Number(form.stock_compte) - medicament.stock)}</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="col-md-6">
                    <label className="form-label">Quantite</label>
                    <input type="number" min="1" className="form-control" value={form.quantite} onChange={set('quantite')} required />
                  </div>
                )}

                <div className="col-md-6">
                  <label className="form-label">Date du mouvement</label>
                  <input type="datetime-local" className="form-control" value={form.date_mouvement} onChange={set('date_mouvement')} />
                  <div className="form-text">Laisser vide pour maintenant.</div>
                </div>

                {form.type === 'ENTREE' && (
                  <>
                    <div className="col-md-6">
                      <label className="form-label">Numero de lot</label>
                      <input type="text" className="form-control" value={form.numero_lot} onChange={set('numero_lot')} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Date de peremption</label>
                      <input type="date" className="form-control" value={form.date_peremption} onChange={set('date_peremption')} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Fournisseur</label>
                      <input type="text" className="form-control" value={form.fournisseur} onChange={set('fournisseur')} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Prix d'achat unitaire (FCFA)</label>
                      <input type="number" min="0" className="form-control" value={form.prix_achat} onChange={set('prix_achat')} />
                    </div>
                  </>
                )}

                <div className="col-12">
                  <label className="form-label">Motif {form.type === 'SORTIE' ? '(obligatoire)' : '(optionnel)'}</label>
                  <input type="text" className="form-control" list="motifs-sortie" value={form.motif} onChange={set('motif')} required={form.type === 'SORTIE'} />
                  <datalist id="motifs-sortie">
                    {MOTIFS_SORTIE.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Annuler
              </button>
              <button type="submit" className={`btn btn-${TYPES_MOUVEMENT[form.type].couleur}`} disabled={saving}>
                {saving && <span className="spinner-border spinner-border-sm me-2"></span>}
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop show"></div>
    </>
  );
}

export default function StockMedicaments() {
  const { isSuperAdmin } = useAuth();
  const [etat, setEtat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onglet, setOnglet] = useState('stock');
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [formulaire, setFormulaire] = useState(null);
  const [message, setMessage] = useState('');

  const [journal, setJournal] = useState(null);
  const [loadingJournal, setLoadingJournal] = useState(false);
  const now = new Date();
  const [jMedicament, setJMedicament] = useState('');
  const [jType, setJType] = useState('');
  const [jDebut, setJDebut] = useState(toISODate(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [jFin, setJFin] = useState(toISODate(now));

  const [lots, setLots] = useState(null);

  const chargerEtat = useCallback(() => {
    setLoading(true);
    return stockAPI
      .getEtat()
      .then(({ data }) => setEtat(data))
      .finally(() => setLoading(false));
  }, []);

  const chargerJournal = useCallback(() => {
    setLoadingJournal(true);
    return stockAPI
      .getMouvements({
        analyse_id: jMedicament || undefined,
        type: jType || undefined,
        date_debut: jDebut || undefined,
        date_fin: jFin || undefined,
      })
      .then(({ data }) => setJournal(data))
      .finally(() => setLoadingJournal(false));
  }, [jMedicament, jType, jDebut, jFin]);

  const chargerLots = useCallback(() => stockAPI.getLots().then(({ data }) => setLots(data)), []);

  useEffect(() => {
    chargerEtat();
  }, [chargerEtat]);

  useEffect(() => {
    if (onglet === 'mouvements') chargerJournal();
  }, [onglet, chargerJournal]);

  useEffect(() => {
    if (onglet === 'lots') chargerLots();
  }, [onglet, chargerLots]);

  const medicaments = etat?.medicaments ?? [];

  const lignes = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return medicaments
      .filter((m) => !q || m.nom.toLowerCase().includes(q))
      .filter((m) => {
        if (!filtreStatut) return true;
        if (filtreStatut === 'PEREMPTION') return m.peremptionProche || m.lotsPerimes > 0;
        return m.statut === filtreStatut;
      });
  }, [medicaments, recherche, filtreStatut]);

  const apresEnregistrement = (data) => {
    setFormulaire(null);
    const t = TYPES_MOUVEMENT[data.mouvement.type];
    setMessage(`${t.label} enregistree pour ${data.mouvement.medicament} : stock ${data.stockAvant} -> ${data.stockApres}.`);
    chargerEtat();
    if (onglet === 'mouvements') chargerJournal();
    if (onglet === 'lots') chargerLots();
  };

  const modifierSeuil = async (m) => {
    const valeur = window.prompt(`Seuil d'alerte pour ${m.nom} (vide = aucun) :`, m.seuilAlerte ?? '');
    if (valeur === null) return;
    const seuil = valeur.trim() === '' ? null : Number(valeur);
    if (seuil !== null && (Number.isNaN(seuil) || seuil < 0)) return;
    await stockAPI.updateSeuil(m.analyseId, seuil);
    chargerEtat();
  };

  const voirHistorique = (m) => {
    setJMedicament(m.analyseId);
    setJType('');
    setJDebut('');
    setJFin(toISODate(new Date()));
    setOnglet('mouvements');
  };

  const supprimerMouvement = async (mv) => {
    if (!window.confirm(`Supprimer ce mouvement (${TYPES_MOUVEMENT[mv.type].label} de ${mv.quantite}) ? Le stock sera recalcule.`)) return;
    await stockAPI.deleteMouvement(mv.id);
    chargerJournal();
    chargerEtat();
  };

  const r = etat?.resume;
  const cartes = r
    ? [
        { label: 'Medicaments suivis', valeur: `${r.nbSuivis} / ${r.nbMedicaments}`, couleur: 'primary', icon: 'bi-capsule', filtre: '' },
        { label: 'En rupture', valeur: r.nbRupture, couleur: 'danger', icon: 'bi-x-octagon', filtre: 'RUPTURE' },
        { label: 'Stock bas', valeur: r.nbAlerte, couleur: 'warning', icon: 'bi-exclamation-triangle', filtre: 'ALERTE' },
        { label: `Peremption < ${etat.joursAlertePeremption} j`, valeur: r.nbPeremptionProche, couleur: 'warning', icon: 'bi-hourglass-split', filtre: 'PEREMPTION' },
        { label: 'Lots perimes', valeur: r.nbLotsPerimes, couleur: 'danger', icon: 'bi-calendar-x', filtre: 'PEREMPTION' },
        { label: 'Unites en stock', valeur: r.quantiteEnStock, couleur: 'success', icon: 'bi-boxes', filtre: '' },
      ]
    : [];

  const medicamentJournal = medicaments.find((m) => m.analyseId === jMedicament);

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h2 className="mb-0">
          <i className="bi bi-boxes me-2"></i>Stock des medicaments
        </h2>
        <div className="d-flex flex-wrap gap-2">
          <Link to="/medicaments/suivi" className="btn btn-outline-secondary">
            <i className="bi bi-graph-up me-1"></i>Suivi des ventes
          </Link>
          <button className="btn btn-outline-danger" disabled={!etat} onClick={() => generatePDFEtatStock(etat, lignes)}>
            <i className="bi bi-file-earmark-pdf me-1"></i>Etat du stock PDF
          </button>
          <button className="btn btn-success" onClick={() => setFormulaire({ type: 'ENTREE' })} disabled={!etat}>
            <i className="bi bi-plus-lg me-1"></i>Nouveau mouvement
          </button>
        </div>
      </div>

      {message && (
        <div className="alert alert-success alert-dismissible py-2">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage('')}></button>
        </div>
      )}

      {loading && !etat ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : etat ? (
        <>
          <div className="row g-3 mb-3">
            {cartes.map((c) => (
              <div className="col-6 col-md-4 col-xl-2" key={c.label}>
                <div
                  className={`card shadow-sm h-100 border-start border-4 border-${c.couleur}`}
                  role="button"
                  onClick={() => {
                    setFiltreStatut(c.filtre);
                    setOnglet('stock');
                  }}
                >
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
            {[
              { value: 'stock', label: 'Etat du stock', icon: 'bi-clipboard-data' },
              { value: 'mouvements', label: 'Mouvements (tracabilite)', icon: 'bi-arrow-left-right' },
              { value: 'lots', label: 'Lots & peremptions', icon: 'bi-calendar2-week' },
            ].map((o) => (
              <li className="nav-item" key={o.value}>
                <button type="button" className={`nav-link ${onglet === o.value ? 'active' : ''}`} onClick={() => setOnglet(o.value)}>
                  <i className={`bi ${o.icon} me-1`}></i>
                  {o.label}
                </button>
              </li>
            ))}
          </ul>

          {onglet === 'stock' && (
            <>
              <div className="d-flex flex-wrap gap-2 mb-2">
                <input
                  type="text"
                  className="form-control"
                  style={{ maxWidth: 280 }}
                  placeholder="Rechercher un medicament..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                />
                <select className="form-select" style={{ maxWidth: 220 }} value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}>
                  <option value="">Tous les statuts</option>
                  <option value="RUPTURE">Rupture</option>
                  <option value="ALERTE">Stock bas</option>
                  <option value="OK">Disponible</option>
                  <option value="NON_SUIVI">Non suivi</option>
                  <option value="PEREMPTION">Peremption proche / perime</option>
                </select>
                <span className="text-muted small align-self-center ms-auto">{lignes.length} medicament(s)</span>
              </div>
              <div className="alert alert-light border small py-2">
                <i className="bi bi-info-circle me-1"></i>
                Le stock d'un medicament commence a sa premiere entree (stock initial). Ensuite, chaque devis le diminue automatiquement ;
                les demandes de devis (proformas) ne comptent pas.
              </div>
              <div className="table-responsive">
                <table className="table table-hover table-bordered bg-white align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Medicament</th>
                      <th className="text-center">Stock</th>
                      <th className="text-center">Seuil</th>
                      <th className="text-end">Entrees</th>
                      <th className="text-end">Ventes</th>
                      <th className="text-end">Sorties</th>
                      <th className="text-end">Ajust.</th>
                      <th className="text-end" title="Moyenne des ventes des 30 derniers jours">Conso / jour</th>
                      <th className="text-end">Autonomie</th>
                      <th>Peremption</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignes.map((m) => {
                      const st = STATUTS[m.statut];
                      return (
                        <tr key={m.analyseId}>
                          <td className="fw-semibold">{m.nom}</td>
                          <td className="text-center">
                            <span className={`badge bg-${st.couleur} fs-6`} title={st.label}>
                              {m.statut === 'NON_SUIVI' ? '-' : m.stock}
                            </span>
                            <div className="small text-muted">{st.label}</div>
                          </td>
                          <td className="text-center">
                            <button className="btn btn-sm btn-link p-0" onClick={() => modifierSeuil(m)} title="Modifier le seuil d'alerte">
                              {m.seuilAlerte ?? 'definir'}
                            </button>
                          </td>
                          <td className="text-end">{m.entrees}</td>
                          <td className="text-end">{m.vendus}</td>
                          <td className="text-end">{m.sorties}</td>
                          <td className="text-end">{m.ajustements ? signe(m.ajustements) : 0}</td>
                          <td className="text-end">{m.consommationJour}</td>
                          <td className="text-end">{m.autonomieJours !== null ? `${m.autonomieJours} j` : '-'}</td>
                          <td>
                            {m.prochainePeremption ? (
                              <span className={m.peremptionProche ? 'text-warning fw-bold' : ''}>{jj(m.prochainePeremption)}</span>
                            ) : (
                              '-'
                            )}
                            {m.lotsPerimes > 0 && <div className="badge bg-danger">{m.lotsPerimes} lot(s) perime(s)</div>}
                          </td>
                          <td className="text-center text-nowrap">
                            <div className="btn-group btn-group-sm">
                              <button className="btn btn-outline-success" title="Entree" onClick={() => setFormulaire({ type: 'ENTREE', analyseId: m.analyseId })}>
                                <i className="bi bi-box-arrow-in-down"></i>
                              </button>
                              <button className="btn btn-outline-danger" title="Sortie" onClick={() => setFormulaire({ type: 'SORTIE', analyseId: m.analyseId })}>
                                <i className="bi bi-box-arrow-up"></i>
                              </button>
                              <button className="btn btn-outline-info" title="Inventaire" onClick={() => setFormulaire({ type: 'INVENTAIRE', analyseId: m.analyseId })}>
                                <i className="bi bi-clipboard-check"></i>
                              </button>
                              <button className="btn btn-outline-secondary" title="Historique" onClick={() => voirHistorique(m)}>
                                <i className="bi bi-clock-history"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {lignes.length === 0 && (
                      <tr>
                        <td colSpan={11} className="text-center text-muted py-3">
                          Aucun medicament.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {onglet === 'mouvements' && (
            <>
              <div className="row g-2 align-items-end mb-2">
                <div className="col-md-4">
                  <label className="form-label small">Medicament</label>
                  <select className="form-select" value={jMedicament} onChange={(e) => setJMedicament(e.target.value)}>
                    <option value="">Tous les medicaments</option>
                    {medicaments.map((m) => (
                      <option key={m.analyseId} value={m.analyseId}>
                        {m.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label small">Type</label>
                  <select className="form-select" value={jType} onChange={(e) => setJType(e.target.value)}>
                    <option value="">Tous</option>
                    {Object.entries(TYPES_MOUVEMENT).map(([v, t]) => (
                      <option key={v} value={v}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label small">Du</label>
                  <input type="date" className="form-control" value={jDebut} onChange={(e) => setJDebut(e.target.value)} />
                </div>
                <div className="col-md-2">
                  <label className="form-label small">Au</label>
                  <input type="date" className="form-control" value={jFin} onChange={(e) => setJFin(e.target.value)} />
                </div>
                <div className="col-md-2 text-end">
                  {loadingJournal && <span className="spinner-border spinner-border-sm text-primary"></span>}
                </div>
              </div>

              {journal && (
                <div className="d-flex flex-wrap gap-2 mb-2 small">
                  <span className="badge bg-success">Entrees : {journal.totaux.entrees}</span>
                  <span className="badge bg-primary">Ventes : {journal.totaux.ventes}</span>
                  <span className="badge bg-danger">Sorties : {journal.totaux.sorties}</span>
                  <span className="badge bg-info text-dark">Ajustements : {signe(journal.totaux.ajustements)}</span>
                  {medicamentJournal && <span className="badge bg-dark">Stock actuel {medicamentJournal.nom} : {medicamentJournal.stock}</span>}
                </div>
              )}

              <div className="table-responsive">
                <table className="table table-sm table-hover table-bordered bg-white align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Date / heure</th>
                      <th>Type</th>
                      {!jMedicament && <th>Medicament</th>}
                      <th className="text-end">Quantite</th>
                      {jMedicament && <th className="text-end">Stock apres</th>}
                      <th>Details</th>
                      <th>Lot / peremption</th>
                      <th>Par</th>
                      {isSuperAdmin && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(journal?.mouvements ?? []).map((mv) => {
                      const t = TYPES_MOUVEMENT[mv.type];
                      return (
                        <tr key={mv.id}>
                          <td className="text-nowrap">
                            {jj(mv.date)} <span className="text-muted">{heure(mv.date)}</span>
                          </td>
                          <td>
                            <span className={`badge bg-${t.couleur}`}>
                              <i className={`bi ${t.icon} me-1`}></i>
                              {t.label}
                            </span>
                          </td>
                          {!jMedicament && <td>{mv.medicament}</td>}
                          <td className={`text-end fw-bold ${mv.quantite < 0 ? 'text-danger' : 'text-success'}`}>{signe(mv.quantite)}</td>
                          {jMedicament && <td className="text-end fw-semibold">{mv.stockApres}</td>}
                          <td>
                            {mv.devisId && (
                              <Link to={`/devis/${mv.devisId}`} className="me-1">
                                {mv.devisNumero}
                              </Link>
                            )}
                            {mv.type === 'INVENTAIRE' && <span className="me-1">Compte : {mv.stockCompte}.</span>}
                            {mv.detail}
                            {mv.prixAchat !== null && mv.prixAchat !== undefined && (
                              <span className="text-muted"> &middot; {formatMontant(mv.prixAchat)} FCFA/u</span>
                            )}
                          </td>
                          <td>
                            {mv.numeroLot || '-'}
                            {mv.datePeremption && <span className="text-muted"> &middot; {jj(mv.datePeremption)}</span>}
                          </td>
                          <td>{mv.utilisateur || (mv.type === 'VENTE' ? 'Devis' : '-')}</td>
                          {isSuperAdmin && (
                            <td className="text-center">
                              {mv.source === 'STOCK' && (
                                <button className="btn btn-sm btn-outline-danger" title="Supprimer (erreur de saisie)" onClick={() => supprimerMouvement(mv)}>
                                  <i className="bi bi-trash"></i>
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {journal && journal.mouvements.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center text-muted py-3">
                          Aucun mouvement sur cette periode.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {onglet === 'lots' && (
            <div className="table-responsive">
              <table className="table table-sm table-hover table-bordered bg-white align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Medicament</th>
                    <th>N&deg; lot</th>
                    <th>Peremption</th>
                    <th>Statut</th>
                    <th className="text-end">Qte recue</th>
                    <th>Reception</th>
                    <th>Fournisseur</th>
                    <th className="text-end">Prix achat</th>
                  </tr>
                </thead>
                <tbody>
                  {(lots?.lots ?? []).map((l) => {
                    const p = PEREMPTION[l.statutPeremption];
                    return (
                      <tr key={l.id}>
                        <td className="fw-semibold">{l.medicament}</td>
                        <td>{l.numeroLot || '-'}</td>
                        <td>{jj(l.datePeremption)}</td>
                        <td>
                          <span className={`badge bg-${p.couleur}`}>{p.label}</span>
                          {l.joursRestants !== null && l.joursRestants >= 0 && <span className="small text-muted ms-1">({l.joursRestants} j)</span>}
                        </td>
                        <td className="text-end">{l.quantite}</td>
                        <td>{jj(l.date)}</td>
                        <td>{l.fournisseur || '-'}</td>
                        <td className="text-end">{l.prixAchat !== null ? `${formatMontant(l.prixAchat)} FCFA` : '-'}</td>
                      </tr>
                    );
                  })}
                  {lots && lots.lots.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-3">
                        Aucun lot enregistre (saisissez le n° de lot et la peremption lors des entrees).
                      </td>
                    </tr>
                  )}
                  {!lots && (
                    <tr>
                      <td colSpan={8} className="text-center py-3">
                        <span className="spinner-border spinner-border-sm text-primary"></span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}

      {formulaire && (
        <FormulaireMouvement medicaments={medicaments} initial={formulaire} onClose={() => setFormulaire(null)} onSaved={apresEnregistrement} />
      )}
    </div>
  );
}

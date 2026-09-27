import { useCallback, useEffect, useMemo, useState } from 'react';
import { devisAPI, statistiquesAPI } from '../api/endpoints';
import { useData } from '../context/DataContext';
import { formatMontant } from '../utils/devisUtils';
import { generatePDFListeFactures } from '../utils/pdfUtils';

const STATUTS = [
  { value: 'NON_REGLE', label: 'Non regle' },
  { value: 'PARTIELLEMENT_REGLE', label: 'Partiellement regle' },
  { value: 'REGLE', label: 'Regle' },
];

const NOMS_MOIS = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

// Une facture regroupe plusieurs devis : elle compte dans un statut des qu'un de ses devis a ce statut.
const contientStatut = (facture, statut) => (facture.repartition?.[statut] ?? 0) > 0;

const calculerStatistiques = (factures) => ({
  nonRegles: factures.filter((f) => contientStatut(f, 'NON_REGLE')).length,
  partiellementRegles: factures.filter((f) => contientStatut(f, 'PARTIELLEMENT_REGLE')).length,
  regles: factures.filter((f) => contientStatut(f, 'REGLE')).length,
  montantTotal: factures.reduce((sum, f) => sum + Number(f.montantCouvert || 0), 0),
});

const REPARTITION_BADGES = [
  { statut: 'NON_REGLE', abrev: 'NR', couleur: 'danger', label: 'non regle(s)' },
  { statut: 'PARTIELLEMENT_REGLE', abrev: 'PR', couleur: 'warning', label: 'partiellement regle(s)' },
  { statut: 'REGLE', abrev: 'R', couleur: 'success', label: 'regle(s)' },
];

// parMois : une ligne par mois pour une seule IPM / assurance (sinon une ligne par IPM / assurance).
function SectionFactures({ titre, labelEntite, factures, params, parMois, modifications, onChange }) {
  const [filtreStatut, setFiltreStatut] = useState('');

  const getValue = (facture, field) => {
    const valeur = modifications[facture.id]?.[field] ?? facture[field] ?? '';
    // Un statut absent ou inconnu est affiche "Non regle" : le filtre doit le traiter pareil.
    if (field === 'statutPaiement' && !STATUTS.some((s) => s.value === valeur)) return 'NON_REGLE';
    return valeur;
  };

  // Un statut modifie (non encore enregistre) s'appliquera a tous les devis de la facture.
  const facturesAvecStatut = factures.map((f) => {
    const statutModifie = modifications[f.id]?.statutPaiement;
    const nbDevis = f.devis_ids?.length ?? 0;
    const repartition = statutModifie
      ? { NON_REGLE: 0, PARTIELLEMENT_REGLE: 0, REGLE: 0, [statutModifie]: nbDevis }
      : f.repartition ?? { NON_REGLE: 0, PARTIELLEMENT_REGLE: 0, REGLE: 0, [getValue(f, 'statutPaiement')]: nbDevis };
    return { ...f, statutPaiement: getValue(f, 'statutPaiement'), repartition };
  });
  const stats = calculerStatistiques(facturesAvecStatut);

  const facturesAffichees = filtreStatut
    ? facturesAvecStatut.filter((f) => contientStatut(f, filtreStatut))
    : facturesAvecStatut;

  // Pour le PDF, les mois sans facture ne sont pas imprimes.
  const facturesPDF = facturesAffichees
    .filter((f) => (f.devis_ids?.length ?? 0) > 0)
    .map((f) => (parMois ? { ...f, entiteNom: NOMS_MOIS[f.mois - 1] } : f));

  const cartes = [
    { statut: 'NON_REGLE', label: 'Non regles', valeur: stats.nonRegles, couleur: 'danger' },
    { statut: 'PARTIELLEMENT_REGLE', label: 'Partiellement regles', valeur: stats.partiellementRegles, couleur: 'warning' },
    { statut: 'REGLE', label: 'Regles', valeur: stats.regles, couleur: 'success' },
  ];

  return (
    <div className="mb-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0 fw-bold">{titre}</h6>
        <button
          className="btn btn-sm btn-outline-primary"
          disabled={facturesPDF.length === 0}
          onClick={() =>
            generatePDFListeFactures(
              facturesPDF,
              parMois ? null : params.mois,
              params.annee,
              calculerStatistiques(facturesPDF),
              titre,
              parMois ? 'Mois' : labelEntite
            )
          }
        >
          <i className="bi bi-file-earmark-pdf me-2"></i>Telecharger PDF
        </button>
      </div>

      <div className="row g-3 mb-3">
        {cartes.map((c) => (
          <div className="col-md-3" key={c.statut}>
            <div
              className={`card border-${c.couleur} ${filtreStatut === c.statut ? `bg-${c.couleur} bg-opacity-10` : ''}`}
              role="button"
              title="Cliquer pour filtrer"
              onClick={() => setFiltreStatut(filtreStatut === c.statut ? '' : c.statut)}
            >
              <div className="card-body">
                <div className="text-muted small">{c.label}</div>
                <div className={`fs-4 fw-bold text-${c.couleur}`}>{c.valeur}</div>
              </div>
            </div>
          </div>
        ))}
        <div className="col-md-3">
          <div className="card border-primary">
            <div className="card-body">
              <div className="text-muted small">Montant total</div>
              <div className="fs-5 fw-bold text-primary">{formatMontant(stats.montantTotal)} FCFA</div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-2 mb-2">
        <div className="col-md-3">
          <select className="form-select form-select-sm" value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}>
            <option value="">Tous les statuts</option>
            {STATUTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered bg-white">
          <thead>
            <tr>
              {parMois && <th>Mois</th>}
              <th>N&deg; Facture</th>
              {!parMois && <th>{labelEntite}</th>}
              <th>Montant couvert</th>
              <th>Devis</th>
              <th>Statut</th>
              <th>Date paiement</th>
              <th>Commentaire</th>
            </tr>
          </thead>
          <tbody>
            {facturesAffichees.map((f) => {
              const vide = (f.devis_ids?.length ?? 0) === 0;
              return (
                <tr key={f.id} className={modifications[f.id] ? 'table-warning' : vide ? 'text-muted' : ''}>
                  {parMois && <td className="fw-semibold">{NOMS_MOIS[f.mois - 1]}</td>}
                  <td>{vide ? '-' : f.numeroFacture}</td>
                  {!parMois && <td>{f.entiteNom}</td>}
                  <td>{formatMontant(f.montantCouvert)} FCFA</td>
                  <td className="text-nowrap">
                    {vide
                      ? 'Aucun'
                      : REPARTITION_BADGES.filter((b) => f.repartition[b.statut] > 0).map((b) => (
                          <span
                            key={b.statut}
                            className={`badge bg-${b.couleur} me-1`}
                            title={`${f.repartition[b.statut]} devis ${b.label}`}
                          >
                            {f.repartition[b.statut]} {b.abrev}
                          </span>
                        ))}
                  </td>
                  <td>
                    <select
                      className="form-select form-select-sm"
                      value={getValue(f, 'statutPaiement')}
                      disabled={vide}
                      onChange={(e) => onChange(f.id, 'statutPaiement', e.target.value)}
                    >
                      {STATUTS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={getValue(f, 'datePaiement') || ''}
                      disabled={vide}
                      onChange={(e) => onChange(f.id, 'datePaiement', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={getValue(f, 'commentairePaiement') || ''}
                      disabled={vide}
                      onChange={(e) => onChange(f.id, 'commentairePaiement', e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
            {facturesAffichees.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted py-3">
                  {filtreStatut ? 'Aucune facture avec ce statut pour cette periode.' : 'Aucune facture pour cette periode.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SuiviFactures({ data, params, onSaved }) {
  const { ipms, assurances } = useData();
  const [modifications, setModifications] = useState({});
  const [saving, setSaving] = useState(false);
  const [onglet, setOnglet] = useState('IPM');
  const [entiteId, setEntiteId] = useState('');
  const [mensuel, setMensuel] = useState(null);
  const [loadingMensuel, setLoadingMensuel] = useState(false);

  const entites = useMemo(
    () =>
      [...((onglet === 'IPM' ? ipms : assurances) || [])].sort((a, b) => String(a.nom).localeCompare(String(b.nom))),
    [onglet, ipms, assurances]
  );
  const entite = entites.find((e) => String(e.id) === entiteId);

  const loadMensuel = useCallback(() => {
    if (!entiteId) {
      setMensuel(null);
      return Promise.resolve();
    }
    setLoadingMensuel(true);
    return statistiquesAPI
      .getFacturesMensuelles({ type: onglet, entite_id: entiteId, annee: params.annee })
      .then(({ data }) => setMensuel(data))
      .finally(() => setLoadingMensuel(false));
  }, [onglet, entiteId, params.annee]);

  useEffect(() => {
    loadMensuel();
  }, [loadMensuel]);

  useEffect(() => {
    setModifications({});
  }, [params, onglet, entiteId]);

  const changerOnglet = (valeur) => {
    setOnglet(valeur);
    setEntiteId('');
    setMensuel(null);
  };

  const handleChange = (factureId, field, value) => {
    setModifications((prev) => ({
      ...prev,
      [factureId]: { ...prev[factureId], [field]: value },
    }));
  };

  const facturesIPM = data.factures.filter((f) => f.typePriseEnCharge === 'IPM');
  const facturesAssurance = data.factures.filter((f) => f.typePriseEnCharge !== 'IPM');
  const facturesOnglet = onglet === 'IPM' ? facturesIPM : facturesAssurance;
  const facturesSource = entiteId ? mensuel?.factures ?? [] : facturesOnglet;

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [factureId, changes] of Object.entries(modifications)) {
        const facture = facturesSource.find((f) => f.id === factureId);
        if (!facture) continue;
        for (const devisId of facture.devis_ids) {
          await devisAPI.updatePaiement(devisId, {
            statutPaiement: changes.statutPaiement ?? facture.statutPaiement ?? 'NON_REGLE',
            datePaiement: changes.datePaiement ?? facture.datePaiement,
            commentairePaiement: changes.commentairePaiement ?? facture.commentairePaiement,
          });
        }
      }
      setModifications({});
      await Promise.all([onSaved(), loadMensuel()]);
    } finally {
      setSaving(false);
    }
  };

  const hasModifications = Object.keys(modifications).length > 0;
  const labelType = onglet === 'IPM' ? 'IPM' : 'Assurance';
  const periodeLabel = params.mois ? `${String(params.mois).padStart(2, '0')}/${params.annee}` : `Annee ${params.annee}`;

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
        <h5 className="mb-0">Suivi des Factures</h5>
        <ul className="nav nav-pills">
          {[
            { value: 'IPM', label: 'IPM', nb: facturesIPM.length },
            { value: 'ASSURANCE', label: 'Assurances', nb: facturesAssurance.length },
          ].map((o) => (
            <li className="nav-item" key={o.value}>
              <button
                type="button"
                className={`nav-link ${onglet === o.value ? 'active' : ''}`}
                onClick={() => changerOnglet(o.value)}
              >
                {o.label} <span className="badge bg-secondary ms-1">{o.nb}</span>
              </button>
            </li>
          ))}
        </ul>
        <select
          className="form-select w-auto"
          value={entiteId}
          onChange={(e) => {
            setMensuel(null);
            setEntiteId(e.target.value);
          }}
          title={`Choisir une ${labelType} pour voir ses factures mois par mois`}
        >
          <option value="">{onglet === 'IPM' ? 'Toutes les IPM' : 'Toutes les assurances'}</option>
          {entites.map((e) => (
            <option key={e.id} value={String(e.id)}>
              {e.nom}
            </option>
          ))}
        </select>
        <span className="badge bg-light text-dark border">
          {entiteId ? `Annee ${params.annee} - mois par mois` : periodeLabel}
        </span>
      </div>

      {entiteId ? (
        loadingMensuel && !mensuel ? (
          <div className="text-center py-4"><div className="spinner-border text-primary"></div></div>
        ) : (
          <SectionFactures
            key={`${onglet}:${entiteId}`}
            titre={`Factures mensuelles ${entite?.nom ?? mensuel?.entite?.nom ?? ''}`}
            labelEntite={labelType}
            factures={facturesSource}
            params={params}
            parMois
            modifications={modifications}
            onChange={handleChange}
          />
        )
      ) : (
        <SectionFactures
          key={onglet}
          titre={onglet === 'IPM' ? 'Factures IPM' : 'Factures Assurances'}
          labelEntite={labelType}
          factures={facturesSource}
          params={params}
          modifications={modifications}
          onChange={handleChange}
        />
      )}

      {hasModifications && (
        <button className="btn btn-success" onClick={handleSave} disabled={saving}>
          {saving && <span className="spinner-border spinner-border-sm me-2"></span>}
          Enregistrer les modifications
        </button>
      )}
    </div>
  );
}

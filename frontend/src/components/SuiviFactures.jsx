import { useEffect, useState } from 'react';
import { devisAPI } from '../api/endpoints';
import { formatMontant } from '../utils/devisUtils';
import { generatePDFListeFactures } from '../utils/pdfUtils';

const STATUTS = [
  { value: 'NON_REGLE', label: 'Non regle' },
  { value: 'PARTIELLEMENT_REGLE', label: 'Partiellement regle' },
  { value: 'REGLE', label: 'Regle' },
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

function SectionFactures({ titre, labelEntite, factures, params, modifications, onChange }) {
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

  const cartes = [
    { statut: 'NON_REGLE', label: 'Non regles', valeur: stats.nonRegles, couleur: 'danger' },
    { statut: 'PARTIELLEMENT_REGLE', label: 'Partiellement regles', valeur: stats.partiellementRegles, couleur: 'warning' },
    { statut: 'REGLE', label: 'Regles', valeur: stats.regles, couleur: 'success' },
  ];

  return (
    <div className="mb-4">
      <div className="d-flex justify-content-end align-items-center mb-2">
        <button
          className="btn btn-sm btn-outline-primary"
          disabled={facturesAffichees.length === 0}
          onClick={() => generatePDFListeFactures(facturesAffichees, params.mois, params.annee, calculerStatistiques(facturesAffichees), titre)}
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
              <th>N&deg; Facture</th>
              <th>{labelEntite}</th>
              <th>Montant couvert</th>
              <th>Devis</th>
              <th>Statut</th>
              <th>Date paiement</th>
              <th>Commentaire</th>
            </tr>
          </thead>
          <tbody>
            {facturesAffichees.map((f) => (
              <tr key={f.id} className={modifications[f.id] ? 'table-warning' : ''}>
                <td>{f.numeroFacture}</td>
                <td>{f.entiteNom}</td>
                <td>{formatMontant(f.montantCouvert)} FCFA</td>
                <td className="text-nowrap">
                  {REPARTITION_BADGES.filter((b) => f.repartition[b.statut] > 0).map((b) => (
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
                    onChange={(e) => onChange(f.id, 'datePaiement', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={getValue(f, 'commentairePaiement') || ''}
                    onChange={(e) => onChange(f.id, 'commentairePaiement', e.target.value)}
                  />
                </td>
              </tr>
            ))}
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
  const [modifications, setModifications] = useState({});
  const [saving, setSaving] = useState(false);
  const [onglet, setOnglet] = useState('IPM');

  useEffect(() => {
    setModifications({});
  }, [params]);

  const handleChange = (factureId, field, value) => {
    setModifications((prev) => ({
      ...prev,
      [factureId]: { ...prev[factureId], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [factureId, changes] of Object.entries(modifications)) {
        const facture = data.factures.find((f) => f.id === factureId);
        if (!facture) continue;
        for (const devisId of facture.devis_ids) {
          await devisAPI.updatePaiement(devisId, {
            statutPaiement: changes.statutPaiement ?? facture.statutPaiement,
            datePaiement: changes.datePaiement ?? facture.datePaiement,
            commentairePaiement: changes.commentairePaiement ?? facture.commentairePaiement,
          });
        }
      }
      setModifications({});
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  const facturesIPM = data.factures.filter((f) => f.typePriseEnCharge === 'IPM');
  const facturesAssurance = data.factures.filter((f) => f.typePriseEnCharge !== 'IPM');
  const hasModifications = Object.keys(modifications).length > 0;

  const onglets = [
    { value: 'IPM', label: 'IPM', titre: 'Factures IPM', labelEntite: 'IPM', factures: facturesIPM },
    { value: 'ASSURANCE', label: 'Assurances', titre: 'Factures Assurances', labelEntite: 'Assurance', factures: facturesAssurance },
  ];
  const ongletActif = onglets.find((o) => o.value === onglet);

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
        <h5 className="mb-0">Suivi des Factures</h5>
        <span className="badge bg-light text-dark border">
          {params.mois ? `${String(params.mois).padStart(2, '0')}/${params.annee}` : `Annee ${params.annee}`}
        </span>
        <ul className="nav nav-pills">
          {onglets.map((o) => (
            <li className="nav-item" key={o.value}>
              <button
                type="button"
                className={`nav-link ${onglet === o.value ? 'active' : ''}`}
                onClick={() => setOnglet(o.value)}
              >
                {o.label} <span className="badge bg-secondary ms-1">{o.factures.length}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <SectionFactures
        key={ongletActif.value}
        titre={ongletActif.titre}
        labelEntite={ongletActif.labelEntite}
        factures={ongletActif.factures}
        params={params}
        modifications={modifications}
        onChange={handleChange}
      />

      {hasModifications && (
        <button className="btn btn-success" onClick={handleSave} disabled={saving}>
          {saving && <span className="spinner-border spinner-border-sm me-2"></span>}
          Enregistrer les modifications
        </button>
      )}
    </div>
  );
}

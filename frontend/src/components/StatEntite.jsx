import { formatMontant } from '../utils/devisUtils';
import { generatePDFStatEntite } from '../utils/pdfUtils';

const STATUT_BADGES = {
  NON_REGLE: { label: 'Non regle', couleur: 'danger' },
  PARTIELLEMENT_REGLE: { label: 'Partiellement regle', couleur: 'warning' },
  REGLE: { label: 'Regle', couleur: 'success' },
};

const formatDate = (iso) => (iso ? iso.split('-').reverse().join('/') : '-');

// Statistiques et liste des devis d'une IPM ou d'une assurance pour la periode choisie.
export default function StatEntite({ entite, factures, params }) {
  const facture = factures.find((f) => f.id === `${entite.type}:${entite.id}`);
  const devis = facture?.devis ?? [];

  const stats = {
    nbDevis: devis.length,
    montantTotal: devis.reduce((sum, d) => sum + Number(d.total || 0), 0),
    montantCouvert: devis.reduce((sum, d) => sum + Number(d.montantCouvert || 0), 0),
    nonRegles: devis.filter((d) => d.statutPaiement === 'NON_REGLE').length,
    partiellementRegles: devis.filter((d) => d.statutPaiement === 'PARTIELLEMENT_REGLE').length,
    regles: devis.filter((d) => d.statutPaiement === 'REGLE').length,
  };

  const periodeLabel = params.mois
    ? `${String(params.mois).padStart(2, '0')}/${params.annee}`
    : `Annee ${params.annee}`;

  const cartes = [
    { label: 'Nombre de devis', valeur: stats.nbDevis, classe: 'text-dark' },
    { label: 'Montant total devis', valeur: `${formatMontant(stats.montantTotal)} FCFA`, classe: 'text-dark' },
    { label: `Montant pris en charge`, valeur: `${formatMontant(stats.montantCouvert)} FCFA`, classe: 'text-primary' },
    { label: 'Non regles', valeur: stats.nonRegles, classe: 'text-danger' },
    { label: 'Partiellement regles', valeur: stats.partiellementRegles, classe: 'text-warning' },
    { label: 'Regles', valeur: stats.regles, classe: 'text-success' },
  ];

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h5 className="mb-0">
            {entite.type === 'IPM' ? 'IPM' : 'Assurance'} : {entite.nom}
            <span className="badge bg-light text-dark border ms-2">{periodeLabel}</span>
          </h5>
          <button
            className="btn btn-outline-primary btn-sm"
            disabled={devis.length === 0}
            onClick={() => generatePDFStatEntite(entite, devis, stats, params)}
          >
            <i className="bi bi-file-earmark-pdf me-2"></i>Telecharger PDF
          </button>
        </div>

        <div className="row g-3 mb-3">
          {cartes.map((c) => (
            <div className="col-6 col-md-2" key={c.label}>
              <div className="card h-100">
                <div className="card-body p-2">
                  <div className="text-muted small">{c.label}</div>
                  <div className={`fw-bold ${c.classe}`}>{c.valeur}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="table-responsive">
          <table className="table table-sm table-bordered bg-white mb-0">
            <thead>
              <tr>
                <th>N&deg; Devis</th>
                <th>Date</th>
                <th>Patient</th>
                <th>Matricule</th>
                <th className="text-end">Total</th>
                <th className="text-end">Pris en charge</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {devis.map((d) => {
                const badge = STATUT_BADGES[d.statutPaiement] ?? STATUT_BADGES.NON_REGLE;
                return (
                  <tr key={d.id}>
                    <td>{d.numero}</td>
                    <td>{formatDate(d.dateCreation)}</td>
                    <td>{d.patientNom}</td>
                    <td>{d.matricule || '-'}</td>
                    <td className="text-end">{formatMontant(d.total)} FCFA</td>
                    <td className="text-end">{formatMontant(d.montantCouvert)} FCFA</td>
                    <td>
                      <span className={`badge bg-${badge.couleur}`}>{badge.label}</span>
                    </td>
                  </tr>
                );
              })}
              {devis.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-3">
                    Aucun devis pour {entite.nom} sur cette periode.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

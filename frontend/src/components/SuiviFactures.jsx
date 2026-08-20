import { useEffect, useState } from 'react';
import { statistiquesAPI, devisAPI } from '../api/endpoints';
import { formatMontant } from '../utils/devisUtils';
import { generatePDFListeFactures } from '../utils/pdfUtils';

const STATUTS = [
  { value: 'NON_REGLE', label: 'Non regle' },
  { value: 'PARTIELLEMENT_REGLE', label: 'Partiellement regle' },
  { value: 'REGLE', label: 'Regle' },
];

export default function SuiviFactures() {
  const now = new Date();
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [annee, setAnnee] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modifications, setModifications] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    statistiquesAPI
      .getPaiement({ mois, annee, periode: 'mois' })
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    setModifications({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mois, annee]);

  const handleChange = (factureId, field, value) => {
    setModifications((prev) => ({
      ...prev,
      [factureId]: { ...prev[factureId], [field]: value },
    }));
  };

  const getValue = (facture, field) => {
    const fieldMap = {
      statutPaiement: 'statutPaiement',
      datePaiement: 'datePaiement',
      commentairePaiement: 'commentairePaiement',
    };
    return modifications[facture.id]?.[field] ?? facture[fieldMap[field]] ?? '';
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
      load();
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return <div className="text-center py-4"><div className="spinner-border text-primary"></div></div>;
  }

  const hasModifications = Object.keys(modifications).length > 0;

  return (
    <div>
      <h5 className="mb-3">Suivi des Factures</h5>

      <div className="row g-2 mb-3">
        <div className="col-md-3">
          <select className="form-select" value={mois} onChange={(e) => setMois(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-3">
          <input
            type="number"
            className="form-control"
            value={annee}
            onChange={(e) => setAnnee(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <div className="card border-danger">
            <div className="card-body">
              <div className="text-muted small">Non regles</div>
              <div className="fs-4 fw-bold text-danger">{data.statistiques.nonRegles}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-warning">
            <div className="card-body">
              <div className="text-muted small">Partiellement regles</div>
              <div className="fs-4 fw-bold text-warning">{data.statistiques.partiellementRegles}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-success">
            <div className="card-body">
              <div className="text-muted small">Regles</div>
              <div className="fs-4 fw-bold text-success">{data.statistiques.regles}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-primary">
            <div className="card-body">
              <div className="text-muted small">Montant total</div>
              <div className="fs-5 fw-bold text-primary">{formatMontant(data.statistiques.montantTotal)} FCFA</div>
            </div>
          </div>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered bg-white">
          <thead>
            <tr>
              <th>N&deg; Facture</th>
              <th>IPM / Assurance</th>
              <th>Montant couvert</th>
              <th>Statut</th>
              <th>Date paiement</th>
              <th>Commentaire</th>
            </tr>
          </thead>
          <tbody>
            {data.factures.map((f) => {
              const modified = !!modifications[f.id];
              return (
                <tr key={f.id} className={modified ? 'table-warning' : ''}>
                  <td>{f.numeroFacture}</td>
                  <td>{f.entiteNom}</td>
                  <td>{formatMontant(f.montantCouvert)} FCFA</td>
                  <td>
                    <select
                      className="form-select form-select-sm"
                      value={getValue(f, 'statutPaiement')}
                      onChange={(e) => handleChange(f.id, 'statutPaiement', e.target.value)}
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
                      onChange={(e) => handleChange(f.id, 'datePaiement', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={getValue(f, 'commentairePaiement') || ''}
                      onChange={(e) => handleChange(f.id, 'commentairePaiement', e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
            {data.factures.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted py-3">
                  Aucune facture pour cette periode.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="d-flex gap-2">
        {hasModifications && (
          <button className="btn btn-success" onClick={handleSave} disabled={saving}>
            {saving && <span className="spinner-border spinner-border-sm me-2"></span>}
            Enregistrer les modifications
          </button>
        )}
        <button
          className="btn btn-outline-primary"
          onClick={() => generatePDFListeFactures(data.factures, mois, annee, data.statistiques)}
        >
          <i className="bi bi-file-earmark-pdf me-2"></i>Telecharger PDF
        </button>
      </div>
    </div>
  );
}

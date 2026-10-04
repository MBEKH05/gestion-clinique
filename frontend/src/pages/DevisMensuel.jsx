import { useState } from 'react';
import { useData } from '../context/DataContext';
import { TYPES_PRISE_EN_CHARGE, getTypePriseEnCharge } from '../utils/priseEnCharge';
import { facturesMensuellesAPI, devisAPI } from '../api/endpoints';
import { convertDevisFromAPI } from '../utils/apiConverters';
import { formatMontant } from '../utils/devisUtils';
import { generatePDFDevisMensuel } from '../utils/pdfUtils';

function moisCourant() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatPeriodeMois(mois) {
  if (!mois) return '';
  const [annee, moisNum] = mois.split('-').map(Number);
  const debut = new Date(annee, moisNum - 1, 1);
  const fin = new Date(annee, moisNum, 0);
  const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  return `${fmt(debut)} au ${fmt(fin)}`;
}

export default function DevisMensuel() {
  const { ipms, assurances, caisses } = useData();
  const [mois, setMois] = useState(moisCourant);
  const [typePriseEnCharge, setTypePriseEnCharge] = useState('IPM');
  const [ipmId, setIpmId] = useState('');
  const [assuranceId, setAssuranceId] = useState('');
  const [caisseId, setCaisseId] = useState('');

  const [results, setResults] = useState(null);
  const [numeroFacture, setNumeroFacture] = useState('');
  const [loading, setLoading] = useState(false);

  const listes = { ipms, assurances, caisses };
  const entiteIds = { IPM: ipmId, ASSURANCE: assuranceId, CAISSE: caisseId };
  const setEntiteIds = { IPM: setIpmId, ASSURANCE: setAssuranceId, CAISSE: setCaisseId };
  const typeChoisi = getTypePriseEnCharge(typePriseEnCharge);
  const entiteId = entiteIds[typeChoisi.value];
  const entite = (listes[typeChoisi.listKey] || []).find((e) => e.id === entiteId);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const [annee, moisNum] = mois.split('-');

      const [devisRes, numeroRes] = await Promise.all([
        devisAPI.getAll({
          mois,
          type_prise_en_charge: typePriseEnCharge,
          entite_id: entiteId,
          page_size: 5000,
        }),
        facturesMensuellesAPI.genererNumero(Number(moisNum), Number(annee), typePriseEnCharge, entiteId),
      ]);

      const devisMois = devisRes.data.results.map(convertDevisFromAPI);

      const rows = devisMois.map((d) => {
        const taux = Number(d.tauxCouverture) || 0;
        const montant = d.total * (1 - taux / 100);
        return {
          participant: d.souscripteur || d.patientNom || '-',
          matricule: d.patientMatricule || '-',
          patientNom: d.patientNom || '-',
          montant,
        };
      });

      setResults(rows);
      setNumeroFacture(numeroRes.data.numero);
    } finally {
      setLoading(false);
    }
  };

  const total = results ? results.reduce((sum, r) => sum + r.montant, 0) : 0;

  const handleNouvelleRecherche = () => {
    setResults(null);
    setNumeroFacture('');
  };

  return (
    <div>
      <h2 className="mb-4">Factures Mensuelles</h2>

      {!results ? (
        <div className="card shadow-sm" style={{ maxWidth: 600 }}>
          <div className="card-body">
            <form onSubmit={handleSearch}>
              <div className="mb-3">
                <label className="form-label">Mois</label>
                <input type="month" className="form-control" value={mois} onChange={(e) => setMois(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Type de prise en charge</label>
                <select
                  className="form-select"
                  value={typePriseEnCharge}
                  onChange={(e) => setTypePriseEnCharge(e.target.value)}
                >
                  {TYPES_PRISE_EN_CHARGE.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">{typeChoisi.label}</label>
                <select
                  className="form-select"
                  value={entiteIds[typeChoisi.value]}
                  onChange={(e) => setEntiteIds[typeChoisi.value](e.target.value)}
                  required
                >
                  <option value="">-- Selectionner --</option>
                  {(listes[typeChoisi.listKey] || []).map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nom}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading && <span className="spinner-border spinner-border-sm me-2"></span>}
                Rechercher
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3 no-print">
            <h4 className="mb-0">N&deg; Facture : {numeroFacture}</h4>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary" onClick={() => window.print()}>
                <i className="bi bi-printer me-2"></i>Imprimer
              </button>
              <button
                className="btn btn-outline-primary"
                onClick={() => generatePDFDevisMensuel(results, entite?.nom, mois, typePriseEnCharge, numeroFacture)}
              >
                <i className="bi bi-file-earmark-pdf me-2"></i>PDF
              </button>
              <button className="btn btn-outline-secondary" onClick={handleNouvelleRecherche}>
                Nouvelle recherche
              </button>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-body p-4">
              <div
                className="d-flex justify-content-between align-items-start mb-4 pb-3"
                style={{ borderBottom: '3px solid var(--color-primary)' }}
              >
                <div className="d-flex gap-3">
                  <img
                    src="/NABY.jpg"
                    alt="logo"
                    style={{ width: 60, height: 60, objectFit: 'contain' }}
                    onError={(e) => (e.target.style.display = 'none')}
                  />
                  <div>
                    <h5 className="fw-bold mb-0">CLINIQUE SOPE NABY</h5>
                    <div className="small text-muted">Tel : +221 33 836 29 79</div>
                    <div className="small text-muted">Email : cliniquenaby13@gmail.com</div>
                  </div>
                </div>
                <div className="text-end">
                  <h5 className="fw-bold mb-1">FACTURE MENSUELLE - {(entite?.nom || '').toUpperCase()}</h5>
                  <div className="small">
                    <strong>N&deg; Facture :</strong> {numeroFacture}
                  </div>
                  <div className="small">
                    <strong>Periode :</strong> {formatPeriodeMois(mois)}
                  </div>
                  <div className="small">
                    <strong>Type :</strong> {typeChoisi.label}
                  </div>
                  <div className="small">
                    <strong>Nombre de devis :</strong> {results.length}
                  </div>
                </div>
              </div>

              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>PARTICIPANT</th>
                    <th>MATRICULE</th>
                    <th>PATIENT</th>
                    <th>MONTANT (FCFA)</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, idx) => (
                    <tr key={idx}>
                      <td>{r.participant}</td>
                      <td>{r.matricule}</td>
                      <td>{r.patientNom}</td>
                      <td>{formatMontant(r.montant)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="text-end fw-bold">
                      TOTAL
                    </td>
                    <td className="fw-bold">{formatMontant(total)}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="text-center mt-5">
                <div className="fw-bold">La comptabilite</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

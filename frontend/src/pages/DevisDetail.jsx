import { Fragment, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { devisAPI, patientsAPI } from '../api/endpoints';
import { convertDevisFromAPI, convertPatientFromAPI } from '../utils/apiConverters';
import { getDevisNumero, formatMontant } from '../utils/devisUtils';
import { useData } from '../context/DataContext';
import { CATEGORY_ORDER } from '../utils/categoryUtils';
import { generatePDFDevis } from '../utils/pdfUtils';

export default function DevisDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { ipms, assurances } = useData();
  const [devis, setDevis] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    devisAPI
      .get(id)
      .then(({ data }) => {
        const d = convertDevisFromAPI(data);
        setDevis(d);
        return patientsAPI.get(d.patientId).then(({ data: p }) => setPatient(convertPatientFromAPI(p)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  }

  if (!devis) {
    return <div className="alert alert-warning">Devis introuvable.</div>;
  }

  const entiteNom =
    patient?.typePriseEnCharge === 'IPM'
      ? ipms.find((i) => i.id === patient.ipmId)?.nom
      : assurances.find((a) => a.id === patient?.assuranceId)?.nom;

  const lignesParCategorie = {};
  devis.lignes.forEach((l) => {
    const cat = l.categorie || 'autres';
    if (!lignesParCategorie[cat]) lignesParCategorie[cat] = [];
    lignesParCategorie[cat].push(l);
  });

  const categoriesOrdonnees = [
    ...CATEGORY_ORDER.filter((c) => lignesParCategorie[c]),
    ...Object.keys(lignesParCategorie).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  const tauxNum = Number(devis.tauxCouverture) || 0;
  const montantAPayer = devis.total * (tauxNum / 100);
  const montantCouvert = devis.total - montantAPayer;

  let compteur = 0;

  return (
    <div>
      <div className="d-flex justify-content-between mb-3 no-print">
        <h2 className="mb-0">Devis #{getDevisNumero(devis)}</h2>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => window.print()}>
            <i className="bi bi-printer me-2"></i>Imprimer
          </button>
          <button
            className="btn btn-outline-primary"
            onClick={() => generatePDFDevis(devis, patient, entiteNom)}
          >
            <i className="bi bi-file-earmark-pdf me-2"></i>PDF
          </button>
          <Link to={`/devis/${id}/modifier`} className="btn btn-outline-secondary">
            Modifier
          </Link>
          <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
            Retour
          </button>
        </div>
      </div>

      <div className="card shadow-sm position-relative">
        {devis.isProforma && <div className="watermark-proforma">PROFORMA</div>}
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-start mb-4 pb-3" style={{ borderBottom: '3px solid var(--color-primary)' }}>
            <div className="d-flex gap-3">
              <img src="/NABY.jpg" alt="logo" style={{ width: 60, height: 60, objectFit: 'contain' }} onError={(e) => (e.target.style.display = 'none')} />
              <div>
                <h5 className="fw-bold mb-0">CLINIQUE SOPE NABY</h5>
                <div className="small text-muted">Tel : +221 33 836 29 79</div>
                <div className="small text-muted">Email : cliniquenaby13@gmail.com</div>
              </div>
            </div>
            <div className="text-end">
              <h5 className="fw-bold">FACTURE N&deg; {getDevisNumero(devis)}</h5>
              <div className="text-muted">
                {devis.dateCreation ? new Date(devis.dateCreation).toLocaleDateString('fr-FR') : ''}
              </div>
            </div>
          </div>

          <div className="row mb-4">
            <div className="col-md-6">
              <div>
                <strong>Nom :</strong> {devis.patientNom}
              </div>
              {devis.souscripteur && (
                <div>
                  <strong>Souscripteur :</strong> {devis.souscripteur}
                </div>
              )}
              <div>
                <strong>Matricule :</strong> {devis.patientMatricule}
              </div>
              <div>
                <strong>Prise en charge :</strong> {patient?.typePriseEnCharge} {entiteNom ? `- ${entiteNom}` : ''}
              </div>
            </div>
          </div>

          <table className="table table-bordered">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}>
                <th>#</th>
                <th>Categorie / Prestation</th>
                <th>Prix (FCFA)</th>
              </tr>
            </thead>
            <tbody>
              {categoriesOrdonnees.map((cat) => (
                <Fragment key={cat}>
                  <tr className="table-secondary">
                    <td colSpan={3} className="fw-bold text-capitalize">
                      {cat}
                    </td>
                  </tr>
                  {lignesParCategorie[cat].map((l) => {
                    compteur += 1;
                    return (
                      <tr key={l.id}>
                        <td>{compteur}</td>
                        <td>
                          {l.nom} {l.quantite > 1 && <span className="text-muted">x{l.quantite}</span>}
                        </td>
                        <td>{formatMontant(l.prix * l.quantite)}</td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="text-end fw-bold">
                  TOTAL
                </td>
                <td className="fw-bold">{formatMontant(devis.total)}</td>
              </tr>
              {devis.tauxCouverture && (
                <>
                  <tr>
                    <td colSpan={2} className="text-end">
                      Part patients ({tauxNum}%)
                    </td>
                    <td>{formatMontant(montantAPayer)}</td>
                  </tr>
                  <tr className="table-success">
                    <td colSpan={2} className="text-end fw-bold">
                      Montant a payer
                    </td>
                    <td className="fw-bold">{formatMontant(montantAPayer)}</td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="text-end">
                      Montant couvert
                    </td>
                    <td>{formatMontant(montantCouvert)}</td>
                  </tr>
                </>
              )}
            </tfoot>
          </table>

          <div className="text-center mt-5">
            <div className="fw-bold">La comptabilite</div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { categoriesAPI, statistiquesAPI } from '../api/endpoints';
import { formatMontant } from '../utils/devisUtils';
import { generatePDFDetailPrestation } from '../utils/pdfUtils';

const aujourdhui = () => new Date().toISOString().slice(0, 10);
const debutDuMois = () => `${aujourdhui().slice(0, 7)}-01`;
const dateFr = (iso) => iso.split('-').reverse().join('/');

// Detail des prestations d'une categorie (choisie dans la base) sur une periode :
// pour chaque prestation, une ligne par jour (nb patients, nb prestations, prix x quantite).
export default function DetailPrestation() {
  const [categories, setCategories] = useState([]);
  const [categorie, setCategorie] = useState('');
  const [dateDebut, setDateDebut] = useState(debutDuMois());
  const [dateFin, setDateFin] = useState(aujourdhui());
  const [resultat, setResultat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfEnCours, setPdfEnCours] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    categoriesAPI
      .getAll()
      .then(({ data }) => setCategories(Array.isArray(data) ? data : data?.data || []))
      .catch(() => setErreur('Impossible de charger les categories.'));
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setErreur('');
    if (!categorie) {
      setErreur('Choisissez une categorie.');
      return;
    }
    if (dateFin < dateDebut) {
      setErreur('La date de fin doit etre apres la date de debut.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await statistiquesAPI.getPrestations({ categorie, date_debut: dateDebut, date_fin: dateFin });
      setResultat(data);
    } catch (err) {
      setResultat(null);
      setErreur(err.response?.data?.message || err.response?.data?.detail || 'Erreur lors du chargement.');
    } finally {
      setLoading(false);
    }
  };

  const telechargerPDF = async () => {
    if (!resultat) return;
    setPdfEnCours(true);
    try {
      await generatePDFDetailPrestation(resultat);
    } finally {
      setPdfEnCours(false);
    }
  };

  const t = resultat?.totaux;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <h2 className="mb-0">Detail de prestation</h2>
        {resultat && resultat.services.length > 0 && (
          <button className="btn btn-outline-primary" onClick={telechargerPDF} disabled={pdfEnCours || loading}>
            <i className="bi bi-file-earmark-pdf me-2"></i>
            {pdfEnCours ? 'Generation...' : 'Telecharger le PDF'}
          </button>
        )}
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <form className="row g-2 align-items-end" onSubmit={handleSearch}>
            <div className="col-md-3">
              <label className="form-label small">Categorie</label>
              <select className="form-select text-capitalize" value={categorie} onChange={(e) => setCategorie(e.target.value)} required>
                <option value="">-- Choisir une categorie --</option>
                {categories.map((c) => (
                  <option key={c.nom} value={c.nom}>
                    {c.nom}
                    {c.actif === false ? ' (inactive)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small">Date de debut</label>
              <input type="date" className="form-control" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} required />
            </div>
            <div className="col-md-3">
              <label className="form-label small">Date de fin</label>
              <input type="date" className="form-control" value={dateFin} onChange={(e) => setDateFin(e.target.value)} required />
            </div>
            <div className="col-md-3">
              <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                {loading && <span className="spinner-border spinner-border-sm me-2"></span>}
                Rechercher
              </button>
            </div>
          </form>
          {erreur && <div className="alert alert-danger mt-3 mb-0 py-2">{erreur}</div>}
        </div>
      </div>

      {resultat && !loading && (
        <>
          <h5 className="mb-3">
            <span className="text-capitalize">{resultat.categorie}</span>
            <span className="text-muted fw-normal small ms-2">
              du {dateFr(resultat.periode.debut)} au {dateFr(resultat.periode.fin)}
            </span>
          </h5>

          {resultat.services.length === 0 ? (
            <div className="alert alert-info">Aucune prestation de cette categorie sur cette periode.</div>
          ) : (
            <>
              {resultat.services.map((s) => (
                <div className="card shadow-sm mb-3" key={s.id}>
                  <div className="card-header bg-primary text-white">{s.nom}</div>
                  <div className="card-body p-0">
                    <table className="table mb-0">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Nb patients</th>
                          <th>Nb prestations</th>
                          <th className="text-end">Prix</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.jours.map((j) => (
                          <tr key={j.date}>
                            <td>{dateFr(j.date)}</td>
                            <td>
                              <span className="badge bg-primary">{j.nbPatients}</span>
                            </td>
                            <td>
                              <span className="badge bg-success">{j.nbPrestations}</span>
                            </td>
                            <td className="text-end">{formatMontant(j.montant)} FCFA</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="fw-bold">
                          <td>TOTAL</td>
                          <td>{s.nbPatients}</td>
                          <td>{s.nbPrestations}</td>
                          <td className="text-end">{formatMontant(s.montant)} FCFA</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))}

              <div className="card shadow-sm border-primary">
                <div className="card-body d-flex justify-content-between flex-wrap gap-2 fw-bold">
                  <span>
                    TOTAL <span className="text-capitalize">{resultat.categorie}</span>
                  </span>
                  <span>{t.nbPatients} patient(s)</span>
                  <span>{t.nbPrestations} prestation(s)</span>
                  <span>{formatMontant(t.montant)} FCFA</span>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

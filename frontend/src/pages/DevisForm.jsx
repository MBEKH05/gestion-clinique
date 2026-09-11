import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { devisAPI, patientsAPI } from '../api/endpoints';
import { convertDevisFromAPI, convertPatientFromAPI } from '../utils/apiConverters';
import { formatMontant } from '../utils/devisUtils';

export default function DevisForm({ isProforma: isProformaProp = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { analyses, ipms, assurances, categories, getPrixAnalyse, reloadTarifs, addDevis, updateDevis, addPatient, updatePatient } =
    useData();

  const isEdit = !!id;
  const [loadingDevis, setLoadingDevis] = useState(isEdit);

  const [nomComplet, setNomComplet] = useState('');
  const [matricule, setMatricule] = useState('');
  const [typePriseEnCharge, setTypePriseEnCharge] = useState('IPM');
  const [ipmId, setIpmId] = useState('');
  const [assuranceId, setAssuranceId] = useState('');
  const [souscripteur, setSouscripteur] = useState('');
  const [isProforma] = useState(isProformaProp);

  const [searchAnalyse, setSearchAnalyse] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');
  const [lignes, setLignes] = useState([]);
  const [justAddedId, setJustAddedId] = useState(null);
  const [tauxCouverture, setTauxCouverture] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [existingPatientId, setExistingPatientId] = useState(null);

  useEffect(() => {
    if (!isEdit) reloadTarifs();
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    devisAPI.get(id).then(({ data }) => {
      const d = convertDevisFromAPI(data);
      patientsAPI
        .get(d.patientId)
        .then(({ data: p }) => {
          const patient = convertPatientFromAPI(p);
          setNomComplet(patient.nomComplet);
          setMatricule(patient.matricule);
          setTypePriseEnCharge(patient.typePriseEnCharge);
          setIpmId(patient.ipmId || '');
          setAssuranceId(patient.assuranceId || '');
          setExistingPatientId(patient.id);
        })
        .catch(() => {})
        .finally(() => {
          setSouscripteur(d.souscripteur || '');
          setTauxCouverture(d.tauxCouverture || '0');
          setLignes(d.lignes);
          setLoadingDevis(false);
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id]);

  const categorieNames = categories.map((c) => (typeof c === 'string' ? c : c.nom));

  const analysesFiltrees = useMemo(() => {
    return analyses
      .filter((a) => a.nom.toLowerCase().includes(searchAnalyse.toLowerCase()))
      .filter((a) => !filterCategorie || a.categorie === filterCategorie);
  }, [analyses, searchAnalyse, filterCategorie]);

  const lignesCountByAnalyse = useMemo(() => {
    const map = new Map();
    lignes.forEach((l) => map.set(l.analyseId, (map.get(l.analyseId) || 0) + 1));
    return map;
  }, [lignes]);

  const handleAddAnalyse = (analyse) => {
    const prix = getPrixAnalyse(analyse.id, typePriseEnCharge === 'IPM' ? ipmId : null, typePriseEnCharge === 'ASSURANCE' ? assuranceId : null);
    const newLigne = {
      id: `tmp-${Date.now()}`,
      analyseId: analyse.id,
      nom: analyse.nom,
      categorie: analyse.categorie,
      prix,
      quantite: 1,
    };
    setLignes((prev) => [...prev, newLigne]);
    setJustAddedId(newLigne.id);
    setTimeout(() => setJustAddedId(null), 2000);
  };

  const handleRemoveLigne = (ligneId) => {
    setLignes((prev) => prev.filter((l) => l.id !== ligneId));
  };

  const handleRecalculerPrix = () => {
    const ipm = typePriseEnCharge === 'IPM' ? ipmId : null;
    const assurance = typePriseEnCharge === 'ASSURANCE' ? assuranceId : null;
    setLignes((prev) =>
      prev.map((l) => {
        const nouveauPrix = getPrixAnalyse(l.analyseId, ipm, assurance);
        return nouveauPrix > 0 ? { ...l, prix: nouveauPrix } : l;
      })
    );
  };

  const handleLigneChange = (ligneId, field, value) => {
    setLignes((prev) =>
      prev.map((l) => (l.id === ligneId ? { ...l, [field]: field === 'quantite' ? Math.max(1, Number(value)) : Number(value) } : l))
    );
  };

  const total = lignes.reduce((sum, l) => sum + l.prix * l.quantite, 0);
  const tauxNum = Number(tauxCouverture) || 0;
  const montantAPayer = total * (tauxNum / 100);
  const montantCouvert = total - montantAPayer;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (lignes.length === 0) {
      setError('Ajoutez au moins une analyse au devis.');
      return;
    }

    setSaving(true);
    try {
      let patientId = existingPatientId;
      const patientPayload = {
        nomComplet,
        matricule,
        typePriseEnCharge,
        ipmId: typePriseEnCharge === 'IPM' ? ipmId : '',
        assuranceId: typePriseEnCharge === 'ASSURANCE' ? assuranceId : '',
      };

      const { data: searchData } = await patientsAPI.search(matricule, 1, 20);
      const found = searchData.results
        .map(convertPatientFromAPI)
        .find((p) => p.matricule === matricule && p.nomComplet.toLowerCase() === nomComplet.toLowerCase());

      if (found) {
        patientId = found.id;
        const changed =
          found.typePriseEnCharge !== typePriseEnCharge ||
          found.ipmId !== patientPayload.ipmId ||
          found.assuranceId !== patientPayload.assuranceId;
        if (changed) {
          await updatePatient(found.id, patientPayload);
        }
      } else if (!patientId) {
        const created = await addPatient(patientPayload);
        patientId = created.id;
      } else {
        await updatePatient(patientId, patientPayload);
      }

      const devisPayload = {
        patientId,
        souscripteur,
        tauxCouverture,
        isProforma,
        lignes: lignes.map((l) => ({ analyseId: l.analyseId, prix: l.prix, quantite: l.quantite })),
      };

      let result;
      if (isEdit) {
        result = await updateDevis(id, devisPayload);
      } else {
        result = await addDevis(devisPayload);
      }

      navigate(isProforma ? '/devis/proforma' : `/devis/${result.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'enregistrement du devis.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingDevis) {
    return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  }

  return (
    <div>
      <h2 className="mb-4">
        {isEdit ? 'Modifier' : 'Creer'} {isProforma ? 'une demande de devis' : 'un devis'}
      </h2>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title">Informations du patient</h5>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Nom complet</label>
                <input
                  type="text"
                  className="form-control"
                  value={nomComplet}
                  onChange={(e) => setNomComplet(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Matricule</label>
                <input
                  type="text"
                  className="form-control"
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Type de prise en charge</label>
                <select
                  className="form-select"
                  value={typePriseEnCharge}
                  onChange={(e) => setTypePriseEnCharge(e.target.value)}
                >
                  <option value="IPM">IPM</option>
                  <option value="ASSURANCE">Assurance</option>
                </select>
              </div>
              {typePriseEnCharge === 'IPM' ? (
                <div className="col-md-4">
                  <label className="form-label">IPM</label>
                  <select className="form-select" value={ipmId} onChange={(e) => setIpmId(e.target.value)} required>
                    <option value="">-- Selectionner --</option>
                    {ipms.filter((i) => i.actif).map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.nom}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="col-md-4">
                  <label className="form-label">Assurance</label>
                  <select
                    className="form-select"
                    value={assuranceId}
                    onChange={(e) => setAssuranceId(e.target.value)}
                    required
                  >
                    <option value="">-- Selectionner --</option>
                    {assurances.filter((a) => a.actif).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nom}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="col-md-4">
                <label className="form-label">Souscripteur (optionnel)</label>
                <input
                  type="text"
                  className="form-control"
                  value={souscripteur}
                  onChange={(e) => setSouscripteur(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title">Selection des analyses</h5>
            <div className="row g-2 mb-3">
              <div className="col-md-8">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Rechercher une analyse..."
                  value={searchAnalyse}
                  onChange={(e) => setSearchAnalyse(e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <select
                  className="form-select"
                  value={filterCategorie}
                  onChange={(e) => setFilterCategorie(e.target.value)}
                >
                  <option value="">Toutes categories</option>
                  {categorieNames.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-muted small">
              {analysesFiltrees.length} analyse(s) disponible(s){filterCategorie ? ` dans la categorie ${filterCategorie}` : ''}
            </p>
            <div className="row g-2" style={{ maxHeight: 300, overflowY: 'auto' }}>
              {analysesFiltrees.map((a) => {
                const prix = getPrixAnalyse(a.id, typePriseEnCharge === 'IPM' ? ipmId : null, typePriseEnCharge === 'ASSURANCE' ? assuranceId : null);
                const nbDejaAjoutee = lignesCountByAnalyse.get(a.id) || 0;
                const dejaAjoutee = nbDejaAjoutee > 0;
                return (
                  <div className="col-md-4" key={a.id}>
                    <div
                      className={`card card-analyse h-100 position-relative ${dejaAjoutee ? 'card-analyse-selected' : ''}`}
                      onClick={() => handleAddAnalyse(a)}
                      title={dejaAjoutee ? 'Deja ajoutee au devis - cliquer pour ajouter a nouveau' : 'Ajouter au devis'}
                    >
                      {dejaAjoutee && (
                        <span className="badge bg-success card-analyse-badge">
                          <i className="bi bi-check-lg me-1"></i>
                          Deja pris{nbDejaAjoutee > 1 ? ` (x${nbDejaAjoutee})` : ''}
                        </span>
                      )}
                      <div className="card-body py-2 px-3">
                        <span className="badge bg-secondary text-capitalize mb-1">{a.categorie}</span>
                        <div className="small fw-semibold">{a.nom}</div>
                        <span className="badge bg-light text-dark">{formatMontant(prix)} FCFA</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="card-title mb-0">Lignes du devis</h5>
              {lignes.length > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-warning"
                  onClick={handleRecalculerPrix}
                  title="Recalculer les prix selon les tarifs actuels"
                >
                  <i className="bi bi-arrow-repeat me-1"></i>
                  Mettre a jour les prix
                </button>
              )}
            </div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Analyse / Categorie</th>
                    <th>Quantite</th>
                    <th>Prix unitaire (FCFA)</th>
                    <th>Sous-total (FCFA)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((l, idx) => (
                    <tr key={l.id} className={justAddedId === l.id ? 'flash-added' : ''}>
                      <td>{idx + 1}</td>
                      <td>
                        <span className="badge bg-secondary text-capitalize me-2">{l.categorie}</span>
                        {l.nom}
                      </td>
                      <td style={{ width: 100 }}>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          className="form-control form-control-sm"
                          value={l.quantite}
                          onChange={(e) => handleLigneChange(l.id, 'quantite', e.target.value)}
                        />
                      </td>
                      <td style={{ width: 140 }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="form-control form-control-sm"
                          value={l.prix}
                          onChange={(e) => handleLigneChange(l.id, 'prix', e.target.value)}
                        />
                      </td>
                      <td>{formatMontant(l.prix * l.quantite)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleRemoveLigne(l.id)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {lignes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-3">
                        Aucune analyse ajoutee.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="text-end fw-bold">
                      TOTAL
                    </td>
                    <td colSpan={2}>
                      <span className="badge bg-primary fs-6">{formatMontant(total)} FCFA</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {lignes.length > 0 && (
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h5 className="card-title">Part patients</h5>
              <div className="row g-3 align-items-end">
                <div className="col-md-3">
                  <label className="form-label">Part patients (%)</label>
                  <select
                    className="form-select"
                    value={tauxCouverture}
                    onChange={(e) => setTauxCouverture(e.target.value)}
                  >
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((v) => (
                      <option key={v} value={v}>
                        {v}%
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-9">
                  <div className="d-flex gap-4 flex-wrap">
                    <div>
                      <div className="text-muted small">Total du devis</div>
                      <div className="fw-bold">{formatMontant(total)} FCFA</div>
                    </div>
                    <div>
                      <div className="text-muted small">Montant a payer ({tauxNum}%)</div>
                      <div className="fw-bold text-success">{formatMontant(montantAPayer)} FCFA</div>
                    </div>
                    <div>
                      <div className="text-muted small">Montant couvert</div>
                      <div className="fw-bold">{formatMontant(montantCouvert)} FCFA</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner-border spinner-border-sm me-2"></span>}
            {isEdit ? 'Modifier' : 'Creer'}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate(isProforma ? '/devis/proforma' : '/historique')}
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}

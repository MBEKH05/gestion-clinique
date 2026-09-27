import { useCallback, useEffect, useMemo, useState } from 'react';
import { statistiquesAPI } from '../api/endpoints';
import { formatMontant } from '../utils/devisUtils';
import SuiviFactures from '../components/SuiviFactures';
import StatEntite from '../components/StatEntite';
import { useData } from '../context/DataContext';

export default function Statistiques() {
  const [periodeType, setPeriodeType] = useState('mois');
  const now = new Date();
  const [mois, setMois] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [annee, setAnnee] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [entiteChoisie, setEntiteChoisie] = useState('');
  const { ipms, assurances } = useData();

  // Toutes les IPM et assurances de la plateforme, meme sans devis sur la periode.
  const entites = useMemo(
    () => [
      ...(ipms || []).map((e) => ({ type: 'IPM', id: e.id, nom: e.nom })),
      ...(assurances || []).map((e) => ({ type: 'ASSURANCE', id: e.id, nom: e.nom })),
    ].sort((a, b) => String(a.nom).localeCompare(String(b.nom))),
    [ipms, assurances]
  );
  const entite = entites.find((e) => `${e.type}:${e.id}` === entiteChoisie);

  const params = useMemo(
    () =>
      periodeType === 'mois'
        ? { periode: 'mois', mois: Number(mois.split('-')[1]), annee: Number(mois.split('-')[0]) }
        : { periode: 'annee', annee: Number(annee) },
    [periodeType, mois, annee]
  );

  const load = useCallback(() => {
    setLoading(true);
    return statistiquesAPI
      .getPaiement(params)
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  const factures = useMemo(() => data?.factures || [], [data]);

  const { totalIPM, totalAssurance, parIPM, parAssurance } = useMemo(() => {
    const parIPM = factures
      .filter((f) => f.typePriseEnCharge === 'IPM')
      .map((f) => ({ nom: f.entiteNom, montant: f.montantCouvert }))
      .sort((a, b) => b.montant - a.montant);

    const parAssurance = factures
      .filter((f) => f.typePriseEnCharge === 'ASSURANCE')
      .map((f) => ({ nom: f.entiteNom, montant: f.montantCouvert }))
      .sort((a, b) => b.montant - a.montant);

    return {
      totalIPM: parIPM.reduce((sum, r) => sum + r.montant, 0),
      totalAssurance: parAssurance.reduce((sum, r) => sum + r.montant, 0),
      parIPM,
      parAssurance,
    };
  }, [factures]);

  return (
    <div>
      <h2 className="mb-4">Statistiques</h2>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label small">Type de periode</label>
              <select className="form-select" value={periodeType} onChange={(e) => setPeriodeType(e.target.value)}>
                <option value="mois">Par mois</option>
                <option value="annee">Par annee</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small">Periode</label>
              {periodeType === 'mois' ? (
                <input type="month" className="form-control" value={mois} onChange={(e) => setMois(e.target.value)} />
              ) : (
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  className="form-control"
                  value={annee}
                  onChange={(e) => setAnnee(e.target.value)}
                />
              )}
            </div>
            <div className="col-md-4">
              <label className="form-label small">IPM / Assurance</label>
              <select className="form-select" value={entiteChoisie} onChange={(e) => setEntiteChoisie(e.target.value)}>
                <option value="">Toutes (vue generale)</option>
                <optgroup label="IPM">
                  {entites.filter((e) => e.type === 'IPM').map((e) => (
                    <option key={`IPM:${e.id}`} value={`IPM:${e.id}`}>
                      {e.nom}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Assurances">
                  {entites.filter((e) => e.type === 'ASSURANCE').map((e) => (
                    <option key={`ASSURANCE:${e.id}`} value={`ASSURANCE:${e.id}`}>
                      {e.nom}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
        </div>
      </div>

      {entite && !loading && <StatEntite entite={entite} factures={factures} params={params} />}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <div className="text-muted small">Total IPM</div>
                  <div className="fs-4 fw-bold">{formatMontant(totalIPM)} FCFA</div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <div className="text-muted small">Total Assurances</div>
                  <div className="fs-4 fw-bold">{formatMontant(totalAssurance)} FCFA</div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-sm h-100 bg-primary text-white">
                <div className="card-body">
                  <div className="small">Total General</div>
                  <div className="fs-4 fw-bold">{formatMontant(totalIPM + totalAssurance)} FCFA</div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <div className="card shadow-sm">
                <div className="card-body">
                  <h5 className="card-title">Detail par IPM</h5>
                  <table className="table table-sm">
                    <tbody>
                      {parIPM.map((row) => (
                        <tr key={row.nom}>
                          <td>{row.nom}</td>
                          <td className="text-end">{formatMontant(row.montant)} FCFA</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="fw-bold">TOTAL IPM</td>
                        <td className="text-end fw-bold">{formatMontant(totalIPM)} FCFA</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card shadow-sm">
                <div className="card-body">
                  <h5 className="card-title">Detail par Assurance</h5>
                  <table className="table table-sm">
                    <tbody>
                      {parAssurance.map((row) => (
                        <tr key={row.nom}>
                          <td>{row.nom}</td>
                          <td className="text-end">{formatMontant(row.montant)} FCFA</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="fw-bold">TOTAL ASSURANCES</td>
                        <td className="text-end fw-bold">{formatMontant(totalAssurance)} FCFA</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="card shadow-sm">
        <div className="card-body">
          {data ? (
            <SuiviFactures data={data} params={params} onSaved={load} />
          ) : (
            <div className="text-center py-4"><div className="spinner-border text-primary"></div></div>
          )}
        </div>
      </div>
    </div>
  );
}

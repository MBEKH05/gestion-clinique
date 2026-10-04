import { useCallback, useEffect, useMemo, useState } from 'react';
import { statistiquesAPI } from '../api/endpoints';
import { formatMontant } from '../utils/devisUtils';
import SuiviFactures from '../components/SuiviFactures';
import { TYPES_PRISE_EN_CHARGE } from '../utils/priseEnCharge';

export default function Statistiques() {
  const [periodeType, setPeriodeType] = useState('mois');
  const now = new Date();
  const [mois, setMois] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [annee, setAnnee] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Total et detail par entite pour chaque type de prise en charge (IPM, Assurances, Caisses).
  const parType = useMemo(
    () =>
      TYPES_PRISE_EN_CHARGE.map((type) => {
        const lignes = factures
          .filter((f) => f.typePriseEnCharge === type.value)
          .map((f) => ({ nom: f.entiteNom, montant: f.montantCouvert }))
          .sort((x, y) => y.montant - x.montant);
        return { type, lignes, total: lignes.reduce((sum, r) => sum + r.montant, 0) };
      }),
    [factures]
  );
  const totalGeneral = parType.reduce((sum, t) => sum + t.total, 0);

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
          </div>
        </div>
      </div>


      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            {parType.map(({ type, total }) => (
              <div className="col-md-3" key={type.value}>
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <div className="text-muted small">Total {type.pluriel}</div>
                    <div className="fs-4 fw-bold">{formatMontant(total)} FCFA</div>
                  </div>
                </div>
              </div>
            ))}
            <div className="col-md-3">
              <div className="card shadow-sm h-100 bg-primary text-white">
                <div className="card-body">
                  <div className="small">Total General</div>
                  <div className="fs-4 fw-bold">{formatMontant(totalGeneral)} FCFA</div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-4">
            {parType.map(({ type, lignes, total }) => (
              <div className="col-lg-4" key={type.value}>
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h5 className="card-title">Detail par {type.label}</h5>
                    <table className="table table-sm">
                      <tbody>
                        {lignes.map((row) => (
                          <tr key={row.nom}>
                            <td>{row.nom}</td>
                            <td className="text-end">{formatMontant(row.montant)} FCFA</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td className="fw-bold">TOTAL {type.pluriel.toUpperCase()}</td>
                          <td className="text-end fw-bold">{formatMontant(total)} FCFA</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            ))}
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

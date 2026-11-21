import { useCallback, useEffect, useState } from 'react';
import { verrouFacturesAPI } from '../api/endpoints';

// Verrou des factures mensuelles : libre du 1er au 5 du mois, ensuite il faut
// le code a 4 chiffres (verifie par le serveur). `children` recoit une fonction
// a appeler si le serveur refuse l'acces (423) pendant l'utilisation.
export default function VerrouFactures({ children }) {
  const [etat, setEtat] = useState(null);
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(() => {
    verrouFacturesAPI
      .getAcces()
      .then(({ data }) => setEtat(data))
      .catch(() => setEtat({ autorise: false, erreurChargement: true }));
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  // Reverrouille l'ecran a la fin des 30 minutes.
  useEffect(() => {
    if (!etat?.autorise || etat.periodeLibre || !etat.secondesRestantes) return undefined;
    const t = setTimeout(charger, etat.secondesRestantes * 1000 + 500);
    return () => clearTimeout(t);
  }, [etat, charger]);

  const valider = async (e) => {
    e.preventDefault();
    setErreur('');
    setEnvoi(true);
    try {
      const { data } = await verrouFacturesAPI.deverrouiller(code);
      setCode('');
      setEtat((prev) => ({ ...prev, autorise: true, secondesRestantes: data.secondesRestantes }));
    } catch (err) {
      setCode('');
      setErreur(err.response?.data?.detail || 'Verification impossible.');
    } finally {
      setEnvoi(false);
    }
  };

  const verrouiller = async () => {
    await verrouFacturesAPI.verrouiller().catch(() => {});
    charger();
  };

  if (!etat) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary"></div>
      </div>
    );
  }

  if (etat.autorise) {
    return (
      <>
        {!etat.periodeLibre && (
          <div className="alert alert-warning d-flex justify-content-between align-items-center flex-wrap gap-2 py-2 no-print">
            <span>
              <i className="bi bi-unlock me-2"></i>
              Acces aux factures mensuelles ouvert par code (apres le {etat.jourLimite} du mois)
              {etat.secondesRestantes ? `, encore ${Math.ceil(etat.secondesRestantes / 60)} min` : ''}.
            </span>
            <button className="btn btn-sm btn-outline-dark" onClick={verrouiller}>
              <i className="bi bi-lock me-1"></i>Reverrouiller
            </button>
          </div>
        )}
        {children(charger)}
      </>
    );
  }

  return (
    <div>
      <h2 className="mb-4">Factures Mensuelles</h2>
      <div className="card shadow-sm" style={{ maxWidth: 420 }}>
        <div className="card-body">
          <div className="text-center mb-3">
            <i className="bi bi-lock-fill text-warning" style={{ fontSize: '2.5rem' }}></i>
            <h5 className="mt-2 mb-1">Factures verrouillees</h5>
            <p className="small text-muted mb-0">
              Apres le {etat.jourLimite || 5} du mois, l'acces aux factures mensuelles demande le code a 4 chiffres.
            </p>
          </div>
          {etat.erreurChargement ? (
            <div className="alert alert-danger py-2 mb-0">Impossible de verifier l'acces. Reessayez.</div>
          ) : etat.codeConfigure === false ? (
            <div className="alert alert-info py-2 mb-0">
              Le code n'a pas encore ete defini sur le serveur. Demandez a l'administrateur de le configurer.
            </div>
          ) : (
            <form onSubmit={valider}>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                className="form-control form-control-lg text-center mb-3"
                style={{ letterSpacing: '0.6em' }}
                placeholder="••••"
                maxLength={4}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                autoFocus
              />
              {erreur && <div className="alert alert-danger py-2">{erreur}</div>}
              <button type="submit" className="btn btn-primary w-100" disabled={code.length !== 4 || envoi}>
                {envoi && <span className="spinner-border spinner-border-sm me-2"></span>}
                Deverrouiller
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

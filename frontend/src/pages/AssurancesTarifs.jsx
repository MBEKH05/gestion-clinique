import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { CATEGORY_ORDER, getCategoryName } from '../utils/categoryUtils';

export default function AssurancesTarifs() {
  const { id } = useParams();
  const { assurances, analyses, tarifs, categories, addTarif, updateTarif, deleteTarif } = useData();
  const assurance = assurances.find((a) => a.id === id);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('toutes');
  const [filterCategorie, setFilterCategorie] = useState('');
  const [newCategorie, setNewCategorie] = useState('');
  const [newAnalyseId, setNewAnalyseId] = useState('');
  const [newPrix, setNewPrix] = useState('');
  const [importing, setImporting] = useState(false);

  const categorieNames = categories.length ? categories.map(getCategoryName) : CATEGORY_ORDER;

  const tarifsParAnalyse = useMemo(() => {
    const map = new Map();
    tarifs.filter((t) => t.typePriseEnCharge === 'ASSURANCE').forEach((t) => map.set(t.analyseId, t));
    return map;
  }, [tarifs]);

  const rows = useMemo(() => {
    return analyses
      .filter((a) => a.nom.toLowerCase().includes(search.toLowerCase()))
      .filter((a) => !filterCategorie || a.categorie === filterCategorie)
      .filter((a) => {
        const tarif = tarifsParAnalyse.get(a.id);
        if (filterType === 'avecPrix') return tarif && Number(tarif.prix) > 0;
        if (filterType === 'sansPrix') return !tarif || Number(tarif.prix) <= 0;
        return true;
      })
      .map((a) => ({ analyse: a, tarif: tarifsParAnalyse.get(a.id) }));
  }, [analyses, search, filterCategorie, filterType, tarifsParAnalyse]);

  const countAvecPrix = analyses.filter((a) => {
    const t = tarifsParAnalyse.get(a.id);
    return t && Number(t.prix) > 0;
  }).length;

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newAnalyseId || newPrix === '') return;
    await addTarif({ analyseId: newAnalyseId, typePriseEnCharge: 'ASSURANCE', prix: Number(newPrix) });
    setNewAnalyseId('');
    setNewPrix('');
  };

  const handleEditPrix = async (analyseId, tarif) => {
    const value = window.prompt('Nouveau prix (FCFA) :', tarif ? tarif.prix : '0');
    if (value === null) return;
    const prix = Number(value);
    if (Number.isNaN(prix)) return;

    if (tarif) {
      await updateTarif(tarif.id, { ...tarif, prix });
    } else {
      await addTarif({ analyseId, typePriseEnCharge: 'ASSURANCE', prix });
    }
  };

  const handleDeleteTarif = async (tarif) => {
    if (!window.confirm('Supprimer ce tarif ?')) return;
    await deleteTarif(tarif.id);
  };

  const handleImport = async () => {
    if (!window.confirm('Importer les analyses standard (prix a 0) pour cette assurance ?')) return;
    setImporting(true);
    try {
      const missing = analyses.filter((a) => !tarifsParAnalyse.get(a.id));
      for (const a of missing) {
        await addTarif({ analyseId: a.id, typePriseEnCharge: 'ASSURANCE', prix: 0 });
      }
    } finally {
      setImporting(false);
    }
  };

  if (!assurance) {
    return <div className="alert alert-warning">Assurance introuvable.</div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Tarifs Assurance &mdash; {assurance.nom}</h2>
        <Link to="/assurances" className="btn btn-outline-secondary">
          Retour
        </Link>
      </div>

      <div className="alert alert-info">
        Les tarifs Assurance sont generiques : ils s'appliquent a toutes les assurances.
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title">Ajouter un tarif</h5>
          <form className="row g-2 align-items-end" onSubmit={handleAdd}>
            <div className="col-md-3">
              <label className="form-label small">Categorie</label>
              <select className="form-select" value={newCategorie} onChange={(e) => setNewCategorie(e.target.value)}>
                <option value="">Toutes</option>
                {categorieNames.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-5">
              <label className="form-label small">Analyse</label>
              <select
                className="form-select"
                value={newAnalyseId}
                onChange={(e) => setNewAnalyseId(e.target.value)}
                required
              >
                <option value="">-- Selectionner --</option>
                {analyses
                  .filter((a) => !newCategorie || a.categorie === newCategorie)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nom}
                    </option>
                  ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small">Prix</label>
              <input
                type="number"
                min="0"
                className="form-control"
                value={newPrix}
                onChange={(e) => setNewPrix(e.target.value)}
                required
              />
            </div>
            <div className="col-md-2">
              <button type="submit" className="btn btn-primary w-100">
                Ajouter
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div className="d-flex gap-2 flex-wrap">
          <input
            type="text"
            className="form-control"
            placeholder="Rechercher une analyse..."
            style={{ width: 220 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="form-select" style={{ width: 160 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="toutes">Toutes</option>
            <option value="avecPrix">Avec prix</option>
            <option value="sansPrix">Sans prix</option>
          </select>
          <select
            className="form-select"
            style={{ width: 180 }}
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
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-primary">
            {countAvecPrix} / {analyses.length} analyses avec prix
          </span>
          <button className="btn btn-outline-success btn-sm" onClick={handleImport} disabled={importing}>
            Importer les analyses standard
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover bg-white shadow-sm">
          <thead>
            <tr>
              <th>Analyse</th>
              <th>Prix</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ analyse, tarif }) => (
              <tr key={analyse.id}>
                <td>
                  <span className="badge bg-secondary me-2 text-capitalize">{analyse.categorie}</span>
                  {analyse.nom}
                </td>
                <td>
                  {tarif && Number(tarif.prix) > 0 ? (
                    <span className="badge bg-success">{Number(tarif.prix).toLocaleString('fr-FR')} FCFA</span>
                  ) : (
                    <span className="badge bg-light text-dark">Pas de prix</span>
                  )}
                </td>
                <td>
                  {tarif ? (
                    <>
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={() => handleEditPrix(analyse.id, tarif)}
                      >
                        Modifier
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteTarif(tarif)}>
                        Supprimer
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-sm btn-outline-success"
                      onClick={() => handleEditPrix(analyse.id, null)}
                    >
                      Ajouter prix
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

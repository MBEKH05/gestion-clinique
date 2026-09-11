import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { generatePDFCatalogue } from '../utils/pdfUtils';

export default function AnalysesList() {
  const { category } = useParams();
  const { analyses, tarifs, deleteAnalyse } = useData();
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    const tous = analyses.filter((a) => a.categorie === category);
    await generatePDFCatalogue(tous, tarifs, category);
    setExporting(false);
  };

  const filtered = useMemo(() => {
    return analyses
      .filter((a) => a.categorie === category)
      .filter((a) => a.nom.toLowerCase().includes(search.toLowerCase()));
  }, [analyses, category, search]);

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette analyse ?')) return;
    await deleteAnalyse(id);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="text-capitalize mb-0">
          {category} <span className="badge bg-secondary">{filtered.length}</span>
        </h2>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-danger"
            onClick={handleExport}
            disabled={exporting || filtered.length === 0}
            title="Exporter en PDF"
          >
            {exporting
              ? <span className="spinner-border spinner-border-sm me-1"></span>
              : <i className="bi bi-file-earmark-pdf me-1"></i>
            }
            Exporter PDF
          </button>
          <Link to={`/base-de-donnees/${category}/ajouter`} className="btn btn-primary">
            <i className="bi bi-plus-lg me-2"></i>Ajouter
          </Link>
        </div>
      </div>

      <div className="mb-3 d-flex gap-2">
        <input
          type="text"
          className="form-control"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="btn btn-outline-secondary" onClick={() => setSearch('')}>
            <i className="bi bi-x-lg"></i>
          </button>
        )}
      </div>

      <p className="text-muted">{filtered.length} analyse(s) trouvee(s)</p>

      <div className="table-responsive">
        <table className="table table-hover bg-white shadow-sm">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Date de creation</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td>{a.nom}</td>
                <td>{a.created_at ? new Date(a.created_at).toLocaleDateString('fr-FR') : '-'}</td>
                <td>
                  <Link
                    to={`/base-de-donnees/${category}/${a.id}/modifier`}
                    className="btn btn-sm btn-outline-primary me-2"
                  >
                    Modifier
                  </Link>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(a.id)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center text-muted py-4">
                  Aucune analyse trouvee.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

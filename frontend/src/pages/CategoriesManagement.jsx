import { useState } from 'react';
import { useData } from '../context/DataContext';
import { categoriesAPI } from '../api/endpoints';
import { getCategoryName, isCategoryActive } from '../utils/categoryUtils';

export default function CategoriesManagement() {
  const { categories, reloadCategories, activateCategorie, deactivateCategorie } = useData();
  const [nom, setNom] = useState('');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState(null);
  const [editingNom, setEditingNom] = useState(null);
  const [editValue, setEditValue] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    setMessage(null);
    const clean = nom.trim().toLowerCase().replace(/\s+/g, '');
    if (!clean) return;
    setCreating(true);
    try {
      await categoriesAPI.create(clean);
      await reloadCategories();
      setNom('');
      setMessage({ type: 'success', text: 'Categorie creee avec succes.' });
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.detail || 'Erreur lors de la creation.' });
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (c) => {
    setEditingNom(getCategoryName(c));
    setEditValue(getCategoryName(c));
  };

  const cancelEdit = () => {
    setEditingNom(null);
    setEditValue('');
  };

  const saveEdit = async (oldNom) => {
    const clean = editValue.trim().toLowerCase().replace(/\s+/g, '');
    if (!clean) return;
    try {
      await categoriesAPI.update(oldNom, clean);
      await reloadCategories();
      cancelEdit();
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.detail || 'Erreur lors du renommage.' });
    }
  };

  const handleDelete = async (c) => {
    const nomC = getCategoryName(c);
    if (!window.confirm(`Supprimer la categorie "${nomC}" ? Cette action est irreversible.`)) return;
    try {
      await categoriesAPI.remove(nomC);
      await reloadCategories();
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.detail || 'Suppression impossible.' });
    }
  };

  const handleToggle = async (c) => {
    const nomC = getCategoryName(c);
    if (isCategoryActive(c)) {
      await deactivateCategorie(nomC);
    } else {
      await activateCategorie(nomC);
    }
  };

  return (
    <div>
      <h2 className="mb-4">Gestion des categories</h2>

      {message && (
        <div className={`alert alert-${message.type}`} role="alert">
          {message.text}
        </div>
      )}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title">Creer une categorie</h5>
          <form onSubmit={handleCreate} className="d-flex gap-2">
            <input
              type="text"
              className="form-control"
              placeholder="Nom de la categorie (minuscules, sans espaces)"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary text-nowrap" disabled={creating}>
              {creating && <span className="spinner-border spinner-border-sm me-2"></span>}
              Creer la categorie
            </button>
          </form>
        </div>
      </div>

      <div className="row g-3">
        {categories.map((c) => {
          const nomC = getCategoryName(c);
          const actif = isCategoryActive(c);
          return (
            <div className="col-md-4" key={nomC}>
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  {editingNom === nomC ? (
                    <div className="d-flex gap-2 mb-2">
                      <input
                        className="form-control form-control-sm"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                      />
                    </div>
                  ) : (
                    <h5 className="card-title text-capitalize">{nomC}</h5>
                  )}

                  <span className={`badge ${actif ? 'bg-success' : 'bg-danger'} mb-2`}>
                    {actif ? 'Actif' : 'Inactif'}
                  </span>

                  <div className="d-flex gap-2 flex-wrap mt-2">
                    {editingNom === nomC ? (
                      <>
                        <button className="btn btn-sm btn-success" onClick={() => saveEdit(nomC)}>
                          Enregistrer
                        </button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={cancelEdit}>
                          Annuler
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => startEdit(c)}>
                          Modifier
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c)}>
                          Supprimer
                        </button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => handleToggle(c)}>
                          {actif ? 'Desactiver' : 'Activer'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

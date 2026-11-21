import { useEffect, useState } from 'react';
import { rendezVousAPI } from '../../api/endpoints';

// Grille des creneaux d'une specialite pour une date : seuls les creneaux
// libres sont cliquables. `exclure` = rendez-vous en cours de deplacement.
export default function CreneauxPicker({ specialiteId, date, value, onChange, exclure = null }) {
  const [planning, setPlanning] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (!specialiteId || !date) {
      setPlanning(null);
      return undefined;
    }
    let annule = false;
    setLoading(true);
    setErreur('');
    rendezVousAPI
      .getCreneaux({ specialite_id: specialiteId, date, exclure: exclure || undefined })
      .then(({ data }) => {
        if (!annule) setPlanning(data);
      })
      .catch(() => {
        if (!annule) setErreur('Impossible de charger les creneaux.');
      })
      .finally(() => {
        if (!annule) setLoading(false);
      });
    return () => {
      annule = true;
    };
  }, [specialiteId, date, exclure]);

  if (!specialiteId || !date) {
    return <div className="text-muted small">Choisissez une specialite et une date.</div>;
  }
  if (loading) {
    return (
      <div className="py-2">
        <span className="spinner-border spinner-border-sm text-primary me-2"></span>Chargement des creneaux...
      </div>
    );
  }
  if (erreur) return <div className="alert alert-danger py-2 mb-0">{erreur}</div>;
  if (!planning) return null;
  if (!planning.ouvert) {
    return <div className="alert alert-warning py-2 mb-0">Pas de consultation de {planning.specialite.nom} ce jour-la.</div>;
  }

  const libres = planning.creneaux.filter((c) => c.libre).length;
  const capacite = planning.specialite.patientsParCreneau;

  return (
    <div>
      <div className="small text-muted mb-2">
        {libres} creneau(x) libre(s) - {planning.specialite.heureDebut} a {planning.specialite.heureFin}, {planning.specialite.dureeCreneau} min
        {capacite > 1 ? `, ${capacite} patients par creneau` : ''}
      </div>
      <div className="d-flex flex-wrap gap-2">
        {planning.creneaux.map((c) => {
          const actif = value === c.heure;
          const titre = c.passe ? 'Creneau passe' : c.libre ? 'Libre' : 'Complet';
          return (
            <button
              key={c.heure}
              type="button"
              title={titre}
              disabled={!c.libre}
              onClick={() => onChange(c.heure)}
              className={`btn btn-sm ${actif ? 'btn-primary' : c.libre ? 'btn-outline-primary' : 'btn-outline-secondary'}`}
              style={{ minWidth: 72, textDecoration: !c.libre && !c.passe ? 'line-through' : 'none' }}
            >
              {c.heure}
              {capacite > 1 && <span className="d-block small">{c.pris}/{c.capacite}</span>}
            </button>
          );
        })}
      </div>
      {libres === 0 && <div className="text-danger small mt-2">Aucun creneau libre ce jour-la.</div>}
    </div>
  );
}

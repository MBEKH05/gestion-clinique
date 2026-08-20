import { useMemo, useState } from 'react';
import { devisAPI } from '../api/endpoints';
import { convertDevisFromAPI } from '../utils/apiConverters';
import { formatMontant } from '../utils/devisUtils';

export default function DetailPrestation() {
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [rechercheEffectuee, setRechercheEffectuee] = useState(false);
  const [moisSelectionne, setMoisSelectionne] = useState('');
  const [devisPeriode, setDevisPeriode] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await devisAPI.getAll({
        date_debut: dateDebut || undefined,
        date_fin: dateFin || undefined,
        with_lignes: 1,
        page_size: 5000,
        ordering: 'date_creation',
      });
      setDevisPeriode(data.results.map(convertDevisFromAPI));
      setRechercheEffectuee(true);
    } finally {
      setLoading(false);
    }
  };

  const prestations = useMemo(() => {
    if (!rechercheEffectuee) return [];

    const list = [];

    devisPeriode.forEach((d) => {
      if (!d.dateCreation) return;
      const date = new Date(d.dateCreation);

      d.lignes.forEach((l) => {
        if (!l.prix || l.prix <= 0) return;
        list.push({
          service: l.nom,
          categorie: l.categorie,
          prix: l.prix,
          quantite: l.quantite,
          date: date.toISOString().slice(0, 10),
          patientNom: d.patientNom || '-',
          matricule: d.patientMatricule || '-',
        });
      });
    });

    return list;
  }, [devisPeriode, rechercheEffectuee]);

  const parService = useMemo(() => {
    const map = new Map();
    prestations.forEach((p) => {
      if (!map.has(p.service)) map.set(p.service, { categorie: p.categorie, prixUnitaire: p.prix, dates: new Map() });
      const entry = map.get(p.service);
      if (!entry.dates.has(p.date)) entry.dates.set(p.date, { patients: new Set(), count: 0, total: 0 });
      const dateEntry = entry.dates.get(p.date);
      dateEntry.patients.add(p.matricule);
      dateEntry.count += 1;
      dateEntry.total += p.prix * p.quantite;
    });
    return map;
  }, [prestations]);

  const moisDisponibles = useMemo(() => {
    const set = new Set(prestations.map((p) => p.date.slice(0, 7)));
    return [...set].sort().reverse();
  }, [prestations]);

  const parJourPatient = useMemo(() => {
    const filtered = moisSelectionne
      ? prestations.filter((p) => p.date.startsWith(moisSelectionne))
      : prestations;

    const map = new Map();
    filtered.forEach((p) => {
      if (!map.has(p.date)) map.set(p.date, new Map());
      const dayMap = map.get(p.date);
      const key = `${p.matricule}-${p.patientNom}`;
      if (!dayMap.has(key)) {
        dayMap.set(key, { patientNom: p.patientNom, matricule: p.matricule, services: [], total: 0 });
      }
      const entry = dayMap.get(key);
      entry.services.push(p);
      entry.total += p.prix * p.quantite;
    });
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [prestations, moisSelectionne]);

  const totalPatients = new Set(prestations.map((p) => p.matricule)).size;
  const totalPrestations = prestations.length;
  const prixTotal = prestations.reduce((sum, p) => sum + p.prix * p.quantite, 0);

  return (
    <div>
      <h2 className="mb-4">Detail de prestation</h2>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <form className="row g-2 align-items-end" onSubmit={handleSearch}>
            <div className="col-md-4">
              <label className="form-label small">Date de debut</label>
              <input type="date" className="form-control" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label small">Date de fin</label>
              <input type="date" className="form-control" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            </div>
            <div className="col-md-4">
              <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                {loading && <span className="spinner-border spinner-border-sm me-2"></span>}
                Rechercher
              </button>
            </div>
          </form>
        </div>
      </div>

      {rechercheEffectuee && !loading && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="text-muted small">Patients avec prestations</div>
                  <div className="fs-4 fw-bold">{totalPatients}</div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="text-muted small">Total Prestations</div>
                  <div className="fs-4 fw-bold">{totalPrestations}</div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="text-muted small">Prix Total</div>
                  <div className="fs-4 fw-bold">{formatMontant(prixTotal)} FCFA</div>
                </div>
              </div>
            </div>
          </div>

          <h5 className="mb-3">Detail par service et par jour</h5>
          {[...parService.entries()].map(([service, info]) => {
            const total = [...info.dates.values()].reduce((sum, d) => sum + d.total, 0);
            return (
              <div className="card shadow-sm mb-3" key={service}>
                <div className="card-header bg-primary text-white d-flex justify-content-between">
                  <span>
                    {service} <span className="badge bg-light text-dark text-capitalize ms-2">{info.categorie}</span>
                  </span>
                  <span className="badge bg-light text-dark">Prix unitaire : {formatMontant(info.prixUnitaire)} FCFA</span>
                </div>
                <div className="card-body p-0">
                  <table className="table mb-0">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Nb patients</th>
                        <th>Nb prestations</th>
                        <th>Prix total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...info.dates.entries()].map(([date, d]) => (
                        <tr key={date}>
                          <td>{new Date(date).toLocaleDateString('fr-FR')}</td>
                          <td>
                            <span className="badge bg-primary">{d.patients.size}</span>
                          </td>
                          <td>
                            <span className="badge bg-success">{d.count}</span>
                          </td>
                          <td>{formatMontant(d.total)} FCFA</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="text-end fw-bold">
                          TOTAL
                        </td>
                        <td className="fw-bold">{formatMontant(total)} FCFA</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}

          <div className="row g-3 my-4">
            <div className="col-md-4">
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="text-muted small">Patients avec prestations</div>
                  <div className="fs-4 fw-bold">{totalPatients}</div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="text-muted small">Total Prestations</div>
                  <div className="fs-4 fw-bold">{totalPrestations}</div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="text-muted small">Prix Total</div>
                  <div className="fs-4 fw-bold">{formatMontant(prixTotal)} FCFA</div>
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Details consultations par patient et par jour</h5>
            <select className="form-select" style={{ width: 200 }} value={moisSelectionne} onChange={(e) => setMoisSelectionne(e.target.value)}>
              <option value="">Tous les mois</option>
              {moisDisponibles.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {parJourPatient.map(([date, dayMap]) => (
            <div className="card shadow-sm mb-3" key={date}>
              <div className="card-header d-flex justify-content-between">
                <span>{new Date(date).toLocaleDateString('fr-FR')}</span>
                <span className="badge bg-primary">{dayMap.size} patient(s)</span>
              </div>
              <div className="card-body p-0">
                <table className="table mb-0">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Matricule</th>
                      <th>Services</th>
                      <th>Prix total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...dayMap.values()].map((entry, idx) => (
                      <tr key={idx}>
                        <td className="text-primary">{entry.patientNom}</td>
                        <td>
                          <span className="badge bg-secondary">{entry.matricule}</span>
                        </td>
                        <td>
                          {entry.services.map((s, i) => (
                            <div key={i} className="mb-1">
                              <span className="badge bg-warning text-dark text-capitalize me-1">{s.categorie}</span>
                              <span className="badge bg-info text-dark me-1">Service</span>
                              {s.service} ({formatMontant(s.prix)} x {s.quantite})
                            </div>
                          ))}
                        </td>
                        <td className="fw-bold">{formatMontant(entry.total)} FCFA</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

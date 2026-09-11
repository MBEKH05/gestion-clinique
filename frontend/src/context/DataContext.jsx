import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  analysesAPI,
  ipmsAPI,
  assurancesAPI,
  tarifsAPI,
  patientsAPI,
  devisAPI,
  categoriesAPI,
} from '../api/endpoints';
import {
  convertPatientFromAPI,
  convertPatientToAPI,
  convertDevisFromAPI,
  convertDevisToAPI,
  convertTarifFromAPI,
  convertTarifToAPI,
} from '../utils/apiConverters';

// Les patients ne sont jamais charges integralement en memoire (potentiellement
// des dizaines de milliers de lignes) : chaque page qui en a besoin (Patients,
// Devis) interroge l'API directement (recherche paginee ou lookup par id).

const DataContext = createContext(null);

const CACHE_KEY = 'facturation_clinique_cache_v2';
const CACHE_TTL_SECONDS = 3600;

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.timestamp || Date.now() / 1000 - parsed.timestamp > CACHE_TTL_SECONDS) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...data, timestamp: Date.now() / 1000 })
    );
  } catch {
    // storage full or unavailable: ignore
  }
}

export function DataProvider({ children }) {
  const [analyses, setAnalyses] = useState([]);
  const [ipms, setIpms] = useState([]);
  const [assurances, setAssurances] = useState([]);
  const [tarifs, setTarifs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);

    const cached = readCache();

    if (cached) {
      setAnalyses(cached.analyses || []);
      setIpms(cached.ipms || []);
      setAssurances(cached.assurances || []);
      setTarifs((cached.tarifs || []).map(convertTarifFromAPI));
      setCategories(cached.categories || []);
      setLoading(false);
      return;
    }

    try {
      const [analysesRes, ipmsRes, assurancesRes, tarifsRes, categoriesRes] =
        await Promise.all([
          analysesAPI.getAll(),
          ipmsAPI.getAll(),
          assurancesAPI.getAll(),
          tarifsAPI.getAll(),
          categoriesAPI.getAll(),
        ]);

      const analysesData = analysesRes.data.results;
      const ipmsData = ipmsRes.data.results;
      const assurancesData = assurancesRes.data.results;
      const tarifsData = tarifsRes.data.results;
      const categoriesData = categoriesRes.data;

      setAnalyses(analysesData);
      setIpms(ipmsData);
      setAssurances(assurancesData);
      setTarifs(tarifsData.map(convertTarifFromAPI));
      setCategories(categoriesData);

      writeCache({
        analyses: analysesData,
        ipms: ipmsData,
        assurances: assurancesData,
        tarifs: tarifsData,
        categories: categoriesData,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const initialLoadTriggered = useRef(false);

  useEffect(() => {
    // Garde contre le double-appel de React StrictMode en dev (evite de
    // doubler la charge reseau au demarrage, chaque requete comptant deja
    // pour beaucoup sur le serveur de dev PHP mono-requete).
    if (initialLoadTriggered.current) return;
    initialLoadTriggered.current = true;
    loadAll();
  }, [loadAll]);

  const invalidateCache = () => localStorage.removeItem(CACHE_KEY);

  // --- Analyses ---
  const addAnalyse = async (payload) => {
    const { data } = await analysesAPI.create(payload);
    setAnalyses((prev) => [...prev, data]);
    invalidateCache();
    return data;
  };
  const updateAnalyse = async (id, payload) => {
    const { data } = await analysesAPI.update(id, payload);
    setAnalyses((prev) => prev.map((a) => (a.id === id ? data : a)));
    invalidateCache();
    return data;
  };
  const deleteAnalyse = async (id) => {
    await analysesAPI.remove(id);
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
    invalidateCache();
  };

  // --- IPM ---
  const addIPM = async (payload) => {
    const { data } = await ipmsAPI.create(payload);
    setIpms((prev) => [...prev, data]);
    invalidateCache();
    return data;
  };
  const updateIPM = async (id, payload) => {
    const { data } = await ipmsAPI.update(id, payload);
    setIpms((prev) => prev.map((i) => (i.id === id ? data : i)));
    invalidateCache();
    return data;
  };
  const deleteIPM = async (id) => {
    await ipmsAPI.remove(id);
    setIpms((prev) => prev.filter((i) => i.id !== id));
    invalidateCache();
  };
  const activateIPM = async (id) => {
    const { data } = await ipmsAPI.activate(id);
    setIpms((prev) => prev.map((i) => (i.id === id ? data : i)));
    invalidateCache();
  };
  const deactivateIPM = async (id) => {
    const { data } = await ipmsAPI.deactivate(id);
    setIpms((prev) => prev.map((i) => (i.id === id ? data : i)));
    invalidateCache();
  };

  // --- Assurances ---
  const addAssurance = async (payload) => {
    const { data } = await assurancesAPI.create(payload);
    setAssurances((prev) => [...prev, data]);
    invalidateCache();
    return data;
  };
  const updateAssurance = async (id, payload) => {
    const { data } = await assurancesAPI.update(id, payload);
    setAssurances((prev) => prev.map((a) => (a.id === id ? data : a)));
    invalidateCache();
    return data;
  };
  const deleteAssurance = async (id) => {
    await assurancesAPI.remove(id);
    setAssurances((prev) => prev.filter((a) => a.id !== id));
    invalidateCache();
  };
  const activateAssurance = async (id) => {
    const { data } = await assurancesAPI.activate(id);
    setAssurances((prev) => prev.map((a) => (a.id === id ? data : a)));
    invalidateCache();
  };
  const deactivateAssurance = async (id) => {
    const { data } = await assurancesAPI.deactivate(id);
    setAssurances((prev) => prev.map((a) => (a.id === id ? data : a)));
    invalidateCache();
  };

  // --- Tarifs ---
  const reloadTarifs = async () => {
    const { data } = await tarifsAPI.getFresh();
    const converted = (data.results || data).map(convertTarifFromAPI);
    setTarifs(converted);
    invalidateCache();
    return converted;
  };

  const addTarif = async (tarif) => {
    const { data } = await tarifsAPI.create(convertTarifToAPI(tarif));
    const converted = convertTarifFromAPI(data);
    setTarifs((prev) => [...prev, converted]);
    invalidateCache();
    return converted;
  };
  const updateTarif = async (id, tarif) => {
    const { data } = await tarifsAPI.update(id, convertTarifToAPI(tarif));
    const converted = convertTarifFromAPI(data);
    setTarifs((prev) => prev.map((t) => (t.id === id ? converted : t)));
    invalidateCache();
    return converted;
  };
  const deleteTarif = async (id) => {
    await tarifsAPI.remove(id);
    setTarifs((prev) => prev.filter((t) => t.id !== id));
    invalidateCache();
  };

  // --- Patients ---
  const addPatient = async (patient) => {
    const { data } = await patientsAPI.create(convertPatientToAPI(patient));
    return convertPatientFromAPI(data);
  };
  const updatePatient = async (id, patient) => {
    const { data } = await patientsAPI.update(id, convertPatientToAPI(patient));
    return convertPatientFromAPI(data);
  };
  const deletePatient = async (id) => {
    await patientsAPI.remove(id);
  };

  // --- Devis ---
  // Note : contrairement aux autres entites, les devis ne sont jamais charges
  // integralement en memoire (potentiellement des dizaines de milliers de lignes).
  // Chaque page (Historique, Devis Proforma, Factures Mensuelles) interroge
  // l'API directement avec pagination/filtres serveur.
  const addDevis = async (devisData) => {
    const { data } = await devisAPI.create(convertDevisToAPI(devisData));
    return convertDevisFromAPI(data);
  };
  const updateDevis = async (id, devisData) => {
    const { data } = await devisAPI.update(id, convertDevisToAPI(devisData));
    return convertDevisFromAPI(data);
  };
  const deleteDevis = async (id) => {
    await devisAPI.remove(id);
  };
  const updateDevisPaiement = async (id, paiement) => {
    const { data } = await devisAPI.updatePaiement(id, paiement);
    return convertDevisFromAPI(data);
  };

  // --- Categories ---
  const reloadCategories = async () => {
    const { data } = await categoriesAPI.getAll();
    setCategories(data);
    invalidateCache();
    return data;
  };
  const activateCategorie = async (nom) => {
    await categoriesAPI.activate(nom);
    await reloadCategories();
  };
  const deactivateCategorie = async (nom) => {
    await categoriesAPI.deactivate(nom);
    await reloadCategories();
  };

  // --- Utilitaires ---
  const getPrixAnalyse = useCallback(
    (analyseId, ipmId, assuranceId) => {
      // Specific tariff first (exact IPM or assurance match)
      const specifique = tarifs.find(
        (t) =>
          t.analyseId === analyseId &&
          ((ipmId && t.ipmId === ipmId) || (assuranceId && t.assuranceId === assuranceId))
      );
      if (specifique) return Number(specifique.prix);

      // Fall back to generic type tariff
      const type = ipmId ? 'IPM' : assuranceId ? 'ASSURANCE' : null;
      if (type) {
        const generique = tarifs.find(
          (t) => t.analyseId === analyseId && t.typePriseEnCharge === type && !t.ipmId && !t.assuranceId
        );
        if (generique) return Number(generique.prix);
      }

      return 0;
    },
    [tarifs]
  );

  const value = {
    analyses,
    ipms,
    assurances,
    tarifs,
    categories,
    loading,
    reload: loadAll,
    addAnalyse,
    updateAnalyse,
    deleteAnalyse,
    addIPM,
    updateIPM,
    deleteIPM,
    activateIPM,
    deactivateIPM,
    addAssurance,
    updateAssurance,
    deleteAssurance,
    activateAssurance,
    deactivateAssurance,
    reloadTarifs,
    addTarif,
    updateTarif,
    deleteTarif,
    addPatient,
    updatePatient,
    deletePatient,
    addDevis,
    updateDevis,
    deleteDevis,
    updateDevisPaiement,
    reloadCategories,
    activateCategorie,
    deactivateCategorie,
    getPrixAnalyse,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

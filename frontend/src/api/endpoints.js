import api from './client';

export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  logout: (refresh) => api.post('/auth/logout', { refresh }),
  check: () => api.get('/auth/check'),
};

export const analysesAPI = {
  getAll: () => api.get('/analyses', { params: { page_size: 1000 } }),
  get: (id) => api.get(`/analyses/${id}`),
  create: (data) => api.post('/analyses', data),
  update: (id, data) => api.put(`/analyses/${id}`, data),
  remove: (id) => api.delete(`/analyses/${id}`),
};

export const ipmsAPI = {
  getAll: () => api.get('/ipms', { params: { page_size: 1000 } }),
  get: (id) => api.get(`/ipms/${id}`),
  create: (data) => api.post('/ipms', data),
  update: (id, data) => api.put(`/ipms/${id}`, data),
  remove: (id) => api.delete(`/ipms/${id}`),
  activate: (id) => api.post(`/ipms/${id}/activate`),
  deactivate: (id) => api.post(`/ipms/${id}/deactivate`),
};

export const assurancesAPI = {
  getAll: () => api.get('/assurances', { params: { page_size: 1000 } }),
  get: (id) => api.get(`/assurances/${id}`),
  create: (data) => api.post('/assurances', data),
  update: (id, data) => api.put(`/assurances/${id}`, data),
  remove: (id) => api.delete(`/assurances/${id}`),
  activate: (id) => api.post(`/assurances/${id}/activate`),
  deactivate: (id) => api.post(`/assurances/${id}/deactivate`),
};

export const tarifsAPI = {
  getAll: () => api.get('/tarifs', { params: { page_size: 1000 } }),
  getFresh: () => api.get('/tarifs', { params: { page_size: 1000, _t: Date.now() } }),
  create: (data) => api.post('/tarifs', data),
  update: (id, data) => api.put(`/tarifs/${id}`, data),
  remove: (id) => api.delete(`/tarifs/${id}`),
};

export const patientsAPI = {
  getAll: () => api.get('/patients', { params: { page_size: 1000000 } }),
  get: (id) => api.get(`/patients/${id}`),
  create: (data) => api.post('/patients', data),
  update: (id, data) => api.put(`/patients/${id}`, data),
  remove: (id) => api.delete(`/patients/${id}`),
  search: (q, page = 1, pageSize = 20) =>
    api.get('/patients/search', { params: { q, page, page_size: pageSize } }),
};

export const devisAPI = {
  getAll: (params = {}) => api.get('/devis', { params: { is_proforma: false, ...params } }),
  getProforma: (params = {}) => api.get('/devis/proforma', { params }),
  get: (id) => api.get(`/devis/${id}`),
  create: (data) => api.post('/devis', data),
  update: (id, data) => api.put(`/devis/${id}`, data),
  remove: (id) => api.delete(`/devis/${id}`),
  updatePaiement: (id, data) => api.patch(`/devis/${id}/update_paiement`, data),
};

export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  create: (nom) => api.post('/categories', { nom }),
  update: (nom, nouveauNom) => api.put(`/categories/${nom}`, { nom: nouveauNom }),
  remove: (nom) => api.delete(`/categories/${nom}`),
  activate: (nom) => api.post(`/categories/${nom}/activate`),
  deactivate: (nom) => api.post(`/categories/${nom}/deactivate`),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard-stats'),
};

export const statistiquesAPI = {
  getPaiement: (params) => api.get('/statistiques/paiement', { params }),
};

export const facturesMensuellesAPI = {
  genererNumero: (mois, annee, typePriseEnCharge, entiteId) =>
    api.get('/factures-mensuelles/numero', {
      params: { mois, annee, typePriseEnCharge, entiteId },
    }),
};

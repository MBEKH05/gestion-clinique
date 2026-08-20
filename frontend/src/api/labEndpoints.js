import labApi from './labClient';

export const labAuthAPI = {
  login: (username, password) => labApi.post('/auth/login', { username, password }),
  logout: (refresh) => labApi.post('/auth/logout', { refresh }),
  check: () => labApi.get('/auth/check'),
};

export const labUsersAPI = {
  getAll: () => labApi.get('/users'),
  create: (data) => labApi.post('/users', data),
  update: (id, data) => labApi.put(`/users/${id}`, data),
  activate: (id) => labApi.post(`/users/${id}/activate`),
  deactivate: (id) => labApi.post(`/users/${id}/deactivate`),
  remove: (id) => labApi.delete(`/users/${id}`),
};

export const labDocumentsAnnexesAPI = {
  getAll: () => labApi.get('/documents-annexes'),
  create: (formData) => labApi.post('/documents-annexes', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => labApi.post(`/documents-annexes/${id}`, data),
  remove: (id) => labApi.delete(`/documents-annexes/${id}`),
};

export const labStatsAPI = {
  get: () => labApi.get('/stats'),
};

export const labDossiersAPI = {
  getAll: (params = {}) => labApi.get('/dossiers', { params }),
  get: (id) => labApi.get(`/dossiers/${id}`),
  create: (formData) =>
    labApi.post('/dossiers', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) =>
    labApi.post(`/dossiers/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  remove: (id) => labApi.delete(`/dossiers/${id}`),
  removeDocument: (dossierId, documentId) => labApi.delete(`/dossiers/${dossierId}/documents/${documentId}`),
  approve: (id) => labApi.post(`/dossiers/${id}/approve`),
  refuse: (id, motif) => labApi.post(`/dossiers/${id}/refuse`, { motif }),
  confirm: (id) => labApi.post(`/dossiers/${id}/confirm`),
  archive: (id) => labApi.post(`/dossiers/${id}/archive`),
};

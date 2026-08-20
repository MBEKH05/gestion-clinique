import adminApi from './adminClient';

export const platformAuthAPI = {
  login: (username, password) => adminApi.post('/auth/login', { username, password }),
  logout: (refresh) => adminApi.post('/auth/logout', { refresh }),
  check: () => adminApi.get('/auth/check'),
};

export const platformDashboardAPI = {
  get: () => adminApi.get('/dashboard'),
};

export const platformUsersAPI = {
  getAll: () => adminApi.get('/users'),
  create: (data) => adminApi.post('/users', data),
  update: (id, data) => adminApi.put(`/users/${id}`, data),
  activate: (id) => adminApi.post(`/users/${id}/activate`),
  deactivate: (id) => adminApi.post(`/users/${id}/deactivate`),
};

export const platformLabUsersAPI = {
  getAll: () => adminApi.get('/lab-users'),
  create: (data) => adminApi.post('/lab-users', data),
  update: (id, data) => adminApi.put(`/lab-users/${id}`, data),
  activate: (id) => adminApi.post(`/lab-users/${id}/activate`),
  deactivate: (id) => adminApi.post(`/lab-users/${id}/deactivate`),
};

export const platformLabDossiersAPI = {
  getAll: (params = {}) => adminApi.get('/lab-dossiers', { params }),
  get: (id) => adminApi.get(`/lab-dossiers/${id}`),
};

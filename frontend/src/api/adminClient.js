import axios from 'axios';

const API_BASE_URL = import.meta.env.REACT_APP_API_BASE_URL || '/api';

const adminApi = axios.create({
  baseURL: `${API_BASE_URL}/admin`,
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue = [];

function resolveQueue(error, token) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  pendingQueue = [];
}

adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response ? error.response.status : null;

    if (
      (status === 401 || status === 403) &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/token/refresh')
    ) {
      const refreshToken = localStorage.getItem('admin_refresh_token');

      if (!refreshToken) {
        localStorage.removeItem('admin_access_token');
        localStorage.removeItem('admin_refresh_token');
        window.location.hash = '#/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return adminApi(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${API_BASE_URL}/admin/auth/token/refresh`, {
          refresh: refreshToken,
        });

        localStorage.setItem('admin_access_token', data.access);
        resolveQueue(null, data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;

        return adminApi(originalRequest);
      } catch (refreshError) {
        resolveQueue(refreshError, null);
        localStorage.removeItem('admin_access_token');
        localStorage.removeItem('admin_refresh_token');
        window.location.hash = '#/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default adminApi;

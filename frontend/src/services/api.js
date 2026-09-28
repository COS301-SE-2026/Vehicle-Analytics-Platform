import axios from 'axios';
import useAuthStore from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // Only log out on a true 401 Unauthorized — the server has explicitly
    // rejected the session. 403 (permission), 500 (server bug), 502/503/504
    // (gateway/transient) must NOT log the user out; those are handled by
    // the calling component so the user stays signed in.
    if (status === 401) {
      const state = useAuthStore.getState();
      // Guard against repeated logouts from a burst of concurrent 401s
      if (state.token) {
        state.logout();
        // Only redirect if we're not already on /login
        if (window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;

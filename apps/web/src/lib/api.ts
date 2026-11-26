import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  // The static demo build answers every call in the browser from sample data.
  // Loaded on demand, so the sample data never ships in the real app's bundle.
  ...(import.meta.env.VITE_DEMO === '1' && {
    adapter: async (config) => (await import('@/demo/server')).demoAdapter(config),
  }),
});

let _getToken: (() => Promise<string | null>) | null = null;

export function setTokenGetter(getter: () => Promise<string | null>) {
  _getToken = getter;
}

/**
 * Current auth token, for callers that cannot go through the axios instance.
 * Streaming responses need `fetch`, so the SSE client resolves the token here
 * rather than duplicating the retrieval logic.
 */
export async function getAuthToken(): Promise<string | null> {
  return _getToken ? _getToken() : null;
}

api.interceptors.request.use(async (config) => {
  if (_getToken) {
    const token = await _getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/sign-in' && currentPath !== '/sign-up') {
        window.location.href = '/sign-in';
      }
    }
    return Promise.reject(error);
  },
);

export default api;

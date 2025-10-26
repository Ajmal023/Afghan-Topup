// apps/admin/src/lib/api.ts
import axios from "axios";

const base = import.meta.env.VITE_API_BASE ?? "/backend";

export const api = axios.create({
  baseURL: base,
  withCredentials: true,
});

// No bearer token needed (cookies-based). Remove any old Authorization injection.

let isRefreshing = false;
let waiters: Array<(ok: boolean) => void> = [];

function onRefreshed(ok: boolean) {
  waiters.forEach((w) => w(ok));
  waiters = [];
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const { response, config } = error || {};
    const status = response?.status;

    // Only handle 401s for non-auth endpoints
    if (status !== 401 || !config || config.__isRetryRequest) {
      return Promise.reject(error);
    }
    const url = (config.url || "") as string;
    if (url.includes("/auth/login") || url.includes("/auth/refresh")) {
      // Can't refresh; go to login
      window.location.href = "/login";
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue until refresh completes
      return new Promise((resolve, reject) => {
        waiters.push((ok) => {
          if (!ok) return reject(error);
          resolve(api({ ...config, __isRetryRequest: true }));
        });
      });
    }

    isRefreshing = true;
    try {
      await api.post("/auth/refresh");
      isRefreshing = false;
      onRefreshed(true);
      return api({ ...config, __isRetryRequest: true });
    } catch (e) {
      isRefreshing = false;
      onRefreshed(false);
      window.location.href = "/login";
      return Promise.reject(e);
    }
  }
);

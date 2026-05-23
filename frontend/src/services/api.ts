import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

console.log("[API] Using baseURL:", API_URL);

api.interceptors.request.use((config: any) => {
  const token =
    localStorage.getItem("finix_token") ||
    sessionStorage.getItem("finix_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log("[API Request]", config.method?.toUpperCase(), config.url, {
    hasAuth: !!token,
    timestamp: new Date().toISOString(),
  });
  return config;
});

api.interceptors.response.use(
  (res) => {
    console.log("[API Response]", res.status, res.config.url, {
      dataSize: JSON.stringify(res.data).length,
      timestamp: new Date().toISOString(),
    });
    return res;
  },
  (err) => {
    console.error("[API Error]", err.response?.status, err.config?.url, {
      message: err.message,
      data: err.response?.data,
      timestamp: new Date().toISOString(),
    });
    if (err?.response?.status === 401) {
      localStorage.removeItem("finix_token");
      sessionStorage.removeItem("finix_token");
      if (
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/register") &&
        window.location.pathname !== "/"
      ) {
        window.dispatchEvent(new Event("finix-auth-unauthorized"));
      }
    }
    return Promise.reject(err);
  },
);

export function apiErrorMessage(e: any): string {
  // Try different error message formats from backend
  const data = e?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.message === "string") return data.message;
  if (Array.isArray(data?.detail))
    return data.detail.map((x: any) => x?.msg || JSON.stringify(x)).join(" ");
  if (e?.message) return e.message;
  return "Algo deu errado";
}
